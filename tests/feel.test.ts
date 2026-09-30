import { describe, expect, it } from "vitest";
import { DERIVED, olsSlope } from "../src/data";
import { cherryValues } from "../src/scenes/cherry";
import { buildPathValues, CELL, PX_PER_DEGREE, xForYear } from "../src/scenes/slide";
import { blendCamera } from "../src/scenes/zoom";
import {
  buildTerrain, DEFAULT_TUNING, FIXED_DT, spawnPlayer, stepPlayer, stepSled, terrainWidth, type PlayerState,
} from "../src/world";

describe("jump feel", () => {
  const flat = buildTerrain({ values: new Array(30).fill(0), cellWidth: 10, valueScale: 1, zeroY: 0 });

  it("reaches the tuned jump height exactly (discrete correction)", () => {
    let p = stepPlayer(spawnPlayer(100, flat), { move: 0, jumpPressed: true, jumpHeld: true }, flat, FIXED_DT);
    let peak = 0;
    for (let i = 0; i < 90; i++) {
      p = stepPlayer(p, { move: 0, jumpPressed: false, jumpHeld: true }, flat, FIXED_DT);
      peak = Math.min(peak, p.y);
    }
    expect(-peak).toBeGreaterThanOrEqual(DEFAULT_TUNING.jumpHeight - 0.5);
    expect(-peak).toBeLessThan(DEFAULT_TUNING.jumpHeight + 2);
  });

  it("allows a jump just after walking off a ledge (coyote time)", () => {
    const ledge = buildTerrain({ values: [30, 30, 30, 0, 0, 0, 0], cellWidth: 10, valueScale: 1, zeroY: 0 });
    let p = spawnPlayer(20, ledge);
    while (p.grounded) p = stepPlayer(p, { move: 1, jumpPressed: false }, ledge, FIXED_DT);
    p = stepPlayer(p, { move: 1, jumpPressed: true, jumpHeld: true }, ledge, FIXED_DT);
    expect(p.justJumped).toBe(true);
  });

  it("buffers a jump pressed just before landing", () => {
    let p = stepPlayer(spawnPlayer(100, flat), { move: 0, jumpPressed: true }, flat, FIXED_DT);
    while (p.vy < 0 || p.y < -8) p = stepPlayer(p, { move: 0, jumpPressed: false }, flat, FIXED_DT);
    p = stepPlayer(p, { move: 0, jumpPressed: true }, flat, FIXED_DT);
    let jumpedAgain = false;
    for (let i = 0; i < 10 && !jumpedAgain; i++) {
      p = stepPlayer(p, { move: 0, jumpPressed: false }, flat, FIXED_DT);
      jumpedAgain = p.justJumped;
    }
    expect(jumpedAgain).toBe(true);
  });
});

describe("the slide", () => {
  const terrain = buildTerrain({ values: buildPathValues(), cellWidth: CELL, valueScale: PX_PER_DEGREE, zeroY: 0, mode: "linear" });

  it("a player pushing left reaches the ice age, and the cliff takes far less time than the ramp", () => {
    let p: PlayerState = spawnPlayer(terrainWidth(terrain) - 6, terrain);
    let t = 0, cliffTime = 0, rampTime = 0;
    const cliffStart = xForYear(1850), rampEnd = xForYear(1950 - 20_000), rampStart = xForYear(1950 - 10_000);
    while (p.x > 12 && t < 60) {
      p = stepSled(p, -1, terrain, FIXED_DT);
      t += FIXED_DT;
      if (p.x > cliffStart) cliffTime += FIXED_DT;
      if (p.x < rampStart && p.x > rampEnd) rampTime += FIXED_DT;
    }
    expect(p.x).toBeLessThanOrEqual(12);
    expect(t).toBeLessThan(40);
    expect(rampTime).toBeGreaterThan(cliffTime * 5);
  });
});

describe("cherry-pick level", () => {
  it("the in-game trend of the chosen window matches the data script", () => {
    const values = cherryValues();
    const first = DERIVED.cherry.start - DERIVED.cherry.searchedFrom;
    const trend = olsSlope(values.slice(first, first + DERIVED.cherry.length)) * 10;
    expect(trend).toBeCloseTo(DERIVED.cherry.trendPerDecade, 2);
    expect(trend).toBeLessThan(0);
    expect(DERIVED.cherry.longTrendPerDecade).toBeGreaterThan(0);
  });
});

describe("zoom blend", () => {
  it("starts and ends on the two cameras", () => {
    const near = { cx: 0, cy: 0, zoomX: 1, zoomY: 1 };
    const far = { cx: 100, cy: 50, zoomX: 0.1, zoomY: 0.5 };
    expect(blendCamera(near, far, 0)).toEqual(near);
    const end = blendCamera(near, far, 1);
    expect(end.cx).toBeCloseTo(100);
    expect(end.zoomY).toBeCloseTo(0.5);
  });
});
