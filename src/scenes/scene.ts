import {
  advanceTween, camera, easeInOutCubic, fitRect, follow, startTween, tweenDone,
  type CameraState, type CameraTween, type InputFrame,
} from "../core";
import { sfx } from "../core/audio";
import { VIEW_H, VIEW_W, type Renderer } from "../render/renderer";
import {
  cellIndexAt, DEFAULT_TUNING, dustBurst, spawnPlayer, stepPlayer, terrainWidth, updateParticles,
  type Bounds, type Particle, type PhysicsTuning, type PlayerState, type Terrain,
} from "../world";
import { blendCamera } from "./zoom";

export interface Scene {
  update(input: InputFrame, dt: number): void;
  draw(r: Renderer): void;
  readonly done: boolean;
  /** Whether the on-screen zoom button should show (touch devices). */
  readonly zoomAvailable?: boolean;
}

/** A caption that appears when the player crosses x (in the given direction). */
export interface Trigger {
  x: number;
  dir: 1 | -1;
  lines: string[];
  fired?: boolean;
}

/** One step of a scripted sequence. Scripts are plain arrays, so they read like a screenplay. */
export type Beat =
  | { say: string[]; wait?: boolean }
  | { camera: () => CameraState; seconds: number }
  | { pause: number }
  | { run: () => void }
  | { until: () => boolean }
  | { zoom: ZoomBeat };

export interface ZoomBeat {
  prompt: string[];
  target: () => CameraState;
  /** Called every frame with eased progress 0..1 (e.g. to morph terrain). */
  onProgress?: (t: number) => void;
  /** Seconds of holding needed to reach full zoom. */
  seconds?: number;
}

const ZOOM_HINT_AFTER = 6;
const ZOOM_AUTO_AFTER = 20;

/**
 * Shared plumbing for walking levels: physics, x-triggered captions, camera
 * follow, a beat sequencer, and the hold-to-zoom verb.
 */
export abstract class WalkScene implements Scene {
  done = false;
  time = 0;
  player: PlayerState;
  cam: CameraState;
  captionLines: string[] = [];
  controlsEnabled = true;
  particles: Particle[] = [];
  bounds?: Bounds;
  /** Eased zoom-out progress of the current zoom beat, 0..1. */
  zoomProgress = 0;
  protected triggers: Trigger[] = [];
  protected lookAhead = -20;
  private beats: Beat[] = [];
  private beatTimer = 0;
  private tween: CameraTween | null = null;
  private waiting = false;
  private zoomRaw = 0;
  private zoomIdle = 0;
  private zoomBase: CameraState | null = null;
  private restY: number;
  private lastCell = -1;

  constructor(public terrain: Terrain, startX: number, protected tuning: PhysicsTuning = DEFAULT_TUNING) {
    this.player = spawnPlayer(startX, terrain);
    this.restY = this.player.y;
    this.cam = camera(this.clampX(startX, 1), this.player.y + this.lookAhead);
  }

  get waitingForAction(): boolean {
    return this.waiting;
  }

  get zoomAvailable(): boolean {
    const beat = this.beats[0];
    return !!beat && "zoom" in beat;
  }

  /** Replace the running script. */
  play(beats: Beat[]): void {
    this.beats = [...beats];
    this.beatTimer = 0;
    this.waiting = false;
    this.startBeat();
  }

  /** Called per new cell entered; return a value to sonify, or null for silence. */
  protected cellValue(_index: number): number | null {
    return null;
  }

  private startBeat(): void {
    const beat = this.beats[0];
    if (!beat) return;
    this.beatTimer = 0;
    if ("say" in beat) {
      this.setCaption(beat.say);
      this.waiting = beat.wait !== false;
      if (!this.waiting) this.nextBeat();
    } else if ("camera" in beat) {
      this.tween = startTween(this.cam, beat.camera(), beat.seconds);
    } else if ("run" in beat) {
      beat.run();
      this.nextBeat();
    } else if ("zoom" in beat) {
      this.zoomRaw = 0;
      this.zoomIdle = 0;
      this.zoomBase = { ...this.cam };
      this.setCaption(beat.zoom.prompt);
    }
  }

  private nextBeat(): void {
    this.beats.shift();
    this.startBeat();
  }

  setCaption(lines: string[]): void {
    if (lines.join() !== this.captionLines.join() && lines.length) sfx.blip();
    this.captionLines = lines;
  }

  private clampX(x: number, zoom: number): number {
    const halfView = VIEW_W / 2 / zoom;
    const left = Math.max(this.terrain.x0, this.bounds?.min ?? -Infinity) + halfView;
    const right = Math.min(this.terrain.x0 + terrainWidth(this.terrain), this.bounds?.max ?? Infinity) - halfView;
    return left < right ? Math.max(left, Math.min(right, x)) : (left + right) / 2;
  }

  update(input: InputFrame, dt: number): void {
    this.time += dt;
    if (this.waiting) {
      if (input.actionPressed) {
        this.waiting = false;
        this.nextBeat();
      }
      input = { ...input, jumpPressed: false };
    }
    this.updatePlayer(input, dt);
    this.particles = updateParticles(this.particles, dt);

    for (const t of this.triggers) {
      if (!t.fired && (this.player.x - t.x) * t.dir >= 0) {
        t.fired = true;
        this.setCaption(t.lines);
      }
    }
    this.runBeat(input, dt);
    if (!this.tween && !this.zoomBase && this.controlsEnabled) {
      if (this.player.grounded) this.restY = this.player.y;
      const tx = this.clampX(this.player.x + this.player.facing * 12, this.cam.zoomX);
      this.cam = follow(this.cam, tx, this.restY + this.lookAhead, dt, 4);
    }
    this.onUpdate(dt);
  }

  protected updatePlayer(input: InputFrame, dt: number): void {
    const controls = this.controlsEnabled
      ? { move: input.move, jumpPressed: input.jumpPressed, jumpHeld: input.jumpHeld }
      : { move: 0 as const, jumpPressed: false };
    this.player = stepPlayer(this.player, controls, this.terrain, dt, this.tuning, this.bounds);
    if (this.player.justJumped) {
      sfx.jump();
      dustBurst(this.particles, this.player.x, this.player.y, 4);
    }
    if (this.player.justLanded) {
      sfx.land();
      dustBurst(this.particles, this.player.x, this.player.y, 7);
    }
    const cell = cellIndexAt(this.terrain, this.player.x);
    if (cell !== this.lastCell && this.player.grounded) {
      this.lastCell = cell;
      const v = this.cellValue(cell);
      if (v !== null) sfx.step(v);
    }
  }

  private runBeat(input: InputFrame, dt: number): void {
    const beat = this.beats[0];
    if (this.tween) {
      this.cam = advanceTween(this.tween, dt);
      if (tweenDone(this.tween)) {
        this.tween = null;
        this.nextBeat();
      }
      return;
    }
    if (!beat) return;
    this.beatTimer += dt;
    if ("pause" in beat && this.beatTimer >= beat.pause) this.nextBeat();
    else if ("until" in beat && beat.until()) this.nextBeat();
    else if ("zoom" in beat) this.runZoom(beat.zoom, input, dt);
  }

  /** Hold to zoom out; let go and it drifts back in, so the noise returns. */
  private runZoom(z: ZoomBeat, input: InputFrame, dt: number): void {
    const seconds = z.seconds ?? 2.5;
    this.zoomIdle = input.zoomHeld ? 0 : this.zoomIdle + dt;
    const auto = this.beatTimer > ZOOM_AUTO_AFTER;
    if (input.zoomHeld || auto) this.zoomRaw = Math.min(1, this.zoomRaw + dt / seconds);
    else this.zoomRaw = Math.max(0, this.zoomRaw - dt / 1.5);
    if (input.zoomHeld && Math.floor(this.time * 8) !== Math.floor((this.time - dt) * 8)) sfx.zoomTick(this.zoomRaw);
    if (this.zoomIdle > ZOOM_HINT_AFTER && this.zoomRaw === 0) {
      this.captionLines = Math.floor(this.time * 2) % 2 === 0 ? z.prompt : [];
    }
    this.zoomProgress = easeInOutCubic(this.zoomRaw);
    this.cam = blendCamera(this.zoomBase!, z.target(), this.zoomProgress);
    z.onProgress?.(this.zoomProgress);
    if (this.zoomRaw >= 1) {
      this.zoomBase = null;
      sfx.reveal();
      this.nextBeat();
    }
  }

  protected onUpdate(_dt: number): void {}

  abstract draw(r: Renderer): void;

  protected drawCaption(r: Renderer): void {
    r.caption(this.captionLines, this.waiting, this.time);
  }
}

/** Space kept clear at the bottom of the screen for captions during reveals. */
const CAPTION_ROOM = 40;

/** Fit a terrain's full extent on screen, leaving the caption strip free. */
export function revealCamera(t: Terrain, padTop = 30, padBottom = 30, from = 0, to = t.groundY.length): CameraState {
  const slice = t.groundY.slice(from, to);
  const cam = fitRect(
    { left: t.x0 + from * t.cellWidth, right: t.x0 + to * t.cellWidth, top: Math.min(...slice) - padTop, bottom: Math.max(...slice) + padBottom },
    VIEW_W, VIEW_H - CAPTION_ROOM,
  );
  return { ...cam, cy: cam.cy + CAPTION_ROOM / 2 / cam.zoomY };
}
