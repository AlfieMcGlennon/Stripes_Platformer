import { follow, type CameraState } from "@stripes/engine";
import { VIEW_H, VIEW_W } from "./view";

/**
 * The walk. You hold a direction and move; nothing happens on its own, and you can
 * always go back and re-read. This is episode 1's shape rather than a new one: a
 * reader who has walked one of these knows how to walk this.
 *
 * Captions are hung on world positions rather than on a script, so arriving
 * somewhere is what produces them. They carry a minimum dwell for the same reason
 * episode 1's do: a caption that can be walked past before it is read may as well
 * not exist.
 */
export const GROUND_Y = 150;
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
}

export function newWalk(x: number): Walk {
  return {
    x,
    facing: 1,
    stride: 0,
    cam: { cx: x, cy: GROUND_Y - VIEW_H / 2 + 40, zoomX: 1, zoomY: 1 },
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
    w.x = Math.max(bounds.min, Math.min(bounds.max, w.x + dir * WALK_SPEED * dt));
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
  const target = w.x + w.facing * 48;
  w.cam = follow(w.cam, Math.max(bounds.min + VIEW_W / 2 - 60, target), w.cam.cy, dt, 4);
}

/** World x to screen x for this walk's camera. */
export function screenX(w: Walk, worldX: number): number {
  return worldX - w.cam.cx + VIEW_W / 2;
}
