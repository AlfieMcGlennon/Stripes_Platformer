import { mulberry32 } from "../core/random";
import { lerpRgb, parseColor, type RGB } from "./color";

/**
 * Parallax backgrounds: a dithered sky gradient, two mountain layers and
 * optional stars/snow. Skies and mountain strips are rendered once per theme
 * into offscreen canvases, because per-pixel dithering every frame is too slow.
 */
export interface Theme {
  key: string;
  skyTop: string;
  skyBottom: string;
  far: string;
  near: string;
  stars: number;
  /** 0..1, how much of the mountains is snow-capped. */
  snowline: number;
}

export const THEMES: Record<string, Theme> = {
  dusk: { key: "dusk", skyTop: "#141a3a", skyBottom: "#6b4e71", far: "#2c2a4a", near: "#1f1d36", stars: 40, snowline: 0 },
  night: { key: "night", skyTop: "#070b1c", skyBottom: "#1c2f5a", far: "#16213e", near: "#0f172e", stars: 70, snowline: 0 },
  sunset: { key: "sunset", skyTop: "#2b1b3d", skyBottom: "#c8553d", far: "#4a2545", near: "#2e1a33", stars: 10, snowline: 0 },
  stripes: { key: "stripes", skyTop: "#05070f", skyBottom: "#10162b", far: "#121a30", near: "#0b1122", stars: 60, snowline: 0 },
};

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export { lerpColor as lerpHex } from "./color";

const skyCache = new Map<string, HTMLCanvasElement>();
const ridgeCache = new Map<string, HTMLCanvasElement>();

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

/**
 * Sky quantised into bands and ordered-dithered between them: the classic
 * 16-bit look. Written straight into ImageData (one pass, a few ms).
 */
function skyCanvas(theme: Theme, w: number, h: number): HTMLCanvasElement {
  const cached = skyCache.get(theme.key);
  if (cached) return cached;
  const [canvas, ctx] = makeCanvas(w, h);
  const top = parseColor(theme.skyTop);
  const bottom = parseColor(theme.skyBottom);
  const bands = 7;
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
  skyCache.set(theme.key, canvas);
  return canvas;
}

/** Build a theme's cached art now (e.g. during a fade) so play never hitches. */
export function prewarmTheme(theme: Theme, w: number, h: number): void {
  skyCanvas(theme, w, h);
  ridgeCanvas(theme, "far", w * 2);
  ridgeCanvas(theme, "near", w * 2);
}

/** A tileable mountain strip; `rough` controls peakiness. */
function ridgeCanvas(theme: Theme, layer: "far" | "near", w: number): HTMLCanvasElement {
  const key = `${theme.key}-${layer}`;
  const cached = ridgeCache.get(key);
  if (cached) return cached;
  const h = layer === "far" ? 70 : 50;
  const [canvas, ctx] = makeCanvas(w, h);
  const rand = mulberry32(layer === "far" ? 11 : 23);
  const waves = Array.from({ length: 4 }, (_, i) => ({ k: (i + 1) * (layer === "far" ? 2 : 3), phase: rand() * Math.PI * 2, amp: (1 / (i + 1)) * (0.6 + rand() * 0.4) }));
  const fill = layer === "far" ? theme.far : theme.near;
  for (let x = 0; x < w; x++) {
    let v = 0;
    for (const wv of waves) v += Math.sin((x / w) * Math.PI * 2 * wv.k + wv.phase) * wv.amp;
    const top = Math.round(h * 0.5 - v * h * 0.22);
    ctx.fillStyle = fill;
    ctx.fillRect(x, top, 1, h - top);
    // Snow caps only the peaks: deeper the higher the peak, ragged at the edge.
    const snowDepth = Math.round(Math.max(0, h * 0.42 - top) * theme.snowline * 1.6);
    if (layer === "far" && snowDepth > 0) {
      ctx.fillStyle = "#dfe8f5";
      ctx.fillRect(x, top, 1, snowDepth + (x % 3 === 0 ? 1 : 0));
    }
  }
  ridgeCache.set(key, canvas);
  return canvas;
}

/**
 * Draw sky, stars and mountains. `scroll` is the camera x; `fade` 0..1 dims the
 * whole backdrop (used when zooming out so the data takes over).
 */
export function drawBackdrop(ctx: CanvasRenderingContext2D, theme: Theme, scroll: number, time: number, w: number, h: number, fade = 1): void {
  ctx.drawImage(skyCanvas(theme, w, h), 0, 0);
  const rand = mulberry32(5);
  for (let i = 0; i < theme.stars; i++) {
    const sx = Math.floor((rand() * w * 3 - scroll * 0.05) % w + w) % w;
    const sy = Math.floor(rand() * h * 0.55);
    const twinkle = Math.sin(time * (1 + rand() * 3) + i) > 0.6;
    ctx.fillStyle = twinkle ? "#ffffff" : "rgba(255,255,255,0.45)";
    ctx.fillRect(sx, sy, 1, 1);
  }
  ctx.globalAlpha = fade;
  const layers: ["far" | "near", number, number][] = [["far", 0.15, h - 95], ["near", 0.35, h - 55]];
  for (const [layer, speed, y] of layers) {
    const strip = ridgeCanvas(theme, layer, w * 2);
    const offset = ((-scroll * speed) % strip.width + strip.width) % strip.width;
    ctx.drawImage(strip, Math.floor(offset) - strip.width, y);
    ctx.drawImage(strip, Math.floor(offset), y);
  }
  ctx.globalAlpha = 1;
}

/** Screen-space snowfall; density 0..1. Deterministic in time, so no state. */
export function drawSnow(ctx: CanvasRenderingContext2D, density: number, time: number, w: number, h: number, drift = 0): void {
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

let ditherCanvas: HTMLCanvasElement | null = null;
const patterns = new WeakMap<CanvasRenderingContext2D, CanvasPattern>();

/** 4x4 checker of translucent black, used to texture terrain interiors. Cached per context. */
export function ditherPattern(ctx: CanvasRenderingContext2D): CanvasPattern {
  const cached = patterns.get(ctx);
  if (cached) return cached;
  if (!ditherCanvas) {
    const [c, g] = makeCanvas(4, 4);
    g.fillStyle = "rgba(0,0,0,0.22)";
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (BAYER[y][x] < 6) g.fillRect(x, y, 1, 1);
    ditherCanvas = c;
  }
  const pattern = ctx.createPattern(ditherCanvas, "repeat")!;
  patterns.set(ctx, pattern);
  return pattern;
}
