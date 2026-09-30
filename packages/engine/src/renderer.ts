export const BODY_FONT = '"Pixelify Sans", "Courier New", monospace';
export const TITLE_FONT = '"Silkscreen", "Courier New", monospace';

export type Align = "left" | "center" | "right";

export interface TextOptions {
  size?: number;
  color?: string;
  align?: Align;
  title?: boolean;
}

interface QueuedText {
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  align: Align;
  font: string;
}

/** Eight directions: four alone leave the diagonal edges of glyphs unprotected. */
const OUTLINE_OFFSETS: [number, number][] = [
  [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1],
];

export interface RendererOptions {
  viewW: number;
  viewH: number;
  /** Default fill for `clear()`. */
  background?: string;
  /** Outline colour drawn behind text. */
  textOutline?: string;
  /** Caption panel colours: outer shadow, border, fill. */
  caption?: { shadow: string; border: string; fill: string; text: string; prompt: string };
  /** localStorage key for the text-size preference; omit to skip persistence. */
  textScaleKey?: string;
}

const DEFAULT_CAPTION = {
  shadow: "#05060d",
  border: "#1b2140",
  fill: "#0d1126",
  text: "#f2efe6",
  prompt: "#ffd166",
};

/**
 * Two layers: a low-resolution pixel canvas scaled up with no smoothing, and text
 * drawn afterwards at display resolution in a pixel font so it stays crisp.
 * Callers draw pixels into `px` immediately and queue text; `present()` composites.
 *
 * Three details here were bug fixes in episode 1 and are the reason this is shared
 * rather than re-implemented per episode:
 *
 * - Text gets an eight-direction outline, not a drop shadow. A diagonal shadow
 *   reads as a second, misaligned copy of a digit and fills the counters of 0/6/8/9.
 * - Glyph positions are rounded. Fractional baselines blur pixel fonts.
 * - `scale` is always an integer. A fractional scale doubles arbitrary pixel
 *   columns; letterboxing looks better than that.
 *
 * Canvas text cannot respond to browser zoom, because the view is fitted to the
 * viewport and so `cssW * dpr` is invariant under page zoom. `textScale` is the
 * in-game substitute, and it is why WCAG 1.4.4 is satisfiable here at all.
 */
export class PixelRenderer {
  readonly px: CanvasRenderingContext2D;
  readonly viewW: number;
  readonly viewH: number;
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  /** User text-size multiplier: 1, 1.5 or 2. */
  textScale = 1;
  /** Space kept clear at the bottom, e.g. for on-screen touch buttons. */
  bottomReserve = 0;
  /** 0 = clear, 1 = black; used for scene transitions. */
  fade = 0;

  private display: CanvasRenderingContext2D;
  private layer: HTMLCanvasElement;
  private texts: QueuedText[] = [];
  private announced = "";
  private readonly opts: Required<Omit<RendererOptions, "textScaleKey">> & { textScaleKey?: string };

  constructor(private canvas: HTMLCanvasElement, options: RendererOptions) {
    this.viewW = options.viewW;
    this.viewH = options.viewH;
    this.opts = {
      viewW: options.viewW,
      viewH: options.viewH,
      background: options.background ?? "#0b1020",
      textOutline: options.textOutline ?? "#05060d",
      caption: options.caption ?? DEFAULT_CAPTION,
      textScaleKey: options.textScaleKey,
    };
    this.layer = document.createElement("canvas");
    this.layer.width = this.viewW;
    this.layer.height = this.viewH;
    this.px = this.layer.getContext("2d")!;
    this.display = canvas.getContext("2d")!;
    this.loadTextScale();
    this.resize();
    const onResize = (): void => this.resize();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", () => setTimeout(onResize, 200));
  }

  resize(): void {
    // Capped at 2: a 3x phone canvas costs 2.25x the fill for no visible gain.
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssW = window.visualViewport?.width ?? window.innerWidth;
    const cssH = window.visualViewport?.height ?? window.innerHeight;
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    const w = Math.round(cssW * dpr);
    const h = Math.round(cssH * dpr);
    this.canvas.width = w;
    this.canvas.height = h;
    this.scale = Math.max(1, Math.floor(Math.min(w / this.viewW, h / this.viewH)));
    this.offsetX = Math.floor((w - this.viewW * this.scale) / 2);
    this.offsetY = Math.floor((h - this.viewH * this.scale) / 2);
  }

  get portrait(): boolean {
    return this.canvas.height > this.canvas.width;
  }

  clientToView(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = this.canvas.width / rect.width;
    return {
      x: ((clientX - rect.left) * dpr - this.offsetX) / this.scale,
      y: ((clientY - rect.top) * dpr - this.offsetY) / this.scale,
    };
  }

  clear(color = this.opts.background): void {
    this.px.fillStyle = color;
    this.px.fillRect(0, 0, this.viewW, this.viewH);
  }

  rect(x: number, y: number, w: number, h: number, color: string): void {
    this.px.fillStyle = color;
    this.px.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  private fontPx(size: number): number {
    return Math.max(1, Math.round(size * this.textScale * this.scale));
  }

  /**
   * Silkscreen is a strict 8-module-per-em bitmap face, so it only renders evenly
   * at multiples of 8. Pixelify Sans has no pixel grid at all and is left alone.
   */
  private fontFor(size: number, font: string): string {
    const px = this.fontPx(size);
    return font === TITLE_FONT ? `${Math.max(8, Math.round(px / 8) * 8)}px ${font}` : `${px}px ${font}`;
  }

  /** Step the text size through 1x / 1.5x / 2x and remember the choice. */
  cycleTextScale(): number {
    this.textScale = this.textScale >= 2 ? 1 : this.textScale === 1 ? 1.5 : 2;
    const key = this.opts.textScaleKey;
    if (key) {
      try {
        localStorage.setItem(key, String(this.textScale));
      } catch {
        // Private mode or blocked storage: the setting just won't persist.
      }
    }
    return this.textScale;
  }

  private loadTextScale(): void {
    const key = this.opts.textScaleKey;
    if (!key) return;
    try {
      const v = Number(localStorage.getItem(key));
      if (v === 1 || v === 1.5 || v === 2) this.textScale = v;
    } catch {
      // Ignore: default 1x.
    }
  }

  text(text: string, x: number, y: number, opts: TextOptions = {}): void {
    this.texts.push({
      text,
      x,
      y,
      size: opts.size ?? 8,
      color: opts.color ?? this.opts.caption.text,
      align: opts.align ?? "left",
      font: opts.title ? TITLE_FONT : BODY_FONT,
    });
  }

  /** Word-wrap to a width in view px, measured in the font it will be drawn in. */
  wrap(lines: string[], maxWidth: number, size = 8): string[] {
    const d = this.display;
    d.font = this.fontFor(size, BODY_FONT);
    const limit = maxWidth * this.scale;
    const out: string[] = [];
    for (const line of lines) {
      let current = "";
      for (const word of line.split(" ")) {
        const test = current ? `${current} ${word}` : word;
        if (d.measureText(test).width > limit && current) {
          out.push(current);
          current = word;
        } else current = test;
      }
      out.push(current);
    }
    return out;
  }

  /**
   * Mirror a caption into the page's aria-live region. A canvas says nothing to a
   * screen reader, and `caption()` is the single funnel every narrative line
   * passes through, so this is the cheapest honest place to do it.
   */
  private announce(lines: string[]): void {
    const text = lines.join(" ").trim();
    if (!text || text === this.announced) return;
    this.announced = text;
    const live = typeof document === "undefined" ? null : document.getElementById("live");
    if (live) live.textContent = text;
  }

  /**
   * Caption panel along the bottom, sized to its wrapped content. `prompt` may be
   * `true` for a blinking arrow, or a string to blink instead.
   */
  caption(lines: string[], prompt: boolean | string = false, time = 0): number {
    this.announce(lines);
    if (lines.length === 0) return 0;
    const c = this.opts.caption;
    const wrapped = this.wrap(lines, this.viewW - 44);
    const lineH = 10;
    const h = wrapped.length * lineH + (typeof prompt === "string" ? 16 : 8);
    const y = this.viewH - h - 6 - this.bottomReserve;
    this.rect(10, y - 1, this.viewW - 20, h + 2, c.shadow);
    this.rect(9, y, this.viewW - 18, h, c.shadow);
    this.rect(11, y + 1, this.viewW - 22, h - 2, c.border);
    this.rect(12, y + 2, this.viewW - 24, h - 4, c.fill);
    wrapped.forEach((line, i) => this.text(line, this.viewW / 2, y + 4 + i * lineH, { align: "center" }));
    const blink = Math.floor(time * 2.5) % 2 === 0;
    if (typeof prompt === "string" && blink) {
      this.text(prompt, this.viewW - 16, y + h - 11, { size: 7, color: c.prompt, align: "right" });
    } else if (prompt === true && blink) {
      const ctx = this.px;
      ctx.fillStyle = c.prompt;
      const ax = this.viewW - 22;
      const ay = y + h - 9;
      for (let i = 0; i < 3; i++) ctx.fillRect(ax + i, ay + i, 1, 6 - i * 2);
    }
    return h;
  }

  present(): void {
    const d = this.display;
    if (this.fade > 0) {
      this.px.fillStyle = `rgba(0,0,0,${Math.min(1, this.fade)})`;
      this.px.fillRect(0, 0, this.viewW, this.viewH);
    }
    d.imageSmoothingEnabled = false;
    d.fillStyle = "#000";
    d.fillRect(0, 0, this.canvas.width, this.canvas.height);
    d.drawImage(this.layer, this.offsetX, this.offsetY, this.viewW * this.scale, this.viewH * this.scale);
    d.globalAlpha = 1 - Math.min(1, this.fade);
    for (const t of this.texts) {
      d.font = this.fontFor(t.size, t.font);
      d.textAlign = t.align;
      d.textBaseline = "top";
      const x = this.offsetX + Math.round(t.x * this.scale);
      const y = this.offsetY + Math.round(t.y * this.scale);
      const off = Math.max(1, Math.round(this.fontPx(t.size) / 16));
      d.fillStyle = this.opts.textOutline;
      for (const [dx, dy] of OUTLINE_OFFSETS) d.fillText(t.text, x + dx * off, y + dy * off);
      d.fillStyle = t.color;
      d.fillText(t.text, x, y);
    }
    d.globalAlpha = 1;
    this.texts = [];
  }
}
