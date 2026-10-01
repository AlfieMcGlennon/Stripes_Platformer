import { stripeColor } from "@stripes/engine";
import { BIN_HI, BIN_LO, histogram, shiftedDays, type Summary } from "./data";
import { BIN_W, COLORS, FLOOR, PLOT, xFor, type Renderer } from "./view";

/**
 * Everything here is the data drawing itself: an axis, bars, and annotations that
 * name the parts of the shape. There is no art in this episode a dataset could not
 * generate.
 */

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

const scaleFor = (peak: number): number => (PLOT.h - 6) / Math.max(4, peak);

export function drawBars(r: Renderer, counts: number[], peak: number, alpha = 1): void {
  const scale = scaleFor(peak);
  const ctx = r.px;
  ctx.globalAlpha = alpha;
  counts.forEach((n, i) => {
    if (!n) return;
    const h = Math.max(1, Math.min(PLOT.h, n * scale));
    r.rect(PLOT.x + i * BIN_W, FLOOR - h, Math.max(1, BIN_W - 1), h, dayColour(BIN_LO + i + 0.5));
  });
  ctx.globalAlpha = 1;
}

export function drawOutline(r: Renderer, bins: number[], peak: number, colour: string, dashed: boolean): void {
  const scale = scaleFor(peak);
  bins.forEach((n, i) => {
    if (dashed && i % 2) return;
    const h = Math.max(1, n * scale);
    r.rect(PLOT.x + i * BIN_W, FLOOR - h - 1, Math.max(1, BIN_W - 1), 1, colour);
  });
}

/** The early period pushed right by `degrees`, as solid bars: the player's curve. */
export function drawShifted(r: Renderer, degrees: number, peak: number): void {
  drawBars(r, histogram(shiftedDays(degrees), BIN_LO, BIN_HI), peak, 0.95);
}

export function shadeTail(r: Renderer, bins: number[], peak: number, threshold: number, colour: string): void {
  const scale = scaleFor(peak);
  bins.forEach((n, i) => {
    const c = BIN_LO + i;
    if (c < threshold || !n) return;
    const h = Math.max(1, n * scale);
    r.rect(PLOT.x + i * BIN_W, FLOOR - h, Math.max(1, BIN_W - 1), h, colour);
  });
}

/**
 * Names the parts of the shape, which is the thing a reader has to understand
 * before any of the rest means anything: where the middle is, how wide the usual
 * spread is, and that the thin ends are where the extremes live.
 */
export function drawAnatomy(
  r: Renderer, stats: Summary, show: { middle: boolean; spread: boolean; tails: boolean },
): void {
  const mid = Math.round(xFor(stats.mean));
  if (show.spread) {
    const lo = Math.round(xFor(stats.mean - stats.sd));
    const hi = Math.round(xFor(stats.mean + stats.sd));
    r.px.globalAlpha = 0.16;
    r.rect(lo, PLOT.y + 6, hi - lo, PLOT.h - 6, COLORS.ink);
    r.px.globalAlpha = 1;
    r.rect(lo, PLOT.y + 6, 1, PLOT.h - 6, COLORS.dim);
    r.rect(hi, PLOT.y + 6, 1, PLOT.h - 6, COLORS.dim);
    r.text("most summer days", (lo + hi) / 2, PLOT.y - 2, { size: 7, color: COLORS.dim, align: "center" });
  }
  if (show.middle) {
    for (let y = PLOT.y; y < FLOOR; y += 3) r.rect(mid, y, 1, 2, COLORS.gold);
    r.text(`${stats.mean.toFixed(1)} °C`, mid, PLOT.y - 12, { size: 8, color: COLORS.gold, align: "center" });
  }
  if (show.tails) {
    r.text("← cold, and rare", PLOT.x + 2, FLOOR - 12, { size: 7, color: COLORS.cold });
    r.text("rare, and hot →", PLOT.x + PLOT.w - 2, FLOOR - 12, { size: 7, color: COLORS.hot, align: "right" });
  }
}

/** The handle the player drags in the closing phase. */
export function drawThresholdHandle(r: Renderer, threshold: number, active: boolean): void {
  const x = Math.round(xFor(threshold));
  for (let y = PLOT.y - 2; y < FLOOR; y += 3) r.rect(x, y, 1, 2, COLORS.hot);
  const w = active ? 9 : 7;
  r.rect(x - w / 2, FLOOR + 1, w, 5, active ? COLORS.gold : COLORS.hot);
  r.rect(x - 1, FLOOR + 2, 2, 3, COLORS.shadow);
  r.text(`${threshold.toFixed(0)} °C`, x, PLOT.y - 12, {
    size: 8, color: active ? COLORS.gold : COLORS.hot, align: "center",
  });
}

/** The push control: how far the curve has been slid, and by whom. */
export function drawPushGauge(r: Renderer, degrees: number, best: number, matched: boolean): void {
  const w = 96;
  const x = PLOT.x + PLOT.w - w;
  const y = PLOT.y - 16;
  r.rect(x, y, w, 7, COLORS.shadow);
  const span = 2.5;
  r.rect(x + 1, y + 1, Math.max(1, Math.round(((w - 2) * degrees) / span)), 5, matched ? COLORS.gold : COLORS.hot);
  // A faint notch at the shift that actually reproduces the record.
  r.rect(x + 1 + Math.round(((w - 2) * best) / span), y - 2, 1, 11, COLORS.dim);
  r.text(`push +${degrees.toFixed(2)} °C`, x - 4, y, { size: 7, color: COLORS.ink, align: "right" });
}

/** One day, large and dated, used once to show what a single tile is. */
export function drawBigDay(r: Renderer, celsius: number, label: string, x: number, y: number, size = 14): void {
  r.rect(x - size / 2 - 1, y - 1, size + 2, size + 2, COLORS.shadow);
  r.rect(x - size / 2, y, size, size, dayColour(celsius));
  r.text(label, x, y + size + 3, { size: 8, color: COLORS.ink, align: "center" });
  r.text(`${celsius.toFixed(1)} °C`, x, y + size + 13, { size: 8, color: COLORS.gold, align: "center" });
}
