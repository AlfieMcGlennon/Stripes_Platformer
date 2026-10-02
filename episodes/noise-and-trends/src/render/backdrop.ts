import { ditheredSky, drawRidge, drawStars, mulberry32, reduceMotion } from "@stripes/engine";

/**
 * Parallax backgrounds: a dithered sky gradient, two mountain layers and
 * optional stars/snow. Skies and mountain strips are rendered once per theme
 * into offscreen canvases, because per-pixel dithering every frame is too slow.
 */
export type { Theme } from "@stripes/engine";
import type { Theme } from "@stripes/engine";

export const THEMES: Record<string, Theme> = {
  dusk: { key: "dusk", skyTop: "#141a3a", skyBottom: "#6b4e71", far: "#2c2a4a", near: "#1f1d36", stars: 40, snowline: 0 },
  night: { key: "night", skyTop: "#070b1c", skyBottom: "#1c2f5a", far: "#16213e", near: "#0f172e", stars: 70, snowline: 0 },
  sunset: { key: "sunset", skyTop: "#2b1b3d", skyBottom: "#c8553d", far: "#4a2545", near: "#2e1a33", stars: 10, snowline: 0 },
  stripes: { key: "stripes", skyTop: "#05070f", skyBottom: "#10162b", far: "#121a30", near: "#0b1122", stars: 60, snowline: 0 },
};

export { lerpColor as lerpHex } from "@stripes/engine";

/**
 * Sky, ridge and star drawing all live in `@stripes/engine`; only the themes and
 * the snowfall are Noise and Trends's own. `prewarmTheme` is re-exported so callers
 * that pre-build a theme during a fade do not need to know where it comes from.
 */
export { prewarmTheme } from "@stripes/engine";

/**
 * Draw sky, stars and mountains. `scroll` is the camera x; `fade` 0..1 dims the
 * whole backdrop (used when zooming out so the data takes over).
 */
export function drawBackdrop(
  ctx: CanvasRenderingContext2D, theme: Theme, scroll: number, time: number, w: number, h: number, fade = 1,
): void {
  ctx.drawImage(ditheredSky(theme, w, h), 0, 0);
  drawStars(ctx, theme, scroll, time, w, h);
  ctx.globalAlpha = fade;
  drawRidge(ctx, theme, "far", scroll, 0.15, h - 95, w, 70);
  drawRidge(ctx, theme, "near", scroll, 0.35, h - 55, w, 50);
  ctx.globalAlpha = 1;
}

/** Screen-space snowfall; density 0..1. Deterministic in time, so no state. */
export function drawSnow(ctx: CanvasRenderingContext2D, density: number, time: number, w: number, h: number, drift = 0): void {
  if (reduceMotion()) return; // Falling snow across the whole screen is a vestibular trigger.
  const count = Math.floor(density * 140);
  const rand = mulberry32(99);
  ctx.fillStyle = "#eef4ff";
  for (let i = 0; i < count; i++) {
    const speed = 12 + rand() * 20;
    const x0 = rand() * w;
    const y0 = rand() * h;
    const sway = Math.sin(time * 1.5 + i) * 3;
    const x = (((x0 + sway + time * (6 + drift)) % w) + w) % w;
    const y = (y0 + time * speed) % h;
    ctx.fillRect(Math.floor(x), Math.floor(y), rand() > 0.8 ? 2 : 1, 1);
  }
}

export { ditherPattern } from "@stripes/engine";

