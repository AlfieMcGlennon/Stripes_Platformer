import { PixelRenderer } from "@stripes/engine";

// 480x270 rather than episode 1's 320x180: the same 16:9 shape, but 1.5x the
// linear detail, which is what lets the vehicles and the rider carry real drawing.
// The renderer derives its text unit from that ratio, so captions come out the
// same physical size as episode 1's rather than two thirds of it.
export const VIEW_W = 480;
export const VIEW_H = 270;

export { BODY_FONT, TITLE_FONT } from "@stripes/engine";

/** This episode's UI tokens. The engine owns the data-colour scale and the chrome. */
export const COLORS = {
  ink: "#f2efe6",
  dim: "#8a90a6",
  gold: "#ffd166",
  hot: "#d1495b",
  cold: "#4393c3",
  plate: "#0d1126",
  plateEdge: "#1b2140",
  shadow: "#05060d",
};

/**
 * This episode draws its world with plain canvas calls rather than through terrain
 * helpers, so it has nothing to add to the engine's renderer. It gets a factory
 * rather than an empty subclass.
 */
export type Renderer = PixelRenderer;

export function createRenderer(canvas: HTMLCanvasElement): PixelRenderer {
  return new PixelRenderer(canvas, { viewW: VIEW_W, viewH: VIEW_H });
}
