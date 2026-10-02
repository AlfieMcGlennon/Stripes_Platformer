import { PixelRenderer, shade, type CameraState } from "@stripes/engine";
import type { Particle, PlayerState, Terrain } from "../world";
import { drawParticles, drawPlayer } from "./actors";
import { drawLine, drawSlope, drawStepOutline, drawSteps } from "./terrainDraw";
import { drawTouchButtons } from "./touch";

/*
 * Two view profiles, picked once at boot from the viewport's shape.
 *
 * The scale is always a whole number, so on a portrait phone a 320-wide view is
 * pinned by width: 320 into about 780 device pixels gives a scale of 2, a 640x360
 * band using a sixth of the screen, and captions at roughly 8 CSS pixels. Going
 * narrower lets a bigger whole number fit, which makes the art and the text bigger
 * at the same time. The cost is seeing less of the world at once, which a
 * side-scroller can afford because the camera follows you.
 *
 * 200x440 is close to a modern phone's own 0.46 aspect, so there is little
 * letterboxing left: about 60% of an iPhone 13's screen, 93% of a Pixel 7's.
 */
const LANDSCAPE = { w: 320, h: 180 };
const PORTRAIT = { w: 200, h: 440 };

/** True when the viewport is clearly taller than it is wide. */
export function wantsPortrait(): boolean {
  if (typeof window === "undefined") return false;
  const w = window.visualViewport?.width ?? window.innerWidth;
  const h = window.visualViewport?.height ?? window.innerHeight;
  return h > w * 1.1;
}

const VIEW = wantsPortrait() ? PORTRAIT : LANDSCAPE;
export const VIEW_W = VIEW.w;
export const VIEW_H = VIEW.h;
export const PORTRAIT_VIEW = VIEW === PORTRAIT;
export { BODY_FONT, TITLE_FONT, type TextOptions } from "@stripes/engine";

/**
 * Noise and Trends's renderer: the engine's pixel renderer plus the draw calls that
 * only make sense in a platformer built on a temperature series.
 *
 * Everything generic — canvas sizing, integer scaling, outlined text, the caption
 * panel, the aria-live mirror, the text-size control — lives in the engine, so
 * episode 2 gets it without a copy.
 */
export class Renderer extends PixelRenderer {
  constructor(canvas: HTMLCanvasElement) {
    // textUnit 1 in both profiles: it exists to keep text the same physical size
    // across episodes of different view heights, and here the bigger scale is
    // already doing that job. Deriving it from viewH would double the text twice.
    super(canvas, { viewW: VIEW_W, viewH: VIEW_H, textUnit: 1 });
  }

  steps(
    t: Terrain, cam: CameraState, fill: (i: number) => string,
    opts: { edge?: string; alpha?: (i: number) => number } = {},
  ): void {
    drawSteps(this.px, t, cam, fill, opts);
  }

  slope(
    t: Terrain, cam: CameraState, colorAt: (worldX: number) => string, edgeAt?: (worldX: number) => string,
  ): void {
    drawSlope(this.px, t, cam, colorAt, edgeAt);
  }

  stepOutline(t: Terrain, cam: CameraState, color: string): void {
    drawStepOutline(this.px, t, cam, color);
  }

  player(
    p: PlayerState, cam: CameraState, time: number, opts: { highlight?: boolean; sled?: boolean } = {},
  ): void {
    drawPlayer(this.px, p, cam, time, opts);
  }

  line(x0: number, y0: number, x1: number, y1: number, color: string, thickness = 1, outlined = true): void {
    drawLine(this.px, x0, y0, x1, y1, color, thickness, outlined);
  }

  particles(list: Particle[], cam: CameraState): void {
    drawParticles(this.px, list, cam);
  }

  touchButtons(showZoom: boolean): void {
    drawTouchButtons(this.px, showZoom);
  }
}

export { shade };
