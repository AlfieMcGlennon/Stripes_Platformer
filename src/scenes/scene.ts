import {
  advanceTween, camera, fitRect, follow, startTween, tweenDone,
  type CameraState, type CameraTween, type InputFrame,
} from "../core";
import { VIEW_H, VIEW_W, type Renderer } from "../render/renderer";
import { DEFAULT_TUNING, spawnPlayer, stepPlayer, terrainWidth, type PhysicsTuning, type PlayerState, type Terrain } from "../world";

export interface Scene {
  update(input: InputFrame, dt: number): void;
  draw(r: Renderer): void;
  readonly done: boolean;
}

/** A caption that appears when the player crosses x (in the given direction). */
export interface Trigger {
  x: number;
  dir: 1 | -1;
  lines: string[];
  fired?: boolean;
}

/**
 * Shared plumbing for walking levels: player physics, x-triggered captions,
 * camera follow, and scripted "wait for continue" / camera-tween beats.
 * Subclasses script their ending and draw their own world.
 */
export abstract class WalkScene implements Scene {
  done = false;
  time = 0;
  player: PlayerState;
  cam: CameraState;
  captionLines: string[] = [];
  controlsEnabled = true;
  protected triggers: Trigger[] = [];
  private tween: CameraTween | null = null;
  private afterTween?: () => void;
  private afterAction?: () => void;
  /** Camera centre sits this far from the player's feet (negative = above). */
  protected lookAhead = -15;
  private restY: number;

  constructor(public terrain: Terrain, startX: number, protected tuning: PhysicsTuning = DEFAULT_TUNING) {
    this.player = spawnPlayer(startX, terrain);
    this.restY = this.player.y;
    this.cam = camera(this.player.x, this.player.y + this.lookAhead);
  }

  get waitingForAction(): boolean {
    return this.afterAction !== undefined;
  }

  /** Show a caption; with `then`, wait for the continue button before calling it. */
  say(lines: string[], then?: () => void): void {
    this.captionLines = lines;
    this.afterAction = then;
  }

  moveCamera(to: CameraState, seconds: number, then?: () => void): void {
    this.tween = startTween(this.cam, to, seconds);
    this.afterTween = then;
  }

  update(input: InputFrame, dt: number): void {
    this.time += dt;
    if (this.afterAction && input.actionPressed) {
      const next = this.afterAction;
      this.afterAction = undefined;
      next();
      return;
    }
    const controls = this.controlsEnabled
      ? { move: input.move, jumpPressed: input.jumpPressed }
      : { move: 0 as const, jumpPressed: false };
    this.player = stepPlayer(this.player, controls, this.terrain, dt, this.tuning);

    for (const t of this.triggers) {
      if (!t.fired && (this.player.x - t.x) * t.dir >= 0) {
        t.fired = true;
        this.captionLines = t.lines;
      }
    }

    if (this.tween) {
      this.cam = advanceTween(this.tween, dt);
      if (tweenDone(this.tween)) {
        this.tween = null;
        const next = this.afterTween;
        this.afterTween = undefined;
        next?.();
      }
    } else if (this.controlsEnabled) {
      // Track the last standing height, not the jump arc, so the view doesn't bounce.
      if (this.player.grounded) this.restY = this.player.y;
      const halfView = VIEW_W / 2 / this.cam.zoomX;
      const left = this.terrain.x0 + halfView;
      const right = this.terrain.x0 + terrainWidth(this.terrain) - halfView;
      const tx = left < right ? Math.max(left, Math.min(right, this.player.x)) : (left + right) / 2;
      this.cam = follow(this.cam, tx, this.restY + this.lookAhead, dt, 5);
    }
    this.onUpdate(dt);
  }

  protected onUpdate(_dt: number): void {}

  abstract draw(r: Renderer): void;

  protected drawCaption(r: Renderer): void {
    r.caption(this.captionLines, this.waitingForAction, this.time);
  }
}

/** Space kept clear at the bottom of the screen for captions during reveals. */
const CAPTION_ROOM = 40;

/** Fit a terrain's full extent on screen, leaving the caption strip free. */
export function revealCamera(t: Terrain, padTop = 30, padBottom = 30): CameraState {
  const cam = fitRect(
    { left: t.x0, right: t.x0 + terrainWidth(t), top: Math.min(...t.groundY) - padTop, bottom: Math.max(...t.groundY) + padBottom },
    VIEW_W, VIEW_H - CAPTION_ROOM,
  );
  return { ...cam, cy: cam.cy + CAPTION_ROOM / 2 / cam.zoomY };
}
