import { stripeColor } from "@stripes/engine";
import { BIN_HI, BIN_LO, histogram } from "./data";
import { BIN_W, COLORS, FLOOR, PLOT, VIEW_W, xFor, type Renderer } from "./view";

/**
 * Everything drawn here is the data itself: an axis, bars, and the days falling
 * down it. There is no art in this episode that a dataset could not generate,
 * which is the whole reason it was cheap to build.
 */

/** Colour a day by its temperature, on the same stripes scale as every episode. */
export function dayColour(celsius: number): string {
  // Centred on the middle of the drawn range so the axis reads cool-to-warm.
  return stripeColor(celsius, (BIN_LO + BIN_HI) / 2, (BIN_HI - BIN_LO) / 2);
}

export function drawAxis(r: Renderer, threshold: number, thresholdLabel: string): void {
  r.rect(PLOT.x - 1, FLOOR, PLOT.w + 2, 1, COLORS.plateEdge);
  for (let c = BIN_LO; c <= BIN_HI; c += 5) {
    const x = Math.round(xFor(c));
    r.rect(x, FLOOR + 1, 1, 3, COLORS.plateEdge);
    r.text(`${c}`, x, FLOOR + 5, { size: 7, color: COLORS.dim, align: "center" });
  }
  r.text("°C", PLOT.x + PLOT.w + 8, FLOOR + 5, { size: 7, color: COLORS.dim });

  // The threshold: everything to its right is a day this game calls dangerous.
  const tx = Math.round(xFor(threshold));
  for (let y = PLOT.y; y < FLOOR; y += 4) r.rect(tx, y, 1, 2, COLORS.hot);
  r.text(thresholdLabel, tx + 3, PLOT.y - 9, { size: 7, color: COLORS.hot });
}

/** Bars for days that have landed so far, scaled to the tallest bin seen. */
export function drawLanded(r: Renderer, counts: number[], peak: number): void {
  const scale = PLOT.h / Math.max(6, peak);
  counts.forEach((n, i) => {
    if (!n) return;
    const h = Math.min(PLOT.h, n * scale);
    const x = PLOT.x + i * BIN_W;
    r.rect(x, FLOOR - h, Math.max(1, BIN_W - 0.5), h, dayColour(BIN_LO + i + 0.5));
  });
}

export interface Falling {
  celsius: number;
  y: number;
  /** 1 once it has been dealt with, so it stops being drawn as a threat. */
  done: boolean;
  shaded: boolean;
}

export function drawFalling(r: Renderer, days: Falling[], threshold: number): void {
  for (const d of days) {
    const x = Math.round(xFor(d.celsius));
    const hot = d.celsius >= threshold;
    const size = hot ? 5 : 3;
    if (hot && !d.done) {
      r.rect(x - size / 2 - 1, d.y - 1, size + 2, size + 2, COLORS.shadow);
    }
    r.rect(x - size / 2, d.y, size, size, d.shaded ? COLORS.cold : dayColour(d.celsius));
  }
}

/** The player's shade: a fixed capacity to deal with heat, moved along the axis. */
export function drawShade(r: Renderer, celsius: number, width: number, flash: number): void {
  const x = Math.round(xFor(celsius));
  const half = Math.round((width / 2) * BIN_W);
  const y = FLOOR - 8;
  r.rect(x - half, y, half * 2, 3, flash > 0 ? COLORS.gold : COLORS.ink);
  r.rect(x - 1, y + 3, 2, 5, COLORS.dim);
}

/**
 * The reveal: both periods as outlines on one axis, with the tail beyond the
 * threshold filled, because the tail is the entire argument.
 */
export function drawComparison(
  r: Renderer, early: number[], late: number[], threshold: number, grow: number,
): void {
  const earlyBins = histogram(early, BIN_LO, BIN_HI);
  const lateBins = histogram(late, BIN_LO, BIN_HI);
  const peak = Math.max(...earlyBins, ...lateBins);
  const scale = (PLOT.h - 6) / peak;
  const shown = Math.max(1, Math.round(earlyBins.length * grow));

  const outline = (bins: number[], colour: string, dashed: boolean): void => {
    for (let i = 0; i < Math.min(shown, bins.length); i++) {
      const h = bins[i] * scale;
      const x = PLOT.x + i * BIN_W;
      if (dashed && i % 2) continue;
      r.rect(x, FLOOR - h - 1, Math.max(1, BIN_W - 0.5), 1, colour);
    }
  };

  // The late tail, filled: the part that grew.
  for (let i = 0; i < Math.min(shown, lateBins.length); i++) {
    const c = BIN_LO + i;
    if (c < threshold) continue;
    const h = lateBins[i] * scale;
    const x = PLOT.x + i * BIN_W;
    r.rect(x, FLOOR - h, Math.max(1, BIN_W - 0.5), h, "rgba(209,73,91,0.55)");
  }
  outline(earlyBins, COLORS.cold, true);
  outline(lateBins, COLORS.hot, false);

  r.text("1961–1990", PLOT.x + 2, PLOT.y - 9, { size: 7, color: COLORS.cold });
  r.text("1996–2025", PLOT.x + 62, PLOT.y - 9, { size: 7, color: COLORS.hot });
  r.text(`${threshold} °C +`, VIEW_W - 26, PLOT.y - 9, { size: 7, color: COLORS.hot, align: "right" });
}
