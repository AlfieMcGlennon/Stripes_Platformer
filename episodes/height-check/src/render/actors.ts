import { worldToScreen, type CameraState } from "@stripes/engine";
import type { Particle, PlayerState } from "../world";
import { COLORS } from "./palette";
import { lookPalette, lookShirt } from "@stripes/engine";
import { drawSprite, heroFrame, SLED, SPRITE_H, SPRITE_W } from "@stripes/engine";

const VIEW_W = 320;
const VIEW_H = 180;

/**
 * The hero. Zoomed far out it becomes a bright dot with a bobbing arrow,
 * because "you are here" must stay visible.
 */
export function drawPlayer(
  ctx: CanvasRenderingContext2D, p: PlayerState, cam: CameraState, time: number,
  opts: { highlight?: boolean; sled?: boolean } = {},
): void {
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
  drawSprite(ctx, frame, x, Math.round(s.sy) - SPRITE_H - lift,
    { flip: p.facing === -1, palette: lookPalette(), shirt: lookShirt() });
  if (opts.sled) drawSprite(ctx, SLED, x - 1, Math.round(s.sy) - 4, { flip: p.facing === -1 });
}

export function drawParticles(ctx: CanvasRenderingContext2D, list: Particle[], cam: CameraState): void {
  for (const p of list) {
    const s = worldToScreen(cam, p.x, p.y, VIEW_W, VIEW_H);
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(s.sx), Math.round(s.sy), p.size, p.size);
  }
  ctx.globalAlpha = 1;
}
