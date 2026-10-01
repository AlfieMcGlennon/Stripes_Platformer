import { describe, expect, it } from "vitest";
import {
  bestSkill, bestWeights, CLIMATE, horizon, LEADS, PERIOD, SAMPLE, SITES, skillOf,
} from "../src/data";
import { CORRIDOR, CREDITS, HORIZON, PERSISTENCE, USEFUL } from "../src/script";

describe("the shipped statistics", () => {
  it("covers every lead from one day to thirty, fitted on the same sample", () => {
    expect(LEADS.length).toBe(30);
    expect(LEADS[0].lead).toBe(1);
    expect(LEADS[LEADS.length - 1].lead).toBe(30);
    for (const s of LEADS) expect(s.n).toBeGreaterThan(15000);
  });

  it("ships a square, symmetric covariance matrix per lead", () => {
    for (const s of LEADS) {
      expect(s.cxx.length).toBe(SITES.length);
      for (const row of s.cxx) expect(row.length).toBe(SITES.length);
      for (let i = 0; i < SITES.length; i++) {
        for (let j = 0; j < SITES.length; j++) {
          expect(Math.abs(s.cxx[i][j] - s.cxx[j][i])).toBeLessThan(1e-4);
        }
      }
      expect(s.vy).toBeGreaterThan(0);
    }
  });

  it("has real sample days with four readings and an outcome", () => {
    expect(SAMPLE.length).toBeGreaterThan(100);
    for (const d of SAMPLE) {
      expect(d.x.length).toBe(SITES.length);
      expect(d.d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number(d.d.slice(0, 4))).toBeGreaterThanOrEqual(PERIOD.from);
    }
  });
});

describe("skill behaves the way skill has to", () => {
  it("scores zero for ignoring every predictor", () => {
    expect(skillOf([0, 0, 0, 0], 1)).toBeCloseTo(0, 10);
    expect(skillOf([0, 0, 0, 0], 30)).toBeCloseTo(0, 10);
  });

  it("never rates any weighting above the fitted best", () => {
    for (const lead of [1, 3, 7, 14, 30]) {
      const best = bestSkill(lead);
      for (const w of [[1, 0, 0, 0], [0, 1, 0, 0], [0.5, 0.5, 0, 0], [1, 1, 1, 1], [0.25, 0.25, 0.25, 0.25]]) {
        expect(skillOf(w, lead)).toBeLessThanOrEqual(best + 1e-9);
      }
    }
  });

  it("falls as the lead time grows, and keeps falling", () => {
    let previous = Infinity;
    for (const lead of [1, 2, 3, 5, 7, 10, 14, 21, 30]) {
      const v = bestSkill(lead);
      expect(v).toBeLessThan(previous);
      previous = v;
    }
  });
});

describe("the two claims the episode makes", () => {
  it("copying today works tomorrow and is worse than useless by three days", () => {
    expect(skillOf(PERSISTENCE, 1)).toBeGreaterThan(0.4);
    expect(skillOf(PERSISTENCE, 3)).toBeLessThan(0);
  });

  it("holds back: the best weights sum to less than one, and shrink with lead", () => {
    const sum = (lead: number): number => bestWeights(lead).reduce((a, b) => a + b, 0);
    expect(sum(1)).toBeLessThan(1);
    expect(sum(1)).toBeGreaterThan(0.6);
    expect(sum(14)).toBeLessThan(sum(1));
  });

  it("runs out of useful skill inside a fortnight, whatever the weights", () => {
    expect(HORIZON).toBe(horizon(0.05));
    expect(HORIZON).toBeGreaterThan(2);
    expect(HORIZON).toBeLessThan(14);
  });

  it("leans on a distant station more than the local one at two days", () => {
    // Weather arrives from somewhere: this is the surprise the panel is built on.
    const w = bestWeights(2);
    expect(w[3]).toBeGreaterThan(w[0]);
  });

  it("gets a single year about half right and thirty years nearly always", () => {
    const [year, , thirty, since1970] = CLIMATE;
    expect(year.hits / year.total).toBeGreaterThan(0.4);
    expect(year.hits / year.total).toBeLessThan(0.62);
    expect(thirty.hits / thirty.total).toBeGreaterThan(0.75);
    expect(since1970.hits).toBe(since1970.total);
  });
});

/*
 * The horizon is wherever the line is drawn: a looser line puts the post further out.
 * The series' own rule is that a chosen threshold must be said on screen, which is
 * what episode 3 does for its 28 degrees and what this episode did not do for 0.05.
 */
describe("the chosen threshold", () => {
  it("is the line the horizon post actually stands on", () => {
    expect(bestSkill(HORIZON)).toBeLessThan(USEFUL);
    expect(bestSkill(HORIZON - 1)).toBeGreaterThanOrEqual(USEFUL);
  });

  it("is named on screen wherever the horizon is named, not only in the credits", () => {
    const stop = CORRIDOR.find((c) => c.lead === HORIZON);
    expect(stop).toBeDefined();
    const text = stop!.lines.join(" ");
    expect(text).toContain(USEFUL.toFixed(2));
    expect(text.toLowerCase()).toContain("not an official one");
  });

  it("is disclosed in the credits, along with the overlapping-window caveat", () => {
    const credits = CREDITS.join(" ");
    expect(credits).toContain(USEFUL.toFixed(2));
    expect(credits.toLowerCase()).toContain("overlap");
  });

  it("moves if the line moves, which is the thing being disclosed", () => {
    expect(CORRIDOR.map((c) => c.lead)).toContain(HORIZON);
    // A stricter line lands earlier, a looser one later. The collapse does not move:
    // skill falls by more than half between every one of these posts.
    expect(horizon(0.1)).toBeLessThan(HORIZON);
    expect(horizon(0.02)).toBeGreaterThan(HORIZON);
    for (const lead of [1, 2, 3, 5]) {
      expect(bestSkill(lead + 2)).toBeLessThan(bestSkill(lead) * 0.6);
    }
  });
});
