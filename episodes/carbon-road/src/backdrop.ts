import { ditherPattern, ditheredSky, drawRidge, drawStars, prewarmTheme, type Theme } from "@stripes/engine";

export type { Theme } from "@stripes/engine";
import { VIEW_H, VIEW_W } from "./render";

/**
 * Backdrop built the way episode 1 builds its own: a dithered sky gradient and
 * two tileable parallax ridge strips, both rendered once per theme into
 * offscreen canvases because per-pixel dithering every frame is too slow.
 *
 * What is new here is the era skyline in front of the ridges, which grows as the
 * years pass, and the smog band, which thickens with the total ever emitted
 * rather than with the year -- so the haze stays after emissions stop.
 *
 * Every band of the frame is painted every frame. An earlier version left a strip
 * between the horizon and the road unpainted, which is what made it flicker.
 */
export const HORIZON = 168;
export const ROAD_Y = 214;
export const LANES = [ROAD_Y + 12, ROAD_Y + 34];
export const FLIGHT_Y = 96;

/**
 * One theme per era. The colours are episode 1's own dusk, sunset and night
 * themes, walked from cool to hot as the smoke thickens, so the two episodes read
 * as the same world rather than two different art styles.
 */
export const THEMES: Record<string, Theme> = {
  dawn: { key: "cr-dawn", skyTop: "#141a3a", skyBottom: "#6b4e71", far: "#2c2a4a", near: "#1f1d36", stars: 34, snowline: 0 },
  smoke: { key: "cr-smoke", skyTop: "#1d1f38", skyBottom: "#8a6360", far: "#37324f", near: "#241f38", stars: 18, snowline: 0 },
  haze: { key: "cr-haze", skyTop: "#251c33", skyBottom: "#a86a4f", far: "#41304a", near: "#2a1d33", stars: 8, snowline: 0 },
  hot: { key: "cr-hot", skyTop: "#2b1b3d", skyBottom: "#c8553d", far: "#4a2545", near: "#2e1a33", stars: 4, snowline: 0 },
  clean: { key: "cr-clean", skyTop: "#0f1a33", skyBottom: "#6e8f8a", far: "#27394d", near: "#1a2634", stars: 26, snowline: 0 },
};

export function prewarm(): void {
  for (const theme of Object.values(THEMES)) prewarmTheme(theme, VIEW_W, HORIZON, 92, 64, 9);
}

function hash(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

/** 0 at 1850, 1 by the jet age: how built up the world is. */
export function development(year: number): number {
  return Math.max(0, Math.min(1, (year - 1850) / 150));
}

interface Structure {
  x: number;
  w: number;
  h: number;
  kind: "spire" | "barn" | "tree" | "chimney" | "factory" | "block" | "tower" | "cooling";
}

function structureFor(k: number, dev: number): Structure | null {
  const r = hash(k);
  const r2 = hash(k * 7 + 11);
  const x = k * 54 + Math.round(r2 * 14);
  if (r > 0.18 + dev * 0.74) {
    if (r2 < 0.3) return { x, w: 10, h: 40, kind: "spire" };
    if (r2 < 0.62) return { x, w: 24, h: 18, kind: "barn" };
    return { x, w: 14, h: 17, kind: "tree" };
  }
  if (dev < 0.16) return null;
  if (dev < 0.42) {
    return r2 < 0.5
      ? { x, w: 8, h: 34 + Math.round(r * 20), kind: "chimney" }
      : { x, w: 30, h: 21 + Math.round(r * 9), kind: "factory" };
  }
  if (dev < 0.72) {
    if (r2 < 0.28) return { x, w: 8, h: 40 + Math.round(r * 24), kind: "chimney" };
    if (r2 < 0.6) return { x, w: 34, h: 24 + Math.round(r * 12), kind: "factory" };
    return { x, w: 24, h: 30 + Math.round(r * 20), kind: "block" };
  }
  if (r2 < 0.16) return { x, w: 22, h: 34, kind: "cooling" };
  if (r2 < 0.3) return { x, w: 8, h: 46 + Math.round(r * 26), kind: "chimney" };
  if (r2 < 0.66) return { x, w: 22, h: 52 + Math.round(r * 46), kind: "tower" };
  return { x, w: 30, h: 34 + Math.round(r * 24), kind: "block" };
}

function plume(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, strength: number, color: string): void {
  if (strength <= 0.05) return;
  ctx.fillStyle = color;
  for (let i = 0; i < 8; i++) {
    const t = (time * 0.5 + i * 0.5) % 4;
    const a = Math.max(0, 1 - t / 4) * strength;
    if (a <= 0.02) continue;
    ctx.globalAlpha = a * 0.5;
    const size = 3 + t * 1.6;
    ctx.beginPath();
    ctx.arc(x + Math.sin(t * 1.5 + i) * 5, y - 3 - t * 11, size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawStructure(
  ctx: CanvasRenderingContext2D, st: Structure, sx: number, dev: number, time: number, stock: number,
): void {
  const base = HORIZON;
  const top = base - st.h;
  const lit = `rgb(${Math.round(52 + dev * 22)},${Math.round(58 + dev * 16)},${Math.round(84 - dev * 8)})`;
  const dark = `rgb(${Math.round(34 + dev * 14)},${Math.round(38 + dev * 10)},${Math.round(58 - dev * 6)})`;

  if (st.kind === "tree") {
    ctx.fillStyle = "#3a2a1c";
    ctx.fillRect(sx + st.w / 2 - 1.5, base - 7, 3, 7);
    ctx.fillStyle = "#2f4a35";
    ctx.beginPath();
    ctx.arc(sx + st.w / 2, top + 7, st.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sx + st.w / 2 - 3, top + 11, st.w / 2.6, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (st.kind === "spire") {
    ctx.fillStyle = dark;
    ctx.fillRect(sx + 1, top + 14, st.w - 2, st.h - 14);
    ctx.beginPath();
    ctx.moveTo(sx - 1, top + 15);
    ctx.lineTo(sx + st.w / 2, top);
    ctx.lineTo(sx + st.w + 1, top + 15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,214,120,0.5)";
    ctx.fillRect(sx + st.w / 2 - 1, top + 20, 2, 4);
    return;
  }
  if (st.kind === "barn") {
    ctx.fillStyle = "#4a3320";
    ctx.fillRect(sx, top + 7, st.w, st.h - 7);
    ctx.fillStyle = "#5d3f26";
    ctx.beginPath();
    ctx.moveTo(sx - 2, top + 8);
    ctx.lineTo(sx + st.w / 2, top);
    ctx.lineTo(sx + st.w + 2, top + 8);
    ctx.closePath();
    ctx.fill();
    return;
  }

  ctx.fillStyle = lit;
  ctx.fillRect(sx, top, st.w, st.h);
  ctx.fillStyle = dark;
  ctx.fillRect(sx, top, 2, st.h);

  if (st.kind === "cooling") {
    ctx.fillStyle = lit;
    ctx.beginPath();
    ctx.moveTo(sx - 3, top);
    ctx.lineTo(sx + st.w + 3, top);
    ctx.lineTo(sx + st.w - 2, base);
    ctx.lineTo(sx + 2, base);
    ctx.closePath();
    ctx.fill();
    plume(ctx, sx + st.w / 2, top, time, 0.55, "#c3cbdb");
    return;
  }
  if (st.kind === "chimney") {
    ctx.fillStyle = "#6b4a3a";
    ctx.fillRect(sx - 2, top, st.w + 4, 3);
    plume(ctx, sx + st.w / 2, top, time, 0.35 + stock * 0.5, "#726e69");
    return;
  }
  if (st.kind === "factory") {
    ctx.fillStyle = "rgba(255,214,120,0.35)";
    for (let i = 3; i < st.w - 4; i += 7) ctx.fillRect(sx + i, top + 6, 4, 4);
    ctx.fillStyle = "#6b4a3a";
    ctx.fillRect(sx + st.w - 9, top - 18, 6, 18);
    plume(ctx, sx + st.w - 6, top - 18, time, 0.3 + stock * 0.45, "#726e69");
    return;
  }
  ctx.fillStyle = `rgba(255,214,120,${0.22 + dev * 0.4})`;
  for (let wy = top + 4; wy < base - 5; wy += 7) {
    for (let wx = sx + 3; wx < sx + st.w - 4; wx += 6) {
      if (hash(wx * 31 + wy * 17) > 0.42) ctx.fillRect(wx, wy, 3, 3);
    }
  }
}

/** Sky, stars, ridges, skyline, smog and ground. Fills the whole frame. */
export function drawBackdrop(
  ctx: CanvasRenderingContext2D, theme: Theme, year: number, scroll: number, stock: number, time: number,
): void {
  ctx.drawImage(ditheredSky(theme, VIEW_W, HORIZON, 9), 0, 0);

  drawStars(ctx, theme, scroll, time, VIEW_W, HORIZON);

  const sun = `rgb(255,${Math.round(230 - stock * 98)},${Math.round(176 - stock * 132)})`;
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(392, 46, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.14;
  ctx.beginPath();
  ctx.arc(392, 46, 21, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  drawRidge(ctx, theme, "far", scroll, 0.14, HORIZON - 82, VIEW_W, 92);
  drawRidge(ctx, theme, "near", scroll, 0.3, HORIZON - 50, VIEW_W, 64);

  const dev = development(year);
  const mid = scroll * 0.5;
  const first = Math.floor(mid / 54) - 1;
  for (let k = first; k < first + 13; k++) {
    const st = structureFor(k, dev);
    if (!st) continue;
    const sx = st.x - mid;
    if (sx < -60 || sx > VIEW_W + 60) continue;
    drawStructure(ctx, st, sx, dev, time + k, stock);
  }

  if (stock > 0.02) {
    ctx.globalAlpha = Math.min(0.48, stock * 0.55);
    const grad = ctx.createLinearGradient(0, HORIZON - 48, 0, HORIZON);
    grad.addColorStop(0, "rgba(150,126,104,0)");
    grad.addColorStop(1, "rgba(172,140,110,1)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, HORIZON - 48, VIEW_W, 48);
    ctx.globalAlpha = 1;
  }

  const ground = ctx.createLinearGradient(0, HORIZON, 0, VIEW_H);
  ground.addColorStop(0, `rgb(${Math.round(46 + dev * 10)},${Math.round(56 - dev * 10)},${Math.round(44 - dev * 6)})`);
  ground.addColorStop(1, `rgb(${Math.round(30 + dev * 8)},${Math.round(36 - dev * 6)},${Math.round(32 - dev * 4)})`);
  ctx.fillStyle = ground;
  ctx.fillRect(0, HORIZON, VIEW_W, VIEW_H - HORIZON);
}

/** The road, drawn over the ground. */
export function drawRoad(ctx: CanvasRenderingContext2D, scroll: number): void {
  ctx.fillStyle = "#33384f";
  ctx.fillRect(0, ROAD_Y, VIEW_W, VIEW_H - ROAD_Y);
  ctx.fillStyle = "#454c6b";
  ctx.fillRect(0, ROAD_Y, VIEW_W, 2);
  ctx.fillStyle = "#2a2f45";
  ctx.fillRect(0, ROAD_Y + 2, VIEW_W, 1);
  ctx.fillStyle = "#59608a";
  const off = scroll % 40;
  for (let x = -40; x < VIEW_W + 40; x += 40) ctx.fillRect(Math.round(x - off + 10), LANES[0] + 10, 18, 2);
  ctx.fillStyle = "#3d4a38";
  ctx.fillRect(0, VIEW_H - 8, VIEW_W, 8);
  // Episode 1's terrain grain, so the ground has the same texture as its hills.
  ctx.fillStyle = ditherPattern(ctx);
  ctx.fillRect(0, ROAD_Y, VIEW_W, VIEW_H - ROAD_Y);
}
