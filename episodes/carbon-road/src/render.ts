import { PixelRenderer } from "@stripes/engine";

// 480x270 rather than episode 1's 320x180: the same 16:9 shape, but 1.5x the
// linear detail, which is what lets the vehicles and the rider carry real drawing.
export const VIEW_W = 480;
export const VIEW_H = 270;

export { BODY_FONT, TITLE_FONT } from "@stripes/engine";

/** This episode's UI tokens. The engine owns the data-colour scale, not these. */
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
 * Carbon Road's renderer is the engine's, configured. There is nothing to add:
 * this episode draws its world with plain canvas calls rather than through
 * terrain helpers, so it needs no subclass of its own.
 */
export class Renderer extends PixelRenderer {
  constructor(canvas: HTMLCanvasElement) {
    super(canvas, {
      viewW: VIEW_W,
      viewH: VIEW_H,
      background: "#0b1020",
      textOutline: COLORS.shadow,
      caption: {
        shadow: COLORS.shadow,
        border: COLORS.plateEdge,
        fill: COLORS.plate,
        text: COLORS.ink,
        prompt: COLORS.gold,
      },
      // Shared key: the text size a player picks carries between episodes.
      textScaleKey: "heightcheck.textScale",
    });
  }
}
