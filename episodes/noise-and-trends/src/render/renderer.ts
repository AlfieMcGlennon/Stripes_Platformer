import { PixelRenderer, shade, type CameraState } from "@stripes/engine";
import type { Particle, PlayerState, Terrain } from "../world";
import { drawParticles, drawPlayer } from "./actors";
import { drawLine, drawSlope, drawStepOutline, drawSteps } from "./terrainDraw";
import { drawTouchButtons } from "./touch";

export const VIEW_W = 320;
export const VIEW_H = 180;
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
    super(canvas, { viewW: VIEW_W, viewH: VIEW_H });
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
