import { describe, expect, it } from "vitest";
import { MARKS } from "../src/chapters";
import {
  CUMULATIVE, cumulativeAt, EMISSIONS, emittedBetween, emittedDuring, FIT, LAST_YEAR, START_YEAR,
  TOTAL_EMITTED, warmingAt, WARMING, yearReaching,
} from "../src/data";
import { depotYears, eraAt, ERAS, PER_YEAR, TRIP_FROM, vehicleAt, xForYear, yearAt } from "../src/road";

describe("the committed series", () => {
  it("covers the same years in all three, with no gaps", () => {
    expect(EMISSIONS).toHaveLength(CUMULATIVE.length);
    expect(WARMING).toHaveLength(CUMULATIVE.length);
    expect(LAST_YEAR - START_YEAR + 1).toBe(EMISSIONS.length);
    for (const v of [...EMISSIONS, ...CUMULATIVE, ...WARMING]) expect(Number.isFinite(v)).toBe(true);
  });

  /*
   * The episode's one claim: the stock only ever rises, whatever the flow does. If
   * cumulative emissions ever fell, the bar at the top of the screen would be
   * telling the reader the opposite of the thing being explained.
   */
  it("never lets the total ever emitted fall, however the annual flow moves", () => {
    for (let i = 1; i < CUMULATIVE.length; i++) {
      expect(CUMULATIVE[i]).toBeGreaterThanOrEqual(CUMULATIVE[i - 1]);
    }
    // And the flow really does fall in places, or there would be nothing to contrast.
    const dips = EMISSIONS.filter((v, i) => i > 0 && v < EMISSIONS[i - 1]).length;
    expect(dips).toBeGreaterThan(10);
  });

  it("agrees with itself about the total", () => {
    expect(cumulativeAt(LAST_YEAR)).toBeCloseTo(TOTAL_EMITTED, 6);
    expect(cumulativeAt(START_YEAR - 50)).toBe(CUMULATIVE[0]);
    expect(cumulativeAt(LAST_YEAR + 50)).toBe(TOTAL_EMITTED);
  });

  /*
   * The era captions print four shares of "everything ever emitted", so they have to
   * be a partition. Built from the inclusive `emittedBetween`, they counted 1880,
   * 1910 and 1960 twice each and summed to 101%.
   */
  it("splits the whole record into eras that add up to exactly all of it", () => {
    const share =
      emittedDuring(1850, 1880).share +
      emittedDuring(1880, 1910).share +
      emittedDuring(1910, 1960).share +
      emittedBetween(1960, LAST_YEAR).share;
    expect(share).toBeCloseTo(1, 6);
  });

  it("counts a boundary year into the era it opens and no other", () => {
    const span = emittedDuring(1880, 1910);
    expect(span.gt).toBeCloseTo(cumulativeAt(1909) - cumulativeAt(1879), 6);
    expect(emittedDuring(1850, 1880).gt + span.gt).toBeCloseTo(cumulativeAt(1909), 6);
  });

  it("finds the year a given total was reached, inside the record", () => {
    const y = yearReaching(1000);
    expect(y).toBeGreaterThan(START_YEAR);
    expect(y).toBeLessThanOrEqual(LAST_YEAR);
    expect(cumulativeAt(y)).toBeGreaterThanOrEqual(1000);
    expect(cumulativeAt(y - 1)).toBeLessThan(1000);
  });

  it("fits warming to the total with a positive slope the credits can quote", () => {
    expect(FIT.slope).toBeGreaterThan(0);
    expect(FIT.r).toBeGreaterThan(0.8);
    expect(warmingAt(LAST_YEAR)).toBeGreaterThan(warmingAt(1850));
  });
});

describe("the road as a timeline", () => {
  it("maps a year to a place and back again", () => {
    for (const year of [1850, 1900, 1976, LAST_YEAR]) {
      expect(yearAt(xForYear(year))).toBeCloseTo(year, 6);
    }
    expect(xForYear(START_YEAR)).toBe(TRIP_FROM);
    expect(xForYear(1851) - xForYear(1850)).toBe(PER_YEAR);
  });

  it("clamps to the record at both ends rather than inventing years", () => {
    expect(yearAt(-500)).toBe(START_YEAR);
    expect(yearAt(xForYear(LAST_YEAR) + 500)).toBe(LAST_YEAR);
  });

  /*
   * Which vehicle you are in is a function of when you are, not of what you have
   * done. Walking back has to put the jet away again, or the road stops being a
   * timeline and becomes a journey with continuity to get wrong.
   */
  it("gives the vehicle back when you walk back, because it is a function of the year", () => {
    const there = vehicleAt(xForYear(1990));
    const back = vehicleAt(xForYear(1870));
    const thereAgain = vehicleAt(xForYear(1990));
    expect(back).not.toBe(there);
    expect(thereAgain).toBe(there);
  });

  it("hands over between eras in order, with a depot at each handover", () => {
    for (let i = 1; i < ERAS.length; i++) expect(ERAS[i].from).toBeGreaterThan(ERAS[i - 1].from);
    expect(eraAt(START_YEAR)).toBe(ERAS[0]);
    expect(eraAt(LAST_YEAR)).toBe(ERAS[ERAS.length - 1]);
    expect(depotYears()).toEqual(ERAS.slice(1).map((e) => e.from));
    for (const year of depotYears()) expect(eraAt(year).from).toBe(year);
  });
});

describe("the captions along it", () => {
  const xs = MARKS.map((m) => (m.atYear !== undefined ? xForYear(m.atYear) : (m.atX as number)));

  it("hangs every mark on a year inside the record, or on a place after it", () => {
    for (const m of MARKS) {
      expect(m.atYear !== undefined || m.atX !== undefined).toBe(true);
      if (m.atYear !== undefined) {
        expect(m.atYear).toBeGreaterThanOrEqual(START_YEAR);
        expect(m.atYear).toBeLessThanOrEqual(LAST_YEAR);
      }
      expect(m.lines.length).toBeGreaterThan(0);
      expect(m.lines.length).toBeLessThanOrEqual(2);
    }
  });

  /*
   * The walk holds still while a caption is being read, so two marks a few pixels
   * apart means stop, a moment of walking, stop again. At 78 px a second nothing
   * here is closer than about two thirds of a second of road.
   */
  it("leaves a stretch of road between consecutive stops", () => {
    const sorted = [...xs].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      expect((sorted[i] - sorted[i - 1]) / 78).toBeGreaterThan(0.65);
    }
  });

  it("is in the order it reads in, so nothing refers back to a mark ahead of it", () => {
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });
});
