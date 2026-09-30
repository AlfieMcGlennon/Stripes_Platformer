import { GLOBAL } from "../data";
import { costumeFor, type Costume } from "../render/sprites";

/**
 * What the hero wears, decided by the *trend* rather than by one year.
 *
 * Keying the costume to a single year's temperature would have been livelier, and
 * wrong: it would teach "warm year = sunny day", which is the exact confusion the
 * game exists to undo. So the input is always a multi-decade mean, and the
 * thresholds come from the stripes scale itself rather than being typed in, so
 * they move with the data.
 */
const MILD = GLOBAL.stripes.centre - GLOBAL.stripes.halfRange / 2;
const WARM = GLOBAL.stripes.centre + GLOBAL.stripes.halfRange / 2;

/** Thirty years: the same climate normal the rest of the game uses. */
export const SMOOTH_YEARS = 30;

export function costumeForSmoothed(mean: number): Costume {
  return costumeFor(mean, MILD, WARM);
}

/** Mean of up to `SMOOTH_YEARS` values ending at `index`, clamped to the series. */
export function trailingMean(values: number[], index: number): number {
  const end = Math.max(0, Math.min(values.length - 1, index));
  const window = values.slice(Math.max(0, end - (SMOOTH_YEARS - 1)), end + 1);
  return window.reduce((a, b) => a + b, 0) / window.length;
}
