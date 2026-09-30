/**
 * Series chrome: the colours every episode's HUD, captions and labels are built
 * from. An episode's own subject colours (terrain, landscape, vehicles) stay with
 * the episode; these are the ones that make two episodes look like one series.
 */
export const UI = {
  /** Body text on a dark ground. */
  ink: "#f2efe6",
  /** Captions, axis labels, anything secondary. */
  dim: "#8a90a6",
  /** The single accent: prompts, the year dial, the thing to look at. */
  gold: "#ffd166",
  /** The warm end of the data, and anything hazardous. */
  hot: "#d1495b",
  /** The cool end of the data. */
  cold: "#4393c3",
  /** Panel fill, its border, and the shadow behind both. */
  plate: "#0d1126",
  plateEdge: "#1b2140",
  shadow: "#05060d",
  /** The default ground behind everything. */
  ground: "#0b1020",
} as const;
