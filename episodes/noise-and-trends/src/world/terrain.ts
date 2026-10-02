/**
 * Terrain is a 1D heightfield built straight from a data series, so collision is
 * just "where is the ground at x". World y points down (screen convention), so a
 * warmer value means a smaller y.
 */
export type TerrainMode = "steps" | "linear";

export interface Terrain {
  mode: TerrainMode;
  /** World x of the first sample's left edge. */
  x0: number;
  /** Horizontal width of one sample in world px. */
  cellWidth: number;
  /** Ground top y for each sample. Mutable so levels can morph it. */
  groundY: number[];
}

export interface TerrainSpec {
  values: number[];
  cellWidth: number;
  /** World px per unit of the data (e.g. per degC). */
  valueScale: number;
  /** World y that a value of 0 maps to. */
  zeroY: number;
  mode?: TerrainMode;
  x0?: number;
}

export function buildTerrain(spec: TerrainSpec): Terrain {
  return {
    mode: spec.mode ?? "steps",
    x0: spec.x0 ?? 0,
    cellWidth: spec.cellWidth,
    groundY: spec.values.map((v) => spec.zeroY - v * spec.valueScale),
  };
}

export function terrainWidth(t: Terrain): number {
  // Linear terrain joins sample points, so it has one fewer span than samples.
  const spans = t.mode === "linear" ? t.groundY.length - 1 : t.groundY.length;
  return spans * t.cellWidth;
}

export function cellIndexAt(t: Terrain, x: number): number {
  const i = Math.floor((x - t.x0) / t.cellWidth);
  return Math.max(0, Math.min(t.groundY.length - 1, i));
}

/** Centre x of a cell; handy for placing markers on a given year. */
export function cellCentreX(t: Terrain, index: number): number {
  const offset = t.mode === "linear" ? 0 : 0.5;
  return t.x0 + (index + offset) * t.cellWidth;
}

export function groundAt(t: Terrain, x: number): number {
  if (t.mode === "steps") return t.groundY[cellIndexAt(t, x)];
  const u = (x - t.x0) / t.cellWidth;
  const i = Math.max(0, Math.min(t.groundY.length - 2, Math.floor(u)));
  const f = Math.max(0, Math.min(1, u - i));
  return t.groundY[i] + (t.groundY[i + 1] - t.groundY[i]) * f;
}

/** Highest ground (smallest y) under a horizontal span such as a player's feet. */
export function groundUnder(t: Terrain, left: number, right: number): number {
  let best = Math.min(groundAt(t, left), groundAt(t, right));
  const first = cellIndexAt(t, left) + 1;
  const last = cellIndexAt(t, right);
  // Cells fully inside the span (steps) or vertices inside it (linear) can poke above the edges.
  for (let i = first; i <= last; i++) best = Math.min(best, t.groundY[i]);
  return best;
}

/** Monthly -> annual: each group of `size` cells takes the group's mean. */
export function groupMeans(values: number[], size: number): number[] {
  const means: number[] = [];
  for (let i = 0; i + size <= values.length; i += size) {
    const group = values.slice(i, i + size);
    means.push(group.reduce((a, b) => a + b, 0) / size);
  }
  return means;
}
