import { PixelRenderer, UI } from "@stripes/engine";

/**
 * 480x270 rather than 320x180: this episode is an instrument panel rather than a
 * landscape — four sliders, a written equation and a skill curve — and that needs
 * room. The engine scales caption text by the view height, so the reading stays the
 * same physical size as every other episode.
 */
export const VIEW_W = 480;
export const VIEW_H = 270;

export { UI as COLORS };
export type Renderer = PixelRenderer;

export function createRenderer(canvas: HTMLCanvasElement): PixelRenderer {
  return new PixelRenderer(canvas, { viewW: VIEW_W, viewH: VIEW_H });
}

/** The little map of the four places, on the left. */
export const MAP = { x: 10, y: 32, w: 124, h: 118 };
/** One slider per predictor, on the right. */
export const SLIDER = { x: 148, y: 36, w: 322, rowH: 18, barX: 252, barW: 180 };
/** Where the equation is written out. */
export const EQUATION = { x: 148, y: 114 };
/** The skill curve. */
export const CURVE = { x: 168, y: 140, w: 296, h: 56 };

/** Skill on the curve's vertical axis. */
export const SKILL_TOP = 0.75;

export function curveX(lead: number, maxLead: number): number {
  return CURVE.x + ((lead - 1) / (maxLead - 1)) * CURVE.w;
}

export function curveY(skill: number): number {
  const t = Math.max(-0.1, Math.min(SKILL_TOP, skill)) / SKILL_TOP;
  return CURVE.y + CURVE.h - t * CURVE.h;
}
