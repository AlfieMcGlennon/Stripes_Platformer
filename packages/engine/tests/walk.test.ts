import { beforeEach, describe, expect, it } from "vitest";
import { newWalk, screenX, stepWalk, type Marker, type Walk } from "../src/walk";

const STEP = 1 / 60;
const BOUNDS = { min: 0, max: 1000 };
const STILL = { left: false, right: false, next: false };
const GOING = { left: false, right: true, next: false };

/** Run frames until `done`, or give up, so a broken hold fails instead of hanging. */
function run(w: Walk, markers: Marker[], input = GOING, frames = 600): number {
  let n = 0;
  while (n < frames) {
    stepWalk(w, input, STEP, markers, BOUNDS);
    n++;
  }
  return n;
}

function markersAt(...xs: number[]): Marker[] {
  return xs.map((x) => ({ x, lines: [`you are at ${x}`] }));
}

describe("the walk", () => {
  let w: Walk;
  beforeEach(() => {
    w = newWalk({ x: 90, cy: 0, speed: 60 });
  });

  it("moves only while a direction is held, and stays inside its bounds", () => {
    stepWalk(w, STILL, STEP, [], BOUNDS);
    expect(w.x).toBe(90);
    expect(w.moving).toBe(false);

    stepWalk(w, GOING, STEP, [], BOUNDS);
    expect(w.x).toBeCloseTo(91, 6);
    expect(w.moving).toBe(true);

    run(w, [], { left: true, right: false, next: false });
    expect(w.x).toBe(BOUNDS.min);
  });

  it("produces a caption on arrival, and fires each marker exactly once", () => {
    let reached = 0;
    const markers: Marker[] = [{ x: 100, lines: ["here"], onReach: () => reached++ }];
    run(w, markers, GOING, 60);
    expect(w.caption).toEqual(["here"]);
    expect(reached).toBe(1);

    // Walking back over it and returning says nothing new.
    run(w, markers, { left: true, right: false, next: false }, 120);
    run(w, markers, GOING, 120);
    expect(reached).toBe(1);
  });

  /*
   * The hold is the property that makes a caption describe where you are standing.
   * Without it a reader holding a direction walks past the next markers while the
   * first caption is still up, and then reads a backlog about ground they left.
   */
  it("holds the reader still for as long as the caption takes to read", () => {
    const markers = markersAt(100);
    run(w, markers, GOING, 60);
    expect(w.held).toBe(true);

    const stopped = w.x;
    run(w, markers, GOING, 30); // half a second of holding the key
    expect(w.x).toBe(stopped);
    expect(w.moving).toBe(false);
  });

  it("lets go when the dwell has run, without anyone pressing anything", () => {
    const markers = markersAt(100);
    run(w, markers, GOING, 60);
    const stopped = w.x;
    run(w, markers, GOING, 8 * 60); // longer than the longest dwell
    expect(w.held).toBe(false);
    expect(w.x).toBeGreaterThan(stopped);
  });

  it("releases immediately on the read key, so nobody waits out a line they have read", () => {
    const markers = markersAt(100);
    run(w, markers, GOING, 60);
    const stopped = w.x;

    stepWalk(w, { left: false, right: true, next: true }, STEP, markers, BOUNDS);
    expect(w.held).toBe(false);
    stepWalk(w, GOING, STEP, markers, BOUNDS);
    expect(w.x).toBeGreaterThan(stopped);
  });

  it("stays put indefinitely once the key is released, however long that is", () => {
    const markers = markersAt(100);
    run(w, markers, GOING, 60);
    const stopped = w.x;
    run(w, markers, STILL, 30 * 60);
    expect(w.x).toBe(stopped);
  });

  /*
   * The backlog this replaced: markers a second apart used to queue three deep, so
   * the caption on screen described somewhere the reader had already left.
   */
  it("never builds a backlog from markers a short walk apart", () => {
    const markers = markersAt(100, 160, 220);
    for (let i = 0; i < 3; i++) {
      run(w, markers, GOING, 8 * 60);
      expect(w.pending).toHaveLength(0);
    }
    expect(w.caption).toEqual(["you are at 220"]);
  });

  it("queues rather than overwrites when two markers sit within one frame of travel", () => {
    // One pixel a frame at this speed, so the tenth frame crosses both of these.
    const markers = markersAt(99.5, 100);
    run(w, markers, GOING, 60);
    expect(w.caption).toEqual(["you are at 99.5"]);
    expect(w.pending).toEqual([["you are at 100"]]);

    // And the queued one is shown rather than lost, which is what the queue is for.
    run(w, markers, GOING, 8 * 60);
    expect(w.pending).toHaveLength(0);
    expect(w.caption).toEqual(["you are at 100"]);
  });

  it("remembers the furthest point reached, not the current one", () => {
    run(w, [], GOING, 60);
    const far = w.x;
    run(w, [], { left: true, right: false, next: false }, 30);
    expect(w.x).toBeLessThan(far);
    expect(w.furthest).toBeCloseTo(far, 6);
  });

  it("places the walker's own position at the centre of the view", () => {
    // The camera leads, so this holds once it has settled rather than on frame one.
    run(w, [], STILL, 300);
    expect(screenX(w, w.cam.cx, 320)).toBe(160);
  });
});
