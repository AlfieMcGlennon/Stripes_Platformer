export const BODY_FONT = '"Pixelify Sans", "Courier New", monospace';
/*
 * Jersey 10, not Silkscreen. Silkscreen's digits were the one recurring legibility
 * complaint across every round of feedback -- its 5 and its Z read as each other's
 * neighbours at small sizes, and the numbers are the whole point of a series about
 * measurements. Jersey 10 keeps the pixel look with open, distinguishable digits.
 *
 * NO ARROWS, in either face. Parsing the cmaps of both woffs: U+2190, U+2192, U+2191
 * and U+2193 are absent from Jersey 10 AND from Pixelify Sans, so an arrow in any
 * string silently falls back to Courier New -- a different weight and baseline
 * spliced into a pixel line. The episodes use guillemets for left and right, which
 * both faces carry, and spell out up and down. Both faces do have the degree sign,
 * the middle dot, the proper minus, the dashes and the multiplication sign.
 *
 * The fontsource CSS `unicode-range` is Google's subset declaration, not a coverage
 * list, so it cannot be used to answer this question. Parse the font.
 */
export const TITLE_FONT = '"Jersey 10", "Courier New", monospace';
/** Jersey 10 is designed on a ten-pixel grid, as its name says. */
const TITLE_MODULE = 10;
/*
 * Numbers go in the TITLE face, not the body face. Rendering both at the size the
 * HUD uses settles it: Pixelify Sans closes the bowl of its 5 so "2025" reads as
 * "2029" and "1850" as "1830", which is the misread that kept being reported.
 * Jersey 10's 5 is open and unambiguous. The body face still carries numbers inside
 * prose, where the surrounding words disambiguate them.
 */

export type Align = "left" | "center" | "right";

export interface TextOptions {
  size?: number;
  color?: string;
  align?: Align;
  title?: boolean;
  /**
   * Follow the reader's text-size setting. Opt-in, and meant for prose: a caption,
   * a credit line, anything someone sits and reads. HUD readouts stay fixed because
   * they are positioned against a layout that cannot reflow, and growing them by
   * two pushes labels off the view.
   */
  grow?: boolean;
}

interface QueuedText {
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  align: Align;
  font: string;
  grow: boolean;
}

/** Eight directions: four alone leave the diagonal edges of glyphs unprotected. */
const OUTLINE_OFFSETS: [number, number][] = [
  [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1],
];

export interface RendererOptions {
  viewW: number;
  viewH: number;
  /**
   * Text and caption metrics are authored against a 180px-tall view, the height
   * episode 1 established. An episode at a different resolution passes the ratio
   * so its narrative text ends up the same physical size on screen; the default
   * derives it, so a new episode gets it right without thinking about it.
   */
  textUnit?: number;
}

/**
 * Series chrome. These were options once and every caller passed exactly these
 * values, so they are constants now: an option nobody varies is not
 * configurability, it is an unexercised code path.
 */
const CHROME = {
  background: "#0b1020",
  outline: "#05060d",
  shadow: "#05060d",
  border: "#1b2140",
  fill: "#0d1126",
  text: "#f2efe6",
  prompt: "#ffd166",
};

/** One key per preference, shared across episodes so a choice carries over. */
const KEYS = { textScale: "stripes.textScale", legacyTextScale: "heightcheck.textScale" };

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
  /** View pixels per authored text pixel; 1 at episode 1's 320x180. */
  private readonly unit: number;

  constructor(private canvas: HTMLCanvasElement, options: RendererOptions) {
    this.viewW = options.viewW;
    this.viewH = options.viewH;
    this.unit = options.textUnit ?? this.viewH / 180;
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

  clear(color = CHROME.background): void {
    this.px.fillStyle = color;
    this.px.fillRect(0, 0, this.viewW, this.viewH);
  }

  rect(x: number, y: number, w: number, h: number, color: string): void {
    this.px.fillStyle = color;
    this.px.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  private fontPx(size: number, grow = false): number {
    return Math.max(1, Math.round(size * (grow ? this.textScale : 1) * this.scale));
  }

  /** Authored text size to this view's size. */
  private scaled(size: number): number {
    return Math.max(1, Math.round(size * this.unit));
  }

  /**
   * The title face is a bitmap design on a fixed pixel grid, so it only renders
   * evenly at multiples of its module. Pixelify Sans has no pixel grid at all and is
   * left alone.
   */
  private fontFor(size: number, font: string, grow = false): string {
    const px = this.fontPx(size, grow);
    if (font !== TITLE_FONT) return `${px}px ${font}`;
    const snapped = Math.max(TITLE_MODULE, Math.round(px / TITLE_MODULE) * TITLE_MODULE);
    return `${snapped}px ${font}`;
  }

  /** Step the text size through 1x / 1.5x / 2x and remember the choice. */
  cycleTextScale(): number {
    this.textScale = this.textScale >= 2 ? 1 : this.textScale === 1 ? 1.5 : 2;
    try {
      localStorage.setItem(KEYS.textScale, String(this.textScale));
    } catch {
      // Private mode or blocked storage: the setting just won't persist.
    }
    return this.textScale;
  }

  private loadTextScale(): void {
    try {
      const raw = localStorage.getItem(KEYS.textScale) ?? localStorage.getItem(KEYS.legacyTextScale);
      const v = Number(raw);
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
      color: opts.color ?? CHROME.text,
      align: opts.align ?? "left",
      font: opts.title ? TITLE_FONT : BODY_FONT,
      grow: opts.grow ?? false,
    });
  }

  /** Word-wrap to a width in view px, measured in the font it will be drawn in. */
  wrap(lines: string[], maxWidth: number, size = 8, grow = false): string[] {
    const d = this.display;
    d.font = this.fontFor(size, BODY_FONT, grow);
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
  /**
   * Lay the caption out at a given text size, so the caller can try a few.
   *
   * Wrapping, line height and plate height all have to agree about the size, which
   * is why they are computed together rather than read from `textScale` separately.
   */
  private captionLayout(
    lines: string[], prompt: boolean | string, ts: number,
  ): { wrapped: string[]; lineH: number; h: number; size: number } {
    const size = this.scaled(8) * ts;
    const limit = (this.viewW - this.scaled(44)) * this.scale;
    const d = this.display;
    d.font = this.fontFor(size, BODY_FONT);
    /*
     * Reflow rather than re-break. Authored line breaks are tuned to the landscape
     * view; in a narrower view, or at a larger text size, each one sheds its tail
     * onto a line of its own and the caption reads as a sentence plus a half line.
     * When any authored line no longer fits, the whole caption is broken afresh.
     */
    const fits = lines.every((l) => d.measureText(l).width <= limit);
    const wrapped: string[] = [];
    for (const line of fits ? lines : [lines.join(" ")]) {
      let cur = "";
      for (const word of line.split(" ")) {
        const test = cur ? `${cur} ${word}` : word;
        if (d.measureText(test).width > limit && cur) {
          wrapped.push(cur);
          cur = word;
        } else cur = test;
      }
      wrapped.push(cur);
    }
    const lineH = Math.max(1, Math.round(this.scaled(10) * ts));
    const tail = Math.round((typeof prompt === "string" ? this.scaled(16) : this.scaled(8)) * ts);
    return { wrapped, lineH, h: wrapped.length * lineH + tail, size };
  }

  caption(lines: string[], prompt: boolean | string = false, time = 0): number {
    this.announce(lines);
    if (lines.length === 0) return 0;

    /*
     * The reader's text size, reduced if the caption would otherwise swallow the
     * scene it is describing. Doubling the text in a 180-tall view turns a five-line
     * caption into two thirds of the screen, covering the very thing being explained
     * -- so the plate is held to 55% of the usable height and the size steps down
     * until it fits. A taller view keeps the full setting.
     */
    const maxH = (this.viewH - this.bottomReserve) * 0.55;
    const steps = [this.textScale, 1.5, 1].filter((t) => t <= this.textScale);
    let layout = this.captionLayout(lines, prompt, steps[steps.length - 1]);
    for (const ts of steps) {
      const candidate = this.captionLayout(lines, prompt, ts);
      if (candidate.h <= maxH) {
        layout = candidate;
        break;
      }
    }
    const { wrapped, lineH, h, size } = layout;

    const pad = this.scaled(4);
    const y = this.viewH - h - this.scaled(6) - this.bottomReserve;
    const inset = this.scaled(9);
    this.rect(inset + 1, y - 1, this.viewW - inset * 2 - 2, h + 2, CHROME.shadow);
    this.rect(inset, y, this.viewW - inset * 2, h, CHROME.shadow);
    this.rect(inset + 2, y + 1, this.viewW - inset * 2 - 4, h - 2, CHROME.border);
    this.rect(inset + 3, y + 2, this.viewW - inset * 2 - 6, h - 4, CHROME.fill);
    wrapped.forEach((line, i) =>
      this.text(line, this.viewW / 2, y + pad + i * lineH, { align: "center", size }));
    const blink = Math.floor(time * 2.5) % 2 === 0;
    if (typeof prompt === "string" && blink) {
      this.text(prompt, this.viewW - this.scaled(16), y + h - Math.round(this.scaled(11) * (size / this.scaled(8))),
        { size: this.scaled(7) * (size / this.scaled(8)), color: CHROME.prompt, align: "right" });
    } else if (prompt === true && blink) {
      const ctx = this.px;
      ctx.fillStyle = CHROME.prompt;
      const ax = this.viewW - this.scaled(22);
      const ay = y + h - this.scaled(9);
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
      d.font = this.fontFor(t.size, t.font, t.grow);
      d.textAlign = t.align;
      d.textBaseline = "top";
      const x = this.offsetX + Math.round(t.x * this.scale);
      const y = this.offsetY + Math.round(t.y * this.scale);
      const off = Math.max(1, Math.round(this.fontPx(t.size, t.grow) / 16));
      d.fillStyle = CHROME.outline;
      for (const [dx, dy] of OUTLINE_OFFSETS) d.fillText(t.text, x + dx * off, y + dy * off);
      d.fillStyle = t.color;
      d.fillText(t.text, x, y);
    }
    d.globalAlpha = 1;
    this.texts = [];
  }
}
