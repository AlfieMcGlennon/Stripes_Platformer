import type { CameraState } from "../core/camera";
import type { Particle, PlayerState, Terrain } from "../world";
import { drawParticles, drawPlayer } from "./actors";
import { shade } from "./color";
import { COLORS } from "./palette";
import { drawLine, drawSlope, drawStepOutline, drawSteps } from "./terrainDraw";
import { drawTouchButtons } from "./touch";

export const VIEW_W = 320;
export const VIEW_H = 180;
export const BODY_FONT = '"Pixelify Sans", "Courier New", monospace';
export const TITLE_FONT = '"Silkscreen", "Courier New", monospace';

type Align = "left" | "center" | "right";

/** Eight directions: four alone leave the diagonal edges of glyphs unprotected. */
const OUTLINE: [number, number][] = [
  [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1],
];

interface QueuedText {
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  align: Align;
  font: string;
}

export interface TextOptions {
  size?: number;
  color?: string;
  align?: Align;
  title?: boolean;
}

/**
 * Two layers: a 320x180 pixel canvas scaled up with no smoothing, and text
 * drawn afterwards at display resolution (in a pixel font) so it stays crisp.
 * Scenes draw pixels immediately and queue text; `present()` composites.
 */
export class Renderer {
  readonly px: CanvasRenderingContext2D;
  private display: CanvasRenderingContext2D;
  private pixelCanvas: HTMLCanvasElement;
  private texts: QueuedText[] = [];
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  /**
   * User text-size multiplier. Canvas text can't respond to browser zoom (the
   * view is fitted to the viewport, so cssW*dpr is invariant), so low-vision
   * players need an in-game control instead. Persisted per browser.
   */
  textScale = 1;
  private announced = "";
  /** Extra space kept free at the bottom (touch buttons live there on phones). */
  bottomReserve = 0;
  /** 0 = clear, 1 = black; used for scene transitions. */
  fade = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.pixelCanvas = document.createElement("canvas");
    this.pixelCanvas.width = VIEW_W;
    this.pixelCanvas.height = VIEW_H;
    this.px = this.pixelCanvas.getContext("2d")!;
    this.display = canvas.getContext("2d")!;
    this.loadTextScale();
    this.resize();
    const onResize = () => this.resize();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", () => setTimeout(onResize, 200));
  }

  resize(): void {
    // Capped at 2: a 3x phone canvas costs 2.25x the fill for no visible gain on pixel art.
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssW = window.visualViewport?.width ?? window.innerWidth;
    const cssH = window.visualViewport?.height ?? window.innerHeight;
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    const w = Math.round(cssW * dpr);
    const h = Math.round(cssH * dpr);
    this.canvas.width = w;
    this.canvas.height = h;
    // Always integer: a fractional scale doubles arbitrary pixel columns and
    // lands glyphs on sub-pixel boundaries, which blurs numbers. Letterbox instead.
    const fit = Math.min(w / VIEW_W, h / VIEW_H);
    this.scale = Math.max(1, Math.floor(fit));
    this.offsetX = Math.floor((w - VIEW_W * this.scale) / 2);
    this.offsetY = Math.floor((h - VIEW_H * this.scale) / 2);
  }

  get portrait(): boolean {
    return this.canvas.height > this.canvas.width;
  }

  clientToView(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = this.canvas.width / rect.width;
    return { x: ((clientX - rect.left) * dpr - this.offsetX) / this.scale, y: ((clientY - rect.top) * dpr - this.offsetY) / this.scale };
  }

  clear(color = COLORS.sky): void {
    this.px.fillStyle = color;
    this.px.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  /**
   * Rendered font size in device px. Silkscreen is a strict 8-module-per-em
   * bitmap face, so it only looks right at multiples of 8; Pixelify Sans has no
   * pixel grid and is left alone.
   */
  private fontPx(size: number): number {
    return Math.max(1, Math.round(size * this.textScale * this.scale));
  }

  private fontFor(size: number, font: string): string {
    const px = this.fontPx(size);
    return font === TITLE_FONT ? `${Math.max(8, Math.round(px / 8) * 8)}px ${font}` : `${px}px ${font}`;
  }

  /** Step the text size through 1x / 1.5x / 2x and remember the choice. */
  cycleTextScale(): number {
    this.textScale = this.textScale >= 2 ? 1 : this.textScale === 1 ? 1.5 : 2;
    try {
      localStorage.setItem("heightcheck.textScale", String(this.textScale));
    } catch {
      // Private mode or blocked storage: the setting just won't persist.
    }
    return this.textScale;
  }

  private loadTextScale(): void {
    try {
      const v = Number(localStorage.getItem("heightcheck.textScale"));
      if (v === 1 || v === 1.5 || v === 2) this.textScale = v;
    } catch {
      // Ignore: default 1x.
    }
  }

  text(text: string, x: number, y: number, opts: TextOptions = {}): void {
    this.texts.push({
      text, x, y, size: opts.size ?? 8, color: opts.color ?? COLORS.text, align: opts.align ?? "left",
      font: opts.title ? TITLE_FONT : BODY_FONT,
    });
  }

  /** Word-wrap to a width in view px, measured with the real font. */
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
   * screen reader, and `caption()` is the single funnel every narrative line in
   * the game passes through, so this is the cheapest honest place to do it.
   */
  private announce(lines: string[]): void {
    const text = lines.join(" ").trim();
    if (!text || text === this.announced) return;
    this.announced = text;
    const live = typeof document === "undefined" ? null : document.getElementById("live");
    if (live) live.textContent = text;
  }

  /** Caption panel along the bottom; `prompt` adds a blinking continue arrow. */
  caption(lines: string[], prompt = false, time = 0): void {
    this.announce(lines);
    if (lines.length === 0) return;
    const wrapped = this.wrap(lines, VIEW_W - 44);
    const lineH = 10;
    const h = wrapped.length * lineH + 8;
    const y = VIEW_H - h - 6 - this.bottomReserve;
    const ctx = this.px;
    ctx.fillStyle = "#05060d";
    ctx.fillRect(10, y - 1, VIEW_W - 20, h + 2);
    ctx.fillRect(9, y, VIEW_W - 18, h);
    ctx.fillStyle = "#1b2140";
    ctx.fillRect(11, y + 1, VIEW_W - 22, h - 2);
    ctx.fillStyle = "#0d1126";
    ctx.fillRect(12, y + 2, VIEW_W - 24, h - 4);
    wrapped.forEach((line, i) => this.text(line, VIEW_W / 2, y + 4 + i * lineH, { align: "center" }));
    if (prompt && Math.floor(time * 2.5) % 2 === 0) {
      ctx.fillStyle = COLORS.accent;
      const ax = VIEW_W - 22;
      const ay = y + h - 9;
      for (let i = 0; i < 3; i++) ctx.fillRect(ax + i, ay + i, 1, 6 - i * 2);
    }
  }

  steps(t: Terrain, cam: CameraState, fill: (i: number) => string, opts: { edge?: string; alpha?: (i: number) => number } = {}): void {
    drawSteps(this.px, t, cam, fill, opts);
  }

  slope(t: Terrain, cam: CameraState, colorAt: (worldX: number) => string, edgeAt?: (worldX: number) => string): void {
    drawSlope(this.px, t, cam, colorAt, edgeAt);
  }

  stepOutline(t: Terrain, cam: CameraState, color: string): void {
    drawStepOutline(this.px, t, cam, color);
  }

  player(p: PlayerState, cam: CameraState, time: number, opts: { highlight?: boolean; sled?: boolean } = {}): void {
    drawPlayer(this.px, p, cam, time, opts);
  }

  line(x0: number, y0: number, x1: number, y1: number, color: string, thickness = 1, outlined = true): void {
    drawLine(this.px, x0, y0, x1, y1, color, thickness, outlined);
  }

  particles(list: Particle[], cam: CameraState): void {
    drawParticles(this.px, list, cam);
  }

  touchButtons(showZoom: boolean): void {
    drawTouchButtons(this.px, showZoom);
  }

  present(): void {
    const d = this.display;
    if (this.fade > 0) {
      this.px.fillStyle = `rgba(0,0,0,${Math.min(1, this.fade)})`;
      this.px.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    d.imageSmoothingEnabled = false;
    d.fillStyle = "#000";
    d.fillRect(0, 0, this.canvas.width, this.canvas.height);
    d.drawImage(this.pixelCanvas, this.offsetX, this.offsetY, VIEW_W * this.scale, VIEW_H * this.scale);
    d.globalAlpha = 1 - Math.min(1, this.fade);
    for (const t of this.texts) {
      d.font = this.fontFor(t.size, t.font);
      d.textAlign = t.align;
      d.textBaseline = "top";
      // Rounded: fractional baselines blur pixel-font digits.
      const x = this.offsetX + Math.round(t.x * this.scale);
      const y = this.offsetY + Math.round(t.y * this.scale);
      // An outline, not a drop shadow. A diagonal shadow reads as a second,
      // misaligned copy of a digit and fills the counters of 0/6/8/9; an outline
      // also guarantees contrast over light stripes, which a shadow does not.
      const off = Math.max(1, Math.round(this.fontPx(t.size) / 16));
      d.fillStyle = "#05060d";
      for (const [dx, dy] of OUTLINE) d.fillText(t.text, x + dx * off, y + dy * off);
      d.fillStyle = t.color;
      d.fillText(t.text, x, y);
    }
    d.globalAlpha = 1;
    this.texts = [];
  }
}

export { shade };
