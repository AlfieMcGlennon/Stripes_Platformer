import { PixelRenderer, UI } from "@stripes/engine";
import { BIN_HI, BIN_LO } from "./data";

/** 320x180, the series' native view: this episode's art is all data, no objects. */
export const VIEW_W = 320;
export const VIEW_H = 180;

export { UI as COLORS };
export type Renderer = PixelRenderer;

export function createRenderer(canvas: HTMLCanvasElement): PixelRenderer {
  return new PixelRenderer(canvas, { viewW: VIEW_W, viewH: VIEW_H });
}

/**
 * The plot area. The floor sits at 128 so the axis labels clear it and a two-line
 * caption still fits beneath — the caption is where the teaching happens, so it
 * gets the room it needs rather than whatever is left over.
 */
export const PLOT = { x: 26, y: 42, w: VIEW_W - 44, h: 86 };
export const FLOOR = PLOT.y + PLOT.h;

/**
 * Temperature to screen x. The whole episode hangs off this one mapping: a day's
 * horizontal position *is* its temperature, so a pile of days draws the
 * distribution without anyone having to plot it. Phase one exists purely to teach
 * this, by making the player place a day themselves.
 */
export function xFor(celsius: number): number {
  const t = (celsius - BIN_LO) / (BIN_HI - BIN_LO);
  return PLOT.x + Math.max(0, Math.min(1, t)) * PLOT.w;
}

export function celsiusAt(x: number): number {
  const t = (x - PLOT.x) / PLOT.w;
  return BIN_LO + Math.max(0, Math.min(1, t)) * (BIN_HI - BIN_LO);
}

/** Width on screen of one 1 °C bin. */
export const BIN_W = PLOT.w / (BIN_HI - BIN_LO);
