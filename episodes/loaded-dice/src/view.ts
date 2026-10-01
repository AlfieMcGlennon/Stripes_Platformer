import { PixelRenderer, UI } from "@stripes/engine";

/** 320x180, the series' native view: this episode's art is all data, no objects. */
export const VIEW_W = 320;
export const VIEW_H = 180;

export { UI as COLORS };
export type Renderer = PixelRenderer;

export function createRenderer(canvas: HTMLCanvasElement): PixelRenderer {
  return new PixelRenderer(canvas, { viewW: VIEW_W, viewH: VIEW_H });
}
