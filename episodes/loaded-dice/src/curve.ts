import { stripeColor } from "@stripes/engine";
import { BIN_HI, BIN_LO, histogram } from "./data";
import { BIN_W, COLORS, FLOOR, PLOT, xFor, type Renderer } from "./view";

/**
 * Everything here is the data drawing itself: an axis, bars, and one day at a
 * time. There is no art in this episode a dataset could not generate, which is why
 * it was cheap — and the rebuild keeps that while giving the pace back to the
 * player, which the first attempt took away.
 */

/** Colour a day by its temperature, on the same stripes scale as every episode. */
export function dayColour(celsius: number): string {
  return stripeColor(celsius, (BIN_LO + BIN_HI) / 2, (BIN_HI - BIN_LO) / 2);
}

export function drawAxis(r: Renderer): void {
  r.rect(PLOT.x - 1, FLOOR, PLOT.w + 2, 1, COLORS.plateEdge);
  for (let c = BIN_LO; c <= BIN_HI; c += 5) {
    const x = Math.round(xFor(c));
    r.rect(x, FLOOR + 1, 1, 3, COLORS.plateEdge);
    r.text(`${c}`, x, FLOOR + 5, { size: 7, color: COLORS.dim, align: "center" });
  }
  r.text("°C", PLOT.x + PLOT.w + 6, FLOOR + 5, { size: 7, color: COLORS.dim });
}

/**
 * Bars for the days placed so far. `peak` is passed in rather than measured, so the
 * scale is stable while a pile is still growing instead of rescaling every frame.
 */
export function drawBars(r: Renderer, counts: number[], peak: number, alpha = 1): void {
  const scale = (PLOT.h - 4) / Math.max(4, peak);
  const ctx = r.px;
  ctx.globalAlpha = alpha;
  counts.forEach((n, i) => {
    if (!n) return;
    const h = Math.max(1, Math.min(PLOT.h, n * scale));
    r.rect(PLOT.x + i * BIN_W, FLOOR - h, Math.max(1, BIN_W - 1), h, dayColour(BIN_LO + i + 0.5));
  });
  ctx.globalAlpha = 1;
}

/** A period's shape as an outline, for comparing two of them on one axis. */
export function drawOutline(r: Renderer, tenths: number[], peak: number, colour: string, dashed: boolean): void {
  const bins = histogram(tenths, BIN_LO, BIN_HI);
  const scale = (PLOT.h - 4) / Math.max(4, peak);
  bins.forEach((n, i) => {
    if (dashed && i % 2) return;
    const h = Math.max(1, n * scale);
    r.rect(PLOT.x + i * BIN_W, FLOOR - h - 1, Math.max(1, BIN_W - 1), 1, colour);
  });
}

/** Fill only the part of a period at or beyond `threshold`: the tail is the argument. */
export function shadeTail(r: Renderer, tenths: number[], peak: number, threshold: number, colour: string): void {
  const bins = histogram(tenths, BIN_LO, BIN_HI);
  const scale = (PLOT.h - 4) / Math.max(4, peak);
  bins.forEach((n, i) => {
    const c = BIN_LO + i;
    if (c < threshold || !n) return;
    const h = Math.max(1, n * scale);
    r.rect(PLOT.x + i * BIN_W, FLOOR - h, Math.max(1, BIN_W - 1), h, colour);
  });
}

/** The draggable threshold, and the only thing the player controls in the last phase. */
export function drawThresholdHandle(r: Renderer, threshold: number, grabbed: boolean): void {
  const x = Math.round(xFor(threshold));
  for (let y = PLOT.y - 4; y < FLOOR; y += 3) r.rect(x, y, 1, 2, COLORS.hot);
  const w = grabbed ? 9 : 7;
  r.rect(x - w / 2, FLOOR + 1, w, 5, grabbed ? COLORS.gold : COLORS.hot);
  r.rect(x - 1, FLOOR + 2, 2, 3, COLORS.shadow);
  r.text(`${threshold.toFixed(0)} °C`, x, PLOT.y - 14, {
    size: 8, color: grabbed ? COLORS.gold : COLORS.hot, align: "center",
  });
}

/**
 * One day, drawn large with its date, for the phases where a single day is the
 * whole point. Legibility here is the fix for the first attempt: a day has to be
 * readable before a thousand of them mean anything.
 */
export function drawBigDay(
  r: Renderer, celsius: number, label: string, x: number, y: number, size = 14,
): void {
  r.rect(x - size / 2 - 1, y - 1, size + 2, size + 2, COLORS.shadow);
  r.rect(x - size / 2, y, size, size, dayColour(celsius));
  r.text(label, x, y + size + 4, { size: 8, color: COLORS.ink, align: "center" });
  r.text(`${celsius.toFixed(1)} °C`, x, y + size + 14, { size: 8, color: COLORS.gold, align: "center" });
}

/** A day in flight, from where it was held to where it belongs on the axis. */
export interface Flight {
  celsius: number;
  from: { x: number; y: number };
  t: number;
}

export function drawFlights(r: Renderer, flights: Flight[]): void {
  for (const f of flights) {
    const target = { x: xFor(f.celsius), y: FLOOR - 6 };
    const e = 1 - (1 - f.t) ** 2;
    const x = f.from.x + (target.x - f.from.x) * e;
    const y = f.from.y + (target.y - f.from.y) * e;
    const size = 14 - 9 * e;
    r.rect(x - size / 2, y - size / 2, size, size, dayColour(f.celsius));
  }
}
