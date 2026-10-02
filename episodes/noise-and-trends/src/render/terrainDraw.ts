import { worldToScreen, type CameraState } from "@stripes/engine";
import { groundAt, type Terrain } from "../world";
import { ditherPattern } from "./backdrop";
import { shade } from "@stripes/engine";

/** Terrain and line drawing on the 320x180 pixel layer. */
import { VIEW_H, VIEW_W } from "./renderer";

/**
 * Stepped terrain: base colour, dithered interior, lit top edge and shaded
 * sides where a neighbour is taller.
 */
export function drawSteps(
  ctx: CanvasRenderingContext2D, t: Terrain, cam: CameraState, fill: (i: number) => string,
  opts: { edge?: string; alpha?: (i: number) => number } = {},
): void {
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
export function drawSlope(
  ctx: CanvasRenderingContext2D, t: Terrain, cam: CameraState, colorAt: (worldX: number) => string,
  edgeAt: (worldX: number) => string = () => "rgba(255,255,255,0.85)",
): void {
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

/** Continuous outline along a stepped terrain's top, risers included; off-screen cells are skipped. */
export function drawStepOutline(ctx: CanvasRenderingContext2D, t: Terrain, cam: CameraState, color: string): void {
  let prev: { x: number; y: number } | null = null;
  for (let i = 0; i < t.groundY.length; i++) {
    const a = worldToScreen(cam, t.x0 + i * t.cellWidth, t.groundY[i], VIEW_W, VIEW_H);
    const b = worldToScreen(cam, t.x0 + (i + 1) * t.cellWidth, t.groundY[i], VIEW_W, VIEW_H);
    if (b.sx >= -2 && a.sx <= VIEW_W + 2) {
      if (prev) drawLine(ctx, prev.x, prev.y, a.sx, a.sy, color, 1, false);
      drawLine(ctx, a.sx, a.sy, b.sx, b.sy, color, 1, false);
    }
    prev = { x: b.sx, y: b.sy };
  }
}

/** Pixel line (Bresenham) with an outline so it reads on any background. */
export function drawLine(
  ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string, thickness = 1, outlined = true,
): void {
  // Skip lines entirely off one side of the view.
  if ((x0 < -4 && x1 < -4) || (x0 > VIEW_W + 4 && x1 > VIEW_W + 4) || (y0 < -4 && y1 < -4) || (y0 > VIEW_H + 4 && y1 > VIEW_H + 4)) return;
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
