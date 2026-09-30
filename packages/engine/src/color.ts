/**
 * One colour toolkit. Colours are "#rrggbb" strings everywhere; parsing and
 * shading are memoised because terrain drawing asks for the same few hundred
 * colours every frame.
 */
export type RGB = [number, number, number];

const parsed = new Map<string, RGB>();
const shaded = new Map<string, string>();

/** Parse "#rrggbb" or "rgb(r,g,b)". */
export function parseColor(color: string): RGB {
  let rgb = parsed.get(color);
  if (!rgb) {
    if (color.startsWith("#")) {
      const n = parseInt(color.slice(1), 16);
      rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    } else {
      const m = color.match(/\d+(\.\d+)?/g) ?? ["0", "0", "0"];
      rgb = [Number(m[0]), Number(m[1]), Number(m[2])];
    }
    parsed.set(color, rgb);
  }
  return rgb;
}

export function css(rgb: RGB): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${rgb.map((v) => clamp(v).toString(16).padStart(2, "0")).join("")}`;
}

export function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function lerpColor(a: string, b: string, t: number): string {
  return css(lerpRgb(parseColor(a), parseColor(b), Math.max(0, Math.min(1, t))));
}

/** Multiply brightness by k (memoised). */
export function shade(color: string, k: number): string {
  const key = `${color}|${k.toFixed(3)}`;
  let out = shaded.get(key);
  if (!out) {
    const [r, g, b] = parseColor(color);
    out = css([r * k, g * k, b * k]);
    if (shaded.size > 4000) shaded.clear(); // bounded: zoom fades use many k values
    shaded.set(key, out);
  }
  return out;
}
