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
  /** Seconds since last on the ground (coyote time) or since the jump. */
  airTime: number;
  /** Seconds left on a buffered jump press. */
  jumpBuffer: number;
  /** Distance walked, drives the run animation. */
  stride: number;
  /** True on the tick the player touched down; for sfx and dust. */
  justLanded: boolean;
  justJumped: boolean;
}

export interface PlayerControls {
  move: -1 | 0 | 1;
  jumpPressed: boolean;
  jumpHeld?: boolean;
}

export interface PhysicsTuning {
  runSpeed: number;
  gravity: number;
  jumpHeight: number;
  /** Rises up to this many px are walked over without jumping. */
  stepUp: number;
  /** Drops up to this many px stay "grounded" so slopes don't turn into hops. */
  snapDown: number;
  /** Grace period to jump after walking off an edge. */
  coyoteTime: number;
  /** A jump pressed this long before landing still fires. */
  bufferTime: number;
}

export interface Bounds {
  min: number;
  max: number;
}

export const PLAYER_HALF_WIDTH = 4;
export const PLAYER_HEIGHT = 14;
export const FIXED_DT = 1 / 60;

export const DEFAULT_TUNING: PhysicsTuning = {
  runSpeed: 84,
  gravity: 900,
  jumpHeight: 60,
  stepUp: 3,
  snapDown: 6,
  coyoteTime: 0.1,
  bufferTime: 0.12,
};

/**
 * Launch speed that reaches exactly `height` under our integrator. The textbook
 * sqrt(2gh) undershoots by ~v*dt/2 with semi-implicit Euler at 60 Hz.
 */
export function jumpSpeed(gravity: number, height: number, dt = FIXED_DT): number {
  return (gravity * dt + Math.sqrt(gravity * gravity * dt * dt + 8 * gravity * height)) / 2;
}

export function spawnPlayer(x: number, terrain: Terrain): PlayerState {
  const y = groundUnder(terrain, x - PLAYER_HALF_WIDTH, x + PLAYER_HALF_WIDTH);
  return { x, y, vx: 0, vy: 0, grounded: true, facing: 1, airTime: 0, jumpBuffer: 0, stride: 0, justLanded: false, justJumped: false };
}

function groundBelow(t: Terrain, x: number): number {
  return groundUnder(t, x - PLAYER_HALF_WIDTH, x + PLAYER_HALF_WIDTH);
}

/**
 * One fixed-timestep update. Horizontal motion is swept 1px at a time, which
 * makes walls exact without any geometry maths.
 */
export function stepPlayer(
  p: PlayerState,
  controls: PlayerControls,
  terrain: Terrain,
  dt: number,
  tuning: PhysicsTuning = DEFAULT_TUNING,
  bounds?: Bounds,
): PlayerState {
  const next: PlayerState = { ...p, justLanded: false, justJumped: false };
  next.vx = controls.move * tuning.runSpeed;
  if (controls.move !== 0) next.facing = controls.move;
  next.jumpBuffer = controls.jumpPressed ? tuning.bufferTime : Math.max(0, p.jumpBuffer - dt);

  const canJump = p.grounded || (p.vy >= 0 && p.airTime < tuning.coyoteTime);
  if (next.jumpBuffer > 0 && canJump) {
    next.vy = -jumpSpeed(tuning.gravity, tuning.jumpHeight, dt);
    next.grounded = false;
    next.airTime = tuning.coyoteTime; // no double jump from coyote time
    next.jumpBuffer = 0;
    next.justJumped = true;
  }
  // No variable jump height on purpose: the real-data steps need a full jump,
  // and a quick tap must clear them (a tap-to-hop cut made level 1 feel broken).

  const minX = Math.max(terrain.x0, bounds?.min ?? -Infinity) + PLAYER_HALF_WIDTH;
  const maxX = Math.min(terrain.x0 + terrainWidth(terrain), bounds?.max ?? Infinity) - PLAYER_HALF_WIDTH;
  let remaining = next.vx * dt;
  while (Math.abs(remaining) > 1e-6) {
    const move = Math.sign(remaining) * Math.min(1, Math.abs(remaining));
    const candidate = Math.max(minX, Math.min(maxX, next.x + move));
    if (groundBelow(terrain, candidate) < next.y - tuning.stepUp) break;
    next.stride += Math.abs(candidate - next.x);
    next.x = candidate;
    remaining -= move;
    const ground = groundBelow(terrain, next.x);
    if (next.grounded && ground < next.y) next.y = ground;
    if (candidate === minX || candidate === maxX) break;
  }

  next.vy += tuning.gravity * dt;
  const ground = groundBelow(terrain, next.x);
  const newY = next.y + next.vy * dt;
  const staysOnSlope = p.grounded && next.vy >= 0 && ground - next.y <= tuning.snapDown;
  if ((next.vy >= 0 && newY >= ground) || staysOnSlope) {
    next.justLanded = !p.grounded && p.airTime > 0.15;
    next.y = ground;
    next.vy = 0;
    next.grounded = true;
    next.airTime = 0;
  } else {
    next.y = newY;
    next.grounded = false;
    next.airTime += dt;
  }
  return next;
}
