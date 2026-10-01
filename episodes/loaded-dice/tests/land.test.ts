import { describe, expect, it } from "vitest";
import { BEST_SHIFT, BIN_HI, BIN_LO, EARLY_DAYS, EARLY_STATS, LATE_DAYS } from "../src/data";
import { groundFor, heightAt, MAX_H, PER_DEGREE, pushedGround, tempAtX, xForTemp } from "../src/land";
import { FAR_THRESHOLD, THRESHOLD } from "../src/script";

const early = groundFor(EARLY_DAYS);
const late = groundFor(LATE_DAYS);

describe("the ground as a distribution", () => {
  it("puts the busiest bin at full height and nothing above it", () => {
    const heights = [];
    for (let c = BIN_LO; c <= BIN_HI; c += 0.25) heights.push(heightAt(early, c));
    expect(Math.max(...heights)).toBeCloseTo(MAX_H, 6);
  });

  it("is flat ground outside the measured range, with no negative land", () => {
    for (const c of [BIN_LO - 4, BIN_LO - 0.5, BIN_HI + 0.5, BIN_HI + 4]) {
      expect(heightAt(early, c)).toBeGreaterThanOrEqual(0);
      expect(heightAt(early, c)).toBeLessThan(1);
    }
  });

  /*
   * Summer maxima lean warm, so the summit of the ground is about two degrees below
   * the average. A caption that called the average "the top" was standing the reader
   * eight pixels down a slope they had crested two degrees earlier; these two guard
   * the captions that now distinguish the summit from the average.
   */
  it("peaks at the busiest bin, which is the summit the script names", () => {
    let best = BIN_LO;
    for (let c = BIN_LO; c <= BIN_HI; c += 0.1) {
      if (heightAt(early, c) > heightAt(early, best)) best = c;
    }
    expect(best).toBeCloseTo(EARLY_STATS.mode, 1);
    expect(heightAt(early, EARLY_STATS.mode)).toBeCloseTo(MAX_H, 6);
  });

  it("puts the average on the warm side of the summit, as the script says it is", () => {
    expect(EARLY_STATS.mean).toBeGreaterThan(EARLY_STATS.mode);
    expect(heightAt(early, EARLY_STATS.mean)).toBeLessThan(heightAt(early, EARLY_STATS.mode));
  });

  it("maps temperature to world position reversibly", () => {
    for (const c of [BIN_LO, 19.7, THRESHOLD, BIN_HI]) {
      expect(tempAtX(xForTemp(c))).toBeCloseTo(c, 9);
    }
    expect(xForTemp(BIN_LO + 1) - xForTemp(BIN_LO)).toBe(PER_DEGREE);
  });
});

/*
 * The episode's whole claim is that a small shift in the middle is a large change
 * at the hot edge. On a linear height scale the drawing says the opposite: 86px of
 * frame goes to a peak of 384 days, so the fifty days above 28 °C get 5px and
 * their near-doubling is invisible while the busy middle visibly heaves. These are
 * the guards on the root scale that fixes it.
 */
describe("the hot edge is legible, which is the point of the episode", () => {
  it("gives the hot tail ground tall enough to see a change on", () => {
    // Taller than the walker, who is eleven pixels, so it reads as a step.
    expect(heightAt(early, THRESHOLD)).toBeGreaterThan(12);
    expect(heightAt(early, FAR_THRESHOLD)).toBeGreaterThan(4);
  });

  it("moves the hot edge more than the middle between the two periods", () => {
    const atEdge = heightAt(late, THRESHOLD) - heightAt(early, THRESHOLD);
    const atMiddle = heightAt(late, EARLY_STATS.mean) - heightAt(early, EARLY_STATS.mean);
    expect(atEdge).toBeGreaterThan(atMiddle);
  });

  it("raises the tail when the land is pushed, so there is gained ground to show", () => {
    const pushed = pushedGround(BEST_SHIFT.degrees);
    for (const c of [THRESHOLD - 2, THRESHOLD, FAR_THRESHOLD - 2]) {
      expect(heightAt(pushed, c) - heightAt(early, c)).toBeGreaterThan(2);
    }
  });

  it("drops the cold edge when the land is pushed, so the trade is visible too", () => {
    const pushed = pushedGround(BEST_SHIFT.degrees);
    expect(heightAt(early, 15) - heightAt(pushed, 15)).toBeGreaterThan(2);
  });
});
