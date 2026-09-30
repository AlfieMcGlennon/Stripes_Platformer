import { worldToScreen, type CameraState } from "../core/camera";
import { TOUCH_BUTTONS } from "../core/layout";
import { groundAt, type Particle, type PlayerState, type Terrain } from "../world";
import { ditherPattern, hexToRgb, rgbString } from "./backdrop";
import { COLORS } from "./palette";
import { drawSprite, heroFrame, SLED, SPRITE_H, SPRITE_W } from "./sprites";

export const VIEW_W = 320;
export const VIEW_H = 180;
export const BODY_FONT = '"Pixelify Sans", "Courier New", monospace';
export const TITLE_FONT = '"Silkscreen", "Courier New", monospace';

type Align = "left" | "center" | "right";

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
    this.resize();
    const onResize = () => this.resize();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", () => setTimeout(onResize, 200));
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const cssW = window.visualViewport?.width ?? window.innerWidth;
    const cssH = window.visualViewport?.height ?? window.innerHeight;
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    const w = Math.round(cssW * dpr);
    const h = Math.round(cssH * dpr);
    this.canvas.width = w;
    this.canvas.height = h;
    // Integer scaling keeps pixels square; fall back to fractional on small screens.
    const fit = Math.min(w / VIEW_W, h / VIEW_H);
    this.scale = fit >= 2 ? Math.floor(fit) : fit;
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

  text(text: string, x: number, y: number, opts: TextOptions = {}): void {
    this.texts.push({
      text, x, y, size: opts.size ?? 8, color: opts.color ?? COLORS.text, align: opts.align ?? "left",
      font: opts.title ? TITLE_FONT : BODY_FONT,
    });
  }

  /** Word-wrap to a width in view px, measured with the real font. */
  wrap(lines: string[], maxWidth: number, size = 8): string[] {
    const d = this.display;
    d.font = `${Math.round(size * this.scale)}px ${BODY_FONT}`;
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

  /** Caption panel along the bottom; `prompt` adds a blinking continue arrow. */
  caption(lines: string[], prompt = false, time = 0): void {
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

  /**
   * Stepped terrain: base colour, dithered interior, lit top edge and shaded
   * sides where a neighbour is taller.
   */
  steps(t: Terrain, cam: CameraState, fill: (i: number) => string, opts: { edge?: string; alpha?: (i: number) => number } = {}): void {
    const ctx = this.px;
    const pattern = ditherPattern(ctx);
    for (let i = 0; i < t.groundY.length; i++) {
      const a = worldToScreen(cam, t.x0 + i * t.cellWidth, t.groundY[i], VIEW_W, VIEW_H);
      const b = worldToScreen(cam, t.x0 + (i + 1) * t.cellWidth, t.groundY[i], VIEW_W, VIEW_H);
      if (b.sx < 0 || a.sx > VIEW_W) continue;
      const alpha = opts.alpha ? opts.alpha(i) : 1;
      if (alpha <= 0.01) continue;
      ctx.globalAlpha = alpha;
      const x0 = Math.floor(a.sx);
      const w = Math.max(1, Math.ceil(b.sx) - x0);
      const top = Math.round(a.sy);
      const base = fill(i);
      ctx.fillStyle = base;
      ctx.fillRect(x0, top, w, VIEW_H - top);
      if (w >= 4) {
        ctx.fillStyle = pattern;
        ctx.fillRect(x0, top + 3, w, VIEW_H - top - 3);
        ctx.fillStyle = shade(base, 1.25);
        ctx.fillRect(x0, top + 1, w, 2);
        const leftTaller = i > 0 && t.groundY[i - 1] < t.groundY[i];
        if (leftTaller) {
          ctx.fillStyle = shade(base, 0.7);
          ctx.fillRect(x0, top, 1, VIEW_H - top);
        }
      }
      ctx.fillStyle = opts.edge ?? shade(base, 1.6);
      ctx.fillRect(x0, top, w, 1);
    }
    ctx.globalAlpha = 1;
  }

  /** Smooth terrain filled column by column with a colour chosen per world x. */
  slope(t: Terrain, cam: CameraState, colorAt: (worldX: number) => string, edgeAt: (worldX: number) => string = () => "rgba(255,255,255,0.85)"): void {
    const ctx = this.px;
    const pattern = ditherPattern(ctx);
    for (let sx = 0; sx < VIEW_W; sx++) {
      const wx = (sx + 0.5 - VIEW_W / 2) / cam.zoomX + cam.cx;
      if (wx < t.x0 || wx > t.x0 + (t.groundY.length - 1) * t.cellWidth) continue;
      const sy = Math.round(worldToScreen(cam, wx, groundAt(t, wx), VIEW_W, VIEW_H).sy);
      const base = colorAt(wx);
      ctx.fillStyle = base;
      ctx.fillRect(sx, sy, 1, VIEW_H - sy);
      ctx.fillStyle = pattern;
      ctx.fillRect(sx, sy + 3, 1, VIEW_H - sy - 3);
      ctx.fillStyle = shade(base, 1.3);
      ctx.fillRect(sx, sy + 1, 1, 2);
      ctx.fillStyle = edgeAt(wx);
      ctx.fillRect(sx, sy, 1, 1);
    }
  }

  /** Continuous outline along a stepped terrain's top, risers included. */
  stepOutline(t: Terrain, cam: CameraState, color: string): void {
    let prev: { x: number; y: number } | null = null;
    for (let i = 0; i < t.groundY.length; i++) {
      const a = worldToScreen(cam, t.x0 + i * t.cellWidth, t.groundY[i], VIEW_W, VIEW_H);
      const b = worldToScreen(cam, t.x0 + (i + 1) * t.cellWidth, t.groundY[i], VIEW_W, VIEW_H);
      if (prev) this.line(prev.x, prev.y, a.sx, a.sy, color, 1, false);
      this.line(a.sx, a.sy, b.sx, b.sy, color, 1, false);
      prev = { x: b.sx, y: b.sy };
    }
  }

  /**
   * The hero. Zoomed far out it becomes a bright dot with a bobbing arrow,
   * because "you are here" must stay visible.
   */
  player(p: PlayerState, cam: CameraState, time: number, opts: { highlight?: boolean; sled?: boolean } = {}): void {
    const ctx = this.px;
    const s = worldToScreen(cam, p.x, p.y, VIEW_W, VIEW_H);
    const small = cam.zoomX < 0.6;
    if (opts.highlight || small) {
      const bob = Math.round(Math.sin(time * 5) * 2);
      const top = Math.round(s.sy) - (small ? 12 : SPRITE_H + 10) + bob;
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(Math.round(s.sx) - 3, top - 1, 7, 7);
      ctx.fillStyle = COLORS.accent;
      ctx.fillRect(Math.round(s.sx) - 1, top, 3, 3);
      ctx.fillRect(Math.round(s.sx) - 2, top + 3, 5, 1);
      ctx.fillRect(Math.round(s.sx) - 1, top + 4, 3, 1);
      ctx.fillRect(Math.round(s.sx), top + 5, 1, 1);
    }
    if (small) {
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(Math.round(s.sx) - 2, Math.round(s.sy) - 4, 5, 5);
      ctx.fillStyle = COLORS.accent;
      ctx.fillRect(Math.round(s.sx) - 1, Math.round(s.sy) - 3, 3, 3);
      return;
    }
    const moving = Math.abs(p.vx) > 1;
    const frame = heroFrame(p.grounded || !!opts.sled, moving && !opts.sled, p.stride);
    const x = Math.round(s.sx - SPRITE_W / 2);
    const lift = opts.sled ? 3 : 0;
    drawSprite(ctx, frame, x, Math.round(s.sy) - SPRITE_H - lift, p.facing === -1);
    if (opts.sled) drawSprite(ctx, SLED, x - 1, Math.round(s.sy) - 4, p.facing === -1);
  }

  /** Pixel line (Bresenham) with an outline so it reads on any background. */
  line(x0: number, y0: number, x1: number, y1: number, color: string, thickness = 1, outlined = true): void {
    const ctx = this.px;
    const plot = (fill: string, grow: number) => {
      let x = Math.round(x0), y = Math.round(y0);
      const tx = Math.round(x1), ty = Math.round(y1);
      const dx = Math.abs(tx - x), dy = -Math.abs(ty - y);
      const sx = x < tx ? 1 : -1, sy = y < ty ? 1 : -1;
      let err = dx + dy;
      ctx.fillStyle = fill;
      for (let guard = 0; guard < 4000; guard++) {
        ctx.fillRect(x - grow, y - grow, thickness + grow * 2, thickness + grow * 2);
        if (x === tx && y === ty) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x += sx; }
        if (e2 <= dx) { err += dx; y += sy; }
      }
    };
    if (outlined) plot("#05060d", 1);
    plot(color, 0);
  }

  particles(list: Particle[], cam: CameraState): void {
    for (const p of list) {
      const s = worldToScreen(cam, p.x, p.y, VIEW_W, VIEW_H);
      this.px.globalAlpha = Math.max(0, p.life / p.maxLife);
      this.px.fillStyle = p.color;
      this.px.fillRect(Math.round(s.sx), Math.round(s.sy), p.size, p.size);
    }
    this.px.globalAlpha = 1;
  }

  touchButtons(showZoom: boolean): void {
    for (const b of TOUCH_BUTTONS) {
      if (b.id === "zoom" && !showZoom) continue;
      this.px.fillStyle = b.id === "zoom" ? "rgba(255,209,102,0.25)" : "rgba(255,255,255,0.1)";
      this.px.fillRect(b.x, b.y, b.w, b.h);
      this.text(b.label, b.x + b.w / 2, b.y + b.h / 2 - 5, { align: "center", color: COLORS.dim, size: 10 });
    }
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
      d.font = `${Math.round(t.size * this.scale)}px ${t.font}`;
      d.textAlign = t.align;
      d.textBaseline = "top";
      const x = this.offsetX + t.x * this.scale;
      const y = this.offsetY + t.y * this.scale;
      const off = Math.max(1, Math.round(this.scale * 0.6));
      d.fillStyle = "rgba(0,0,0,0.75)";
      d.fillText(t.text, x + off, y + off);
      d.fillStyle = t.color;
      d.fillText(t.text, x, y);
    }
    d.globalAlpha = 1;
    this.texts = [];
  }
}

/** Multiply an rgb/hex colour's brightness. */
export function shade(color: string, k: number): string {
  const rgb = color.startsWith("#") ? hexToRgb(color) : (color.match(/\d+/g) ?? ["0", "0", "0"]).slice(0, 3).map(Number) as [number, number, number];
  return rgbString([Math.min(255, rgb[0] * k), Math.min(255, rgb[1] * k), Math.min(255, rgb[2] * k)]);
}
