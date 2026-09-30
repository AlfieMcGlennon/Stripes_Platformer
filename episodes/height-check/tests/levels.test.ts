import { describe, expect, it } from "vitest";
import { advanceTween, camera, sampleTween, startTween } from "@stripes/engine";
import { DERIVED, GLOBAL, monthlyWindow } from "../src/data";
import { stripeColor, stripePosition } from "../src/render/palette";
import { DEFAULT_TUNING } from "../src/world";
import { fakeHeights, GROWTH_CM_PER_DAY } from "../src/scenes/height";
import { FIRST_YEAR, LAST_YEAR, PX_PER_DEGREE as MONTH_SCALE } from "../src/scenes/months";
import { PX_PER_DEGREE as YEAR_SCALE } from "../src/scenes/stripes";
import { buildPathValues } from "../src/scenes/slide";

/** Biggest upward step between neighbours, in px, at a given scale. */
function maxRise(values: number[], scale: number): number {
  let worst = 0;
  for (let i = 1; i < values.length; i++) worst = Math.max(worst, (values[i] - values[i - 1]) * scale);
  return worst;
}

describe("real data stays playable", () => {
  // The apex is exactly jumpHeight (see feel.test); keep 6 px of margin for mistimed jumps.
  const reachable = DEFAULT_TUNING.jumpHeight - 6;

  it("every month-to-month rise in level 1 is jumpable", () => {
    const months = monthlyWindow(FIRST_YEAR, LAST_YEAR);
    expect(months).toHaveLength((LAST_YEAR - FIRST_YEAR + 1) * 12);
    expect(maxRise(months, MONTH_SCALE)).toBeLessThan(reachable);
  });

  it("every year-to-year rise in level 2 is jumpable", () => {
    expect(maxRise(GLOBAL.annual.values, YEAR_SCALE)).toBeLessThan(reachable);
  });

  it("the slide path runs from ice age to the latest year", () => {
    const path = buildPathValues();
    expect(path[0]).toBeCloseTo(-6.06, 1);
    expect(path[path.length - 1]).toBeCloseTo(DERIVED.lastYearAnomaly);
  });
});

describe("height metaphor", () => {
  it("is noisy day to day but trends over a year", () => {
    const h = fakeHeights(365);
    const drops = h.slice(1).filter((v, i) => v < h[i]).length;
    expect(drops).toBeGreaterThan(100); // plenty of days you "shrink"
    const firstMonth = h.slice(0, 30).reduce((a, b) => a + b) / 30;
    const lastMonth = h.slice(-30).reduce((a, b) => a + b) / 30;
    expect(lastMonth - firstMonth).toBeGreaterThan(300 * GROWTH_CM_PER_DAY * 0.7);
  });
});

describe("palette and camera", () => {
  it("saturates stripe colours outside the range", () => {
    expect(stripePosition(10, 0, 1)).toBe(1);
    expect(stripeColor(-10, 0, 1)).toBe("#053061");
  });

  it("tweens zoom in log space and lands exactly on the target", () => {
    const tw = startTween(camera(0, 0, 1), camera(100, 0, 0.01), 2);
    tw.elapsed = 1;
    expect(sampleTween(tw).zoomX).toBeCloseTo(0.1);
    const end = advanceTween(tw, 5);
    expect(end.cx).toBe(100);
    expect(end.zoomY).toBeCloseTo(0.01);
  });
});
