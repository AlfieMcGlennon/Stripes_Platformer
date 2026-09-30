import { groundAt, terrainWidth, type Terrain } from "./terrain";
import type { PlayerState } from "./player";

/**
 * Sled physics for the slide level: the player is glued to a smooth
 * heightfield and gravity pulls along the slope. Steepness becomes speed, so
 * the modern cliff is felt as a sudden drop and the ice-age ramp as a long ride.
 */
export interface SledTuning {
  gravity: number;
  /** Linear drag, per second. Sets terminal speed on a given slope. */
  friction: number;
  /** Acceleration from the player pushing. */
  push: number;
  maxSpeed: number;
}

export const SLED_TUNING: SledTuning = { gravity: 900, friction: 0.55, push: 170, maxSpeed: 420 };

export function slopeAt(t: Terrain, x: number, h = 1): number {
  return (groundAt(t, x + h) - groundAt(t, x - h)) / (2 * h);
}

export function stepSled(p: PlayerState, move: -1 | 0 | 1, t: Terrain, dt: number, tuning = SLED_TUNING): PlayerState {
  const next: PlayerState = { ...p, justLanded: false, justJumped: false };
  const s = slopeAt(t, p.x);
  // World y points down, so a positive slope means the ground falls to the right.
  const along = (tuning.gravity * s) / (1 + s * s);
  next.vx += (along + move * tuning.push - tuning.friction * p.vx) * dt;
  next.vx = Math.max(-tuning.maxSpeed, Math.min(tuning.maxSpeed, next.vx));
  const minX = t.x0 + 4;
  const maxX = t.x0 + terrainWidth(t) - 4;
  next.x = Math.max(minX, Math.min(maxX, p.x + next.vx * dt));
  if (next.x === minX || next.x === maxX) next.vx = 0;
  next.y = groundAt(t, next.x);
  next.vy = 0;
  next.grounded = true;
  if (Math.abs(next.vx) > 5) next.facing = next.vx > 0 ? 1 : -1;
  next.stride += Math.abs(next.x - p.x);
  return next;
}
