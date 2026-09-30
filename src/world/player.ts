import { groundUnder, terrainWidth, type Terrain } from "./terrain";

export interface PlayerState {
  /** Centre x of the feet. */
  x: number;
  /** Feet y (world y points down). */
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  facing: 1 | -1;
  /** Seconds since the last jump; drives the squash animation. */
  airTime: number;
}

export interface PlayerControls {
  move: -1 | 0 | 1;
  jumpPressed: boolean;
}

export interface PhysicsTuning {
  runSpeed: number;
  gravity: number;
  jumpHeight: number;
  /** Rises up to this many px are walked over without jumping. */
  stepUp: number;
  /** Drops up to this many px stay "grounded" so slopes don't turn into hops. */
  snapDown: number;
}

export const PLAYER_HALF_WIDTH = 4;
export const PLAYER_HEIGHT = 12;

export const DEFAULT_TUNING: PhysicsTuning = {
  runSpeed: 80,
  gravity: 900,
  jumpHeight: 60,
  stepUp: 3,
  snapDown: 6,
};

export function spawnPlayer(x: number, terrain: Terrain): PlayerState {
  const y = groundUnder(terrain, x - PLAYER_HALF_WIDTH, x + PLAYER_HALF_WIDTH);
  return { x, y, vx: 0, vy: 0, grounded: true, facing: 1, airTime: 0 };
}

function blocked(t: Terrain, x: number, feetY: number, tuning: PhysicsTuning): boolean {
  return groundUnder(t, x - PLAYER_HALF_WIDTH, x + PLAYER_HALF_WIDTH) < feetY - tuning.stepUp;
}

/**
 * One fixed-timestep update. Horizontal motion is swept 1px at a time: at 80px/s
 * that is a couple of checks per tick, and it makes walls exact without any
 * geometry maths.
 */
export function stepPlayer(
  p: PlayerState,
  controls: PlayerControls,
  terrain: Terrain,
  dt: number,
  tuning: PhysicsTuning = DEFAULT_TUNING,
): PlayerState {
  const next = { ...p };
  next.vx = controls.move * tuning.runSpeed;
  if (controls.move !== 0) next.facing = controls.move;

  if (controls.jumpPressed && p.grounded) {
    next.vy = -Math.sqrt(2 * tuning.gravity * tuning.jumpHeight);
    next.grounded = false;
    next.airTime = 0;
  }

  const minX = terrain.x0 + PLAYER_HALF_WIDTH;
  const maxX = terrain.x0 + terrainWidth(terrain) - PLAYER_HALF_WIDTH;
  let remaining = next.vx * dt;
  while (Math.abs(remaining) > 1e-6) {
    const move = Math.sign(remaining) * Math.min(1, Math.abs(remaining));
    const candidate = Math.max(minX, Math.min(maxX, next.x + move));
    if (blocked(terrain, candidate, next.y, tuning)) break;
    next.x = candidate;
    remaining -= move;
    // Walk up small rises immediately so the sweep keeps going.
    const ground = groundUnder(terrain, next.x - PLAYER_HALF_WIDTH, next.x + PLAYER_HALF_WIDTH);
    if (next.grounded && ground < next.y) next.y = ground;
  }

  next.vy += tuning.gravity * dt;
  const ground = groundUnder(terrain, next.x - PLAYER_HALF_WIDTH, next.x + PLAYER_HALF_WIDTH);
  const newY = next.y + next.vy * dt;
  const staysOnSlope = p.grounded && next.vy >= 0 && ground - next.y <= tuning.snapDown;
  if ((next.vy >= 0 && newY >= ground) || staysOnSlope) {
    next.y = ground;
    next.vy = 0;
    next.grounded = true;
  } else {
    next.y = newY;
    next.grounded = false;
    next.airTime += dt;
  }
  return next;
}
