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

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Map a value to [-1, 1] around `centre`, saturating at +/- `halfRange`. */
export function stripePosition(value: number, centre: number, halfRange: number): number {
  return Math.max(-1, Math.min(1, (value - centre) / halfRange));
}

export function stripeColor(value: number, centre: number, halfRange: number): string {
  const u = ((stripePosition(value, centre, halfRange) + 1) / 2) * (RDBU.length - 1);
  const i = Math.min(RDBU.length - 2, Math.floor(u));
  const f = u - i;
  const a = hexToRgb(RDBU[i]);
  const b = hexToRgb(RDBU[i + 1]);
  const mix = a.map((c, k) => Math.round(c + (b[k] - c) * f));
  return `rgb(${mix[0]},${mix[1]},${mix[2]})`;
}
