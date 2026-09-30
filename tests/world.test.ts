import { describe, expect, it } from "vitest";
import {
  buildTerrain, DEFAULT_TUNING, groundAt, groundUnder, groupMeans, spawnPlayer, stepPlayer, terrainWidth,
  type PlayerControls, type PlayerState, type Terrain,
} from "../src/world";

const idle: PlayerControls = { move: 0, jumpPressed: false };
const right: PlayerControls = { move: 1, jumpPressed: false };

function run(p: PlayerState, t: Terrain, controls: PlayerControls, ticks: number): PlayerState {
  for (let i = 0; i < ticks; i++) p = stepPlayer(p, controls, t, 1 / 60);
  return p;
}

describe("terrain", () => {
  const steps = buildTerrain({ values: [0, 1, 0.5], cellWidth: 10, valueScale: 20, zeroY: 100 });

  it("maps warmer values to higher ground (smaller y)", () => {
    expect(groundAt(steps, 5)).toBe(100);
    expect(groundAt(steps, 15)).toBe(80);
    expect(groundAt(steps, 25)).toBe(90);
  });

  it("finds the highest ground under a span", () => {
    expect(groundUnder(steps, 8, 12)).toBe(80);
    expect(groundUnder(steps, 0, 29)).toBe(80);
  });

  it("interpolates linear terrain", () => {
    const lin = buildTerrain({ values: [0, 1], cellWidth: 10, valueScale: 10, zeroY: 0, mode: "linear" });
    expect(groundAt(lin, 5)).toBeCloseTo(-5);
    expect(terrainWidth(lin)).toBe(10);
  });

  it("group means preserve the overall mean", () => {
    const values = Array.from({ length: 24 }, (_, i) => Math.sin(i));
    const means = groupMeans(values, 12);
    expect(means).toHaveLength(2);
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(avg(means)).toBeCloseTo(avg(values));
  });
});

describe("player", () => {
  const flat = buildTerrain({ values: new Array(20).fill(0), cellWidth: 10, valueScale: 1, zeroY: 0 });

  it("rests on the ground", () => {
    const p = run(spawnPlayer(50, flat), flat, idle, 60);
    expect(p.y).toBe(0);
    expect(p.grounded).toBe(true);
  });

  it("jumps to roughly the tuned height", () => {
    let p = stepPlayer(spawnPlayer(50, flat), { move: 0, jumpPressed: true }, flat, 1 / 60);
    let peak = p.y;
    for (let i = 0; i < 120; i++) {
      p = stepPlayer(p, idle, flat, 1 / 60);
      peak = Math.min(peak, p.y);
    }
    expect(-peak).toBeGreaterThan(DEFAULT_TUNING.jumpHeight * 0.9);
    expect(p.grounded).toBe(true);
  });

  it("is stopped by a wall taller than stepUp", () => {
    const wall = buildTerrain({ values: [0, 0, 0, 40, 40], cellWidth: 10, valueScale: 1, zeroY: 0 });
    const p = run(spawnPlayer(5, wall), wall, right, 120);
    expect(p.x).toBeLessThanOrEqual(26);
    expect(p.y).toBe(0);
  });

  it("walks over small rises", () => {
    const bump = buildTerrain({ values: [0, 0, 2, 2, 2], cellWidth: 10, valueScale: 1, zeroY: 0 });
    const p = run(spawnPlayer(5, bump), bump, right, 120);
    expect(p.x).toBeGreaterThan(40);
    expect(p.y).toBe(-2);
  });

  it("can jump onto a ledge within jump height", () => {
    const ledge = buildTerrain({ values: [0, 0, 0, 50, 50, 50], cellWidth: 10, valueScale: 1, zeroY: 0 });
    let p = run(spawnPlayer(5, ledge), ledge, right, 20);
    p = stepPlayer(p, { move: 1, jumpPressed: true }, ledge, 1 / 60);
    p = run(p, ledge, right, 90);
    expect(p.y).toBe(-50);
  });
});
