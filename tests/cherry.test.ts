import { describe, expect, it } from "vitest";
import { DERIVED, olsSlope } from "../src/data";
import { cherryValues } from "../src/scenes/cherry";

describe("cherry-pick level", () => {
  const values = cherryValues();
  const first = DERIVED.cherry.start - DERIVED.cherry.searchedFrom;
  const last = DERIVED.cherry.end - DERIVED.cherry.searchedFrom;

  it("the claimed window really slopes down, and one more year flips it", () => {
    expect(olsSlope(values.slice(first, last + 1)) * 10).toBeCloseTo(DERIVED.cherry.trendPerDecade, 2);
    expect(DERIVED.cherry.trendPerDecade).toBeLessThan(0);
    expect(olsSlope(values.slice(first, last + 2)) * 10).toBeCloseTo(DERIVED.cherry.trendPlusOneYear, 2);
    expect(DERIVED.cherry.trendPlusOneYear).toBeGreaterThan(0);
  });
});
