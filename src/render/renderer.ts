import { worldToScreen, type CameraState } from "../core/camera";
import { PLAYER_HALF_WIDTH, PLAYER_HEIGHT, type PlayerState, type Terrain } from "../world";
import { COLORS } from "./palette";

export const VIEW_W = 320;
export const VIEW_H = 180;

type Align = "left" | "center" | "right";

interface QueuedText {
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  align: Align;
}

/**
 * Two layers: a 320x180 pixel canvas scaled up with no smoothing (the retro
 * look), and text drawn afterwards at display resolution so it stays readable.
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

  constructor(private canvas: HTMLCanvasElement) {
    this.pixelCanvas = document.createElement("canvas");
    this.pixelCanvas.width = VIEW_W;
    this.pixelCanvas.height = VIEW_H;
    this.px = this.pixelCanvas.getContext("2d")!;
    this.display = canvas.getContext("2d")!;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth * dpr;
    const h = window.innerHeight * dpr;
    this.canvas.width = w;
    this.canvas.height = h;
    // Integer scaling keeps pixels square; fall back to fractional on tiny screens.
    const fit = Math.min(w / VIEW_W, h / VIEW_H);
    this.scale = fit >= 1 ? Math.floor(fit) : fit;
    this.offsetX = Math.floor((w - VIEW_W * this.scale) / 2);
    this.offsetY = Math.floor((h - VIEW_H * this.scale) / 2);
  }

  /** Convert a browser client coordinate into view (320x180) coordinates. */
  clientToView(clientX: number, clientY: number): { x: number; y: number } {
    const dpr = window.devicePixelRatio || 1;
    return { x: (clientX * dpr - this.offsetX) / this.scale, y: (clientY * dpr - this.offsetY) / this.scale };
  }

  clear(color = COLORS.sky): void {
    this.px.fillStyle = color;
    this.px.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  /** Queue text in view coordinates; size is in view pixels. */
  text(text: string, x: number, y: number, opts: { size?: number; color?: string; align?: Align } = {}): void {
    this.texts.push({ text, x, y, size: opts.size ?? 7, color: opts.color ?? COLORS.text, align: opts.align ?? "left" });
  }

  /** Caption box along the bottom of the screen; `prompt` adds a blinking continue hint. */
  caption(lines: string[], prompt = false, time = 0): void {
    if (lines.length === 0) return;
    const lineH = 10;
    const h = lines.length * lineH + 8;
    const y = VIEW_H - h - 4;
    this.px.fillStyle = "rgba(5,8,18,0.82)";
    this.px.fillRect(8, y, VIEW_W - 16, h);
    lines.forEach((line, i) => this.text(line, VIEW_W / 2, y + 7 + i * lineH, { align: "center" }));
    if (prompt && Math.floor(time * 2) % 2 === 0) {
      this.text("▶", VIEW_W - 16, y + h - 9, { color: COLORS.accent, align: "right" });
    }
  }

  /**
   * Draw a heightfield. `fill(i)` colours each cell's column below the ground
   * line; linear terrain is drawn as a filled polygon in one colour.
   */
  terrain(t: Terrain, cam: CameraState, fill: (i: number) => string, edge = COLORS.groundEdge): void {
    const ctx = this.px;
    if (t.mode === "steps") {
      for (let i = 0; i < t.groundY.length; i++) {
        const a = worldToScreen(cam, t.x0 + i * t.cellWidth, t.groundY[i], VIEW_W, VIEW_H);
        const b = worldToScreen(cam, t.x0 + (i + 1) * t.cellWidth, t.groundY[i], VIEW_W, VIEW_H);
        if (b.sx < 0 || a.sx > VIEW_W) continue;
        // Round edges outward so neighbouring cells never leave hairline gaps when zoomed out.
        const x0 = Math.floor(a.sx);
        const w = Math.max(1, Math.ceil(b.sx) - x0);
        const top = Math.round(a.sy);
        ctx.fillStyle = fill(i);
        ctx.fillRect(x0, top, w, VIEW_H - top);
        ctx.fillStyle = edge;
        ctx.fillRect(x0, top, w, 1);
      }
      return;
    }
    ctx.beginPath();
    let first = true;
    for (let i = 0; i < t.groundY.length; i++) {
      const p = worldToScreen(cam, t.x0 + i * t.cellWidth, t.groundY[i], VIEW_W, VIEW_H);
      if (first) ctx.moveTo(p.sx, p.sy);
      else ctx.lineTo(p.sx, p.sy);
      first = false;
    }
    const end = worldToScreen(cam, t.x0 + (t.groundY.length - 1) * t.cellWidth, 0, VIEW_W, VIEW_H);
    const start = worldToScreen(cam, t.x0, 0, VIEW_W, VIEW_H);
    ctx.lineTo(end.sx, VIEW_H + 1);
    ctx.lineTo(start.sx, VIEW_H + 1);
    ctx.closePath();
    ctx.fillStyle = fill(0);
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /**
   * The player sprite. When the camera is zoomed far out it is drawn at a
   * minimum size with a marker, because "you are here" must stay visible.
   */
  player(p: PlayerState, cam: CameraState, time: number, highlight = false): void {
    const ctx = this.px;
    const s = worldToScreen(cam, p.x, p.y, VIEW_W, VIEW_H);
    const k = Math.max(0.5, Math.min(1, cam.zoomX));
    const w = Math.max(3, Math.round(PLAYER_HALF_WIDTH * 2 * k));
    const h = Math.max(5, Math.round(PLAYER_HEIGHT * k));
    const x = Math.round(s.sx - w / 2);
    const y = Math.round(s.sy - h);
    if (highlight) {
      const bob = Math.round(Math.sin(time * 5) * 2);
      ctx.fillStyle = COLORS.accent;
      ctx.fillRect(x + Math.floor(w / 2) - 1, y - 10 + bob, 3, 5);
      ctx.fillRect(x + Math.floor(w / 2) - 2, y - 6 + bob, 5, 1);
    }
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = COLORS.accent;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#ef8354";
    ctx.fillRect(x, y + Math.floor(h * 0.55), w, Math.max(1, Math.floor(h * 0.2)));
    if (h >= 8) {
      ctx.fillStyle = "#1a1a2e";
      const eyeX = p.facing === 1 ? x + w - 3 : x + 1;
      ctx.fillRect(eyeX, y + 3, 2, 2);
    }
  }

  present(): void {
    const d = this.display;
    d.imageSmoothingEnabled = false;
    d.fillStyle = "#000";
    d.fillRect(0, 0, this.canvas.width, this.canvas.height);
    d.drawImage(this.pixelCanvas, this.offsetX, this.offsetY, VIEW_W * this.scale, VIEW_H * this.scale);
    for (const t of this.texts) {
      d.font = `${Math.round(t.size * this.scale)}px "Courier New", ui-monospace, monospace`;
      d.textAlign = t.align;
      d.textBaseline = "top";
      d.fillStyle = "rgba(0,0,0,0.6)";
      const x = this.offsetX + t.x * this.scale;
      const y = this.offsetY + t.y * this.scale;
      d.fillText(t.text, x + Math.max(1, this.scale / 2), y + Math.max(1, this.scale / 2));
      d.fillStyle = t.color;
      d.fillText(t.text, x, y);
    }
    this.texts = [];
  }
}
