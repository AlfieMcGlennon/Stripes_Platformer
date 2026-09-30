import { lerpRgb, parseColor, type RGB } from "./color";
import { mulberry32 } from "./random";
import { reduceMotion } from "./motion";

/**
 * Backdrop primitives shared by every episode: a dithered sky gradient, tileable
 * parallax ridge strips, and a scrolling starfield.
 *
 * Skies and ridges are rendered once per theme into offscreen canvases, because
 * per-pixel dithering every frame is far too slow. Both caches are keyed on the
 * theme key plus the size, so two episodes at different resolutions coexist.
 */
export interface Theme {
  key: string;
  skyTop: string;
  skyBottom: string;
  far: string;
  near: string;
  stars: number;
  /** 0..1, how much of the ridge peaks is snow-capped. */
  snowline: number;
}

/** 4x4 ordered-dither matrix, shared by the sky and the terrain texture. */
export const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const skyCache = new Map<string, HTMLCanvasElement>();
const ridgeCache = new Map<string, HTMLCanvasElement>();

export function offscreen(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

/**
 * Sky quantised into bands and ordered-dithered between them: the classic 16-bit
 * look. Written straight into ImageData in one pass.
 */
export function ditheredSky(theme: Theme, w: number, h: number, bands = 7): HTMLCanvasElement {
  const key = `${theme.key}-${w}x${h}-${bands}`;
  const cached = skyCache.get(key);
  if (cached) return cached;
  const [canvas, ctx] = offscreen(w, h);
  const top = parseColor(theme.skyTop);
  const bottom = parseColor(theme.skyBottom);
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const level = (y / (h - 1)) * bands;
    const lo = Math.floor(level);
    const frac = level - lo;
    const c0: RGB = lerpRgb(top, bottom, lo / bands);
    const c1: RGB = lerpRgb(top, bottom, Math.min(bands, lo + 1) / bands);
    for (let x = 0; x < w; x++) {
      const c = BAYER[y % 4][x % 4] < frac * 16 ? c1 : c0;
      const i = (y * w + x) * 4;
      img.data[i] = c[0];
      img.data[i + 1] = c[1];
      img.data[i + 2] = c[2];
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  skyCache.set(key, canvas);
  return canvas;
}

/** A tileable ridge strip built from a sum of sines, so it never seams. */
export function ridgeStrip(theme: Theme, layer: "far" | "near", w: number, h: number): HTMLCanvasElement {
  const key = `${theme.key}-${layer}-${w}x${h}`;
  const cached = ridgeCache.get(key);
  if (cached) return cached;
  const [canvas, ctx] = offscreen(w, h);
  const rand = mulberry32(layer === "far" ? 11 : 23);
  const waves = Array.from({ length: 4 }, (_, i) => ({
    k: (i + 1) * (layer === "far" ? 2 : 3),
    phase: rand() * Math.PI * 2,
    amp: (1 / (i + 1)) * (0.6 + rand() * 0.4),
  }));
  const fill = layer === "far" ? theme.far : theme.near;
  const snowline = theme.snowline;
  for (let x = 0; x < w; x++) {
    let v = 0;
    for (const wv of waves) v += Math.sin((x / w) * Math.PI * 2 * wv.k + wv.phase) * wv.amp;
    const top = Math.round(h * 0.5 - v * h * 0.22);
    ctx.fillStyle = fill;
    ctx.fillRect(x, top, 1, h - top);
    // Snow caps only the peaks: deeper the higher the peak, ragged at the edge.
    const snowDepth = Math.round(Math.max(0, h * 0.42 - top) * snowline * 1.6);
    if (layer === "far" && snowDepth > 0) {
      ctx.fillStyle = "#dfe8f5";
      ctx.fillRect(x, top, 1, snowDepth + (x % 3 === 0 ? 1 : 0));
    }
  }
  ridgeCache.set(key, canvas);
  return canvas;
}

/** Deterministic starfield, drifting with the camera and twinkling in time. */
export function drawStars(
  ctx: CanvasRenderingContext2D, theme: Theme, scroll: number, time: number, w: number, h: number,
): void {
  const rand = mulberry32(5);
  const t = reduceMotion() ? 0 : time;
  for (let i = 0; i < theme.stars; i++) {
    const sx = ((Math.floor(rand() * w * 3 - scroll * 0.05) % w) + w) % w;
    const sy = Math.floor(rand() * h * 0.55);
    ctx.fillStyle = Math.sin(t * (1 + rand() * 3) + i) > 0.6 ? "#ffffff" : "rgba(255,255,255,0.45)";
    ctx.fillRect(sx, sy, 1, 1);
  }
}

/** Draw a tiled ridge layer at `y`, scrolled by `scroll * speed`. */
export function drawRidge(
  ctx: CanvasRenderingContext2D, theme: Theme, layer: "far" | "near",
  scroll: number, speed: number, y: number, w: number, h: number,
): void {
  const strip = ridgeStrip(theme, layer, w * 2, h);
  const offset = (((-scroll * speed) % strip.width) + strip.width) % strip.width;
  ctx.drawImage(strip, Math.floor(offset) - strip.width, y);
  ctx.drawImage(strip, Math.floor(offset), y);
}

/** Build a theme's cached art now (e.g. during a fade) so play never hitches. */
export function prewarmTheme(theme: Theme, w: number, h: number, farH = 70, nearH = 50, bands = 7): void {
  ditheredSky(theme, w, h, bands);
  ridgeStrip(theme, "far", w * 2, farH);
  ridgeStrip(theme, "near", w * 2, nearH);
}

let ditherCanvas: HTMLCanvasElement | null = null;
const patterns = new WeakMap<CanvasRenderingContext2D, CanvasPattern>();

/** 4x4 checker of translucent black, used to texture terrain interiors. Cached per context. */
export function ditherPattern(ctx: CanvasRenderingContext2D): CanvasPattern {
  const cached = patterns.get(ctx);
  if (cached) return cached;
  if (!ditherCanvas) {
    const [c, g] = offscreen(4, 4);
    g.fillStyle = "rgba(0,0,0,0.22)";
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (BAYER[y][x] < 6) g.fillRect(x, y, 1, 1);
    ditherCanvas = c;
  }
  const pattern = ctx.createPattern(ditherCanvas, "repeat")!;
  patterns.set(ctx, pattern);
  return pattern;
}
