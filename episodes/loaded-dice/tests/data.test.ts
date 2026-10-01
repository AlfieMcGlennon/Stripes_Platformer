import { describe, expect, it } from "vitest";
import {
  BIN_HI, BIN_LO, EARLY, EARLY_DAYS, EARLY_STATS, histogram, HOTTEST, LATE, LATE_DAYS, LATE_STATS,
  ratioAt, SAMPLE_SUMMER, SAMPLE_YEAR, SHIFT,
} from "../src/data";
import { FAR_THRESHOLD, readout, smallCounts, THRESHOLD } from "../src/script";

describe("the two normals", () => {
  it("are equal-length thirty-year periods, so the comparison is like-for-like", () => {
    expect(EARLY.to - EARLY.from).toBe(29);
    expect(LATE.to - LATE.from).toBe(29);
    expect(EARLY_DAYS.length).toBe(LATE_DAYS.length);
    expect(EARLY_DAYS.length).toBe(30 * 92); // June, July and August
  });

  it("hold plausible summer maxima, with no sentinel values", () => {
    for (const days of [EARLY_DAYS, LATE_DAYS]) {
      const min = Math.min(...days) / 10;
      const max = Math.max(...days) / 10;
      expect(min).toBeGreaterThan(2);
      expect(max).toBeLessThan(45);
    }
  });
});

describe("the claim the episode makes", () => {
  it("shifted the mean by about a degree, which is a fraction of the spread", () => {
    expect(SHIFT.degrees).toBeGreaterThan(0.5);
    expect(SHIFT.degrees).toBeLessThan(2);
    // The whole point: the shift is small compared with the variation already there.
    expect(SHIFT.sds).toBeLessThan(0.5);
  });

  it("multiplies the hot tail by more than it shifts the middle", () => {
    const ratio = ratioAt(THRESHOLD);
    expect(ratio).toBeGreaterThan(1.3);
    // A mean that moved 5% cannot be what a tail that moved 80% is reporting.
    expect(ratio).toBeGreaterThan(SHIFT.degrees / EARLY_STATS.mean + 1);
  });

  it("multiplies further out by more than it does nearer the middle", () => {
    expect(ratioAt(FAR_THRESHOLD)).toBeGreaterThan(ratioAt(25));
  });

  it("reports the later period as the warmer one", () => {
    expect(LATE_STATS.mean).toBeGreaterThan(EARLY_STATS.mean);
    expect(LATE_STATS.perSummer(THRESHOLD)).toBeGreaterThan(EARLY_STATS.perSummer(THRESHOLD));
  });
});

describe("drawing helpers", () => {
  it("bins every day inside the drawn range", () => {
    const bins = histogram(EARLY_DAYS, BIN_LO, BIN_HI);
    const inRange = EARLY_DAYS.filter((t) => t / 10 >= BIN_LO && t / 10 < BIN_HI).length;
    expect(bins.reduce((a, b) => a + b, 0)).toBe(inRange);
    // Nothing should fall outside: if it does, the axis is too narrow for the data.
    expect(inRange).toBe(EARLY_DAYS.length);
  });

  it("knows the hottest day in the whole daily record", () => {
    expect(HOTTEST.value).toBeGreaterThan(Math.max(...LATE_DAYS) / 10 - 0.01);
  });
});

describe("the dated sample summer", () => {
  it("is a whole June-to-August summer with real dates", () => {
    expect(SAMPLE_SUMMER.length).toBe(92);
    expect(SAMPLE_SUMMER[0].l).toContain(String(SAMPLE_YEAR));
    for (const d of SAMPLE_SUMMER) {
      expect(d.v / 10).toBeGreaterThan(2);
      expect(d.v / 10).toBeLessThan(45);
      expect(d.l).toMatch(/^\d{1,2} (June|July|Aug) \d{4}$/);
    }
  });

  it("sits inside the earlier period, so using it is honest rather than convenient", () => {
    expect(SAMPLE_YEAR).toBeGreaterThanOrEqual(EARLY.from);
    expect(SAMPLE_YEAR).toBeLessThanOrEqual(EARLY.to);
  });

  it("was a hot summer even by today's standards, which is why people cite it", () => {
    const mean = SAMPLE_SUMMER.reduce((a, d) => a + d.v, 0) / SAMPLE_SUMMER.length / 10;
    expect(mean).toBeGreaterThan(LATE_STATS.mean);
  });
});

describe("the threshold readout the player drags", () => {
  it("reports more days now than then, wherever the line sits in the tail", () => {
    for (const t of [24, 26, 28, 30]) {
      expect(LATE_STATS.perSummer(t)).toBeGreaterThanOrEqual(EARLY_STATS.perSummer(t));
    }
  });

  it("warns about small counts only once the counts really are small", () => {
    expect(smallCounts(22)).toBeNull();
    expect(smallCounts(33)).toContain("small numbers");
  });

  it("formats a readout with both periods and a multiple", () => {
    const line = readout(28);
    expect(line).toContain("→");
    expect(line).toMatch(/\d\.\d×/);
  });
});
