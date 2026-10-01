import { follow, type CameraState } from "./camera";

/**
 * The walk: the series' spine.
 *
 * You hold a direction and move. Nothing happens on its own, you can always go back
 * and re-read, and arriving somewhere is what produces a caption — so the reader
 * sets the pace and a pure panel of controls never has to exist. A reader who has
 * walked one episode knows how to walk any of them.
 *
 * Captions carry a minimum dwell, and anything that arrives during one queues
 * behind it, because a caption that can be walked past before it is read may as
 * well not be there. That was measured in episode 1, where twelve of seventeen
 * were being lost.
 *
 * Lifted out of episode 4 once episodes 2 and 3 wanted it too. It stays
 * deliberately small: it knows about position, captions and a camera, and nothing
 * about terrain, sprites or what any episode is explaining.
 */
export const WALK_SPEED = 62;

export interface Marker {
  /** Where it stands, in world pixels. */
  x: number;
  /** Shown once on arrival; the player may walk back and re-trigger nothing. */
  lines: string[];
  /** Fired when first reached, for whatever the arrival should change. */
  onReach?: () => void;
  fired?: boolean;
}

export interface WalkOptions {
  /** Where the walk begins, in world pixels. */
  x: number;
  /** Camera height, which is an episode's business rather than the walk's. */
  cy: number;
  /** Pixels per second; the default suits a 320x180 view. */
  speed?: number;
  /** How far ahead the view leads in the direction of travel. */
  lookAhead?: number;
}

export interface Walk {
  x: number;
  facing: 1 | -1;
  /** Paces, for the walk cycle. */
  stride: number;
  cam: CameraState;
  caption: string[];
  captionAge: number;
  captionHold: number;
  pending: string[][];
  furthest: number;
  /** True while a direction is held, for the walk cycle. */
  moving: boolean;
  speed: number;
  lookAhead: number;
}

export function newWalk(options: WalkOptions): Walk {
  const { x, cy } = options;
  return {
    x,
    speed: options.speed ?? WALK_SPEED,
    lookAhead: options.lookAhead ?? 48,
    facing: 1,
    stride: 0,
    cam: { cx: x, cy, zoomX: 1, zoomY: 1 },
    caption: [],
    captionAge: 0,
    captionHold: 0,
    pending: [],
    furthest: x,
    moving: false,
  };
}

/** Long enough to read at roughly 200 words a minute, plus a beat to notice it. */
function holdFor(lines: string[]): number {
  const words = lines.join(" ").split(/\s+/).filter(Boolean).length;
  return Math.min(7, 0.4 + 0.3 * words);
}

export function say(w: Walk, lines: string[]): void {
  if (!lines.length) return;
  if (w.caption.length && w.captionAge < w.captionHold) {
    w.pending.push(lines);
    return;
  }
  w.caption = lines;
  w.captionAge = 0;
  w.captionHold = holdFor(lines);
}

export interface WalkInput {
  left: boolean;
  right: boolean;
  /** Advance past a caption that is waiting to be read. */
  next: boolean;
}

export function stepWalk(
  w: Walk, input: WalkInput, dt: number, markers: Marker[], bounds: { min: number; max: number },
): void {
  w.captionAge += dt;

  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  w.moving = dir !== 0;
  if (dir !== 0) {
    w.facing = dir > 0 ? 1 : -1;
    w.x = Math.max(bounds.min, Math.min(bounds.max, w.x + dir * w.speed * dt));
    w.stride += dt * 6;
  }
  w.furthest = Math.max(w.furthest, w.x);

  for (const m of markers) {
    if (m.fired || w.x < m.x) continue;
    m.fired = true;
    m.onReach?.();
    say(w, m.lines);
  }

  if (input.next && w.pending.length) {
    w.caption = [];
    w.captionAge = w.captionHold;
  }
  if (w.pending.length && w.captionAge >= w.captionHold) {
    const nextLines = w.pending.shift();
    if (nextLines) say(w, nextLines);
  }

  // The view leads slightly in the direction of travel, so there is somewhere to go.
  w.cam = follow(w.cam, w.x + w.facing * w.lookAhead, w.cam.cy, dt, 4);
}

/** World x to screen x for this walk's camera, given the view width. */
export function screenX(w: Walk, worldX: number, viewW: number): number {
  return worldX - w.cam.cx + viewW / 2;
}
