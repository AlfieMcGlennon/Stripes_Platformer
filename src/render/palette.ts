import { css, lerpRgb, parseColor } from "./color";

/**
 * Warming-stripes colours: ColorBrewer RdBu (11-class), blue = cooler, red = warmer.
 * The concept and look are Ed Hawkins' (showyourstripes.info, CC BY 4.0); we
 * rebuild them from HadCRUT5 rather than copying the graphic.
 */
const RDBU = [
  "#053061", "#2166ac", "#4393c3", "#92c5de", "#d1e5f0", "#f7f7f7",
  "#fddbc7", "#f4a582", "#d6604d", "#b2182b", "#67001f",
];

export const COLORS = {
  sky: "#0b1020",
  skyLight: "#1b2440",
  ground: "#3b4a3f",
  groundEdge: "#8fb996",
  text: "#f2efe6",
  dim: "#8a90a6",
  accent: "#ffd166",
  ruler: "#e9d8a6",
};

/** Map a value to [-1, 1] around `centre`, saturating at +/- `halfRange`. */
export function stripePosition(value: number, centre: number, halfRange: number): number {
  return Math.max(-1, Math.min(1, (value - centre) / halfRange));
}

// Positions are quantised to 1/512 so the cache stays small while colours stay smooth.
const stripeCache = new Map<number, string>();

export function stripeColor(value: number, centre: number, halfRange: number): string {
  const pos = Math.round(stripePosition(value, centre, halfRange) * 512) / 512;
  let out = stripeCache.get(pos);
  if (!out) {
    const u = ((pos + 1) / 2) * (RDBU.length - 1);
    const i = Math.min(RDBU.length - 2, Math.floor(u));
    out = css(lerpRgb(parseColor(RDBU[i]), parseColor(RDBU[i + 1]), u - i));
    stripeCache.set(pos, out);
  }
  return out;
}
