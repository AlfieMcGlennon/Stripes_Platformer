import {
  ditheredSky, drawRidge, drawSprite, drawStars, HERO, lookPalette, lookShirt, screenX,
  stripeColor, type Theme, type Walk,
} from "@stripes/engine";
import { BIN_HI, BIN_LO, histogram, shiftedDays } from "./data";
import { COLORS, VIEW_H, VIEW_W, type Renderer } from "./view";

/**
 * The distribution, as ground you walk over.
 *
 * This is episode 1's trick applied to a distribution instead of a time series:
 * there the terrain height was the temperature, here the horizontal position is the
 * temperature and the height is how many days landed on it, on the root scale
 * `heightAt` explains and the script discloses. So the crowded middle
 * is a hill that takes a while to cross, and the extremes are the thin ground at
 * either end — which is what "rare" feels like underfoot rather than on an axis.
 */
export const SKY: Theme = {
  key: "ld-summer", skyTop: "#1b2450", skyBottom: "#c9a06e", far: "#3a3f66", near: "#272c4a",
  stars: 16, snowline: 0,
};

/** World pixels per degree Celsius. Wide, so a degree is a walk rather than a step. */
export const PER_DEGREE = 46;
/** Where the zero line of the ground sits on screen. */
export const BASE_Y = 150;
/** Tallest the busiest bin is allowed to stand. */
export const MAX_H = 86;
/**
 * The wash over ground the push has added. Gold already means "worth looking at"
 * in this episode, and it is the one tint that reads over the whole stripe scale,
 * which runs from near-white at the middle to dark red at the edge.
 */
const GAINED = "rgba(255,209,102,0.45)";

export function xForTemp(celsius: number): number {
  return (celsius - BIN_LO) * PER_DEGREE;
}

export function tempAtX(worldX: number): number {
  return BIN_LO + worldX / PER_DEGREE;
}

export const WORLD = { min: 0, max: xForTemp(BIN_HI) };

export interface Ground {
  /** Count per 1 °C bin. */
  bins: number[];
  peak: number;
}

export function groundFor(tenths: number[]): Ground {
  const bins = histogram(tenths, BIN_LO, BIN_HI);
  return { bins, peak: Math.max(...bins) };
}

/**
 * Height of the ground at a temperature, interpolated so the walk is smooth.
 *
 * The height is the square root of the share of days, not the share itself. On a
 * linear scale this episode argues against itself: between the two periods the
 * ground at the busy middle rises 10px while the ground at 28 °C rises 6px, so
 * the eye reads "the middle changed more than the edge" — the exact opposite of
 * the point, because 86px of frame is spent on a peak of 384 days and the
 * argument is happening in the 5px where fifty days are.
 *
 * A root scale is the standard repair for a histogram whose tails carry the
 * argument (Tukey's rootogram). The same two changes become 5px and 10px, the
 * right way round. It is still a hill — 86px at the peak against 21px at 28 °C —
 * so "the crowded middle is a climb" survives.
 *
 * The exact counts are on screen in the readout at all times, so the terrain
 * carries the shape and the number carries the quantity. Disclosed on screen on
 * arrival and again in the credits.
 */
export function heightAt(g: Ground, celsius: number): number {
  const i = celsius - BIN_LO - 0.5;
  const lo = Math.floor(i);
  const t = i - lo;
  const at = (k: number): number => (k < 0 || k >= g.bins.length ? 0 : g.bins[k]);
  const count = at(lo) * (1 - t) + at(lo + 1) * t;
  return Math.sqrt(count / g.peak) * MAX_H;
}

export function groundY(g: Ground, celsius: number): number {
  return BASE_Y - heightAt(g, celsius);
}

function binColour(celsius: number): string {
  return stripeColor(celsius, (BIN_LO + BIN_HI) / 2, (BIN_HI - BIN_LO) / 2);
}

export function drawSky(r: Renderer, w: Walk, time: number): void {
  r.px.drawImage(ditheredSky(SKY, VIEW_W, BASE_Y + 12), 0, 0);
  drawStars(r.px, SKY, w.cam.cx, time, VIEW_W, BASE_Y - 40);
  drawRidge(r.px, SKY, "far", w.cam.cx, 0.12, BASE_Y - 74, VIEW_W, 68);
}

/**
 * The ground itself, one screen column at a time, so the silhouette is the
 * distribution exactly rather than a smoothed drawing of it.
 */
export function drawGround(
  r: Renderer, w: Walk, g: Ground, ghost?: Ground, target?: Ground,
): void {
  for (let sx = 0; sx < VIEW_W; sx++) {
    const celsius = tempAtX(w.cam.cx + sx - VIEW_W / 2);
    if (celsius < BIN_LO || celsius > BIN_HI) continue;
    const top = Math.round(groundY(g, celsius));
    r.rect(sx, top, 1, VIEW_H - top, binColour(celsius));
    r.rect(sx, top, 1, 1, "rgba(255,255,255,0.5)");
    /*
     * The measured later landscape, dotted, as the thing the push is aimed at. The
     * episode claims a plain sideways shift reproduces it; without the target drawn
     * there was nothing to land on, and "checking it rather than asserting it" came
     * down to comparing two numbers in the corner. The 35% it does not account for
     * is visible here too, which is the episode's own honesty made physical.
     */
    if (target && sx % 3 === 0) {
      const aim = Math.round(groundY(target, celsius));
      if (aim < BASE_Y) r.rect(sx, aim, 1, 1, COLORS.ink);
    }
    if (!ghost) continue;
    /*
     * Where the ground was before the push. The old surface sits in the sky
     * wherever the land fell and inside the land wherever it rose, and the rise
     * is the half of the story this episode exists for — so the gain is drawn as
     * an area and not as a line. A line of one pixel in a 300-pixel-wide red
     * fill is not something anyone sees.
     */
    const was = Math.round(groundY(ghost, celsius));
    if (was >= top + 1) r.rect(sx, top + 1, 1, was - top, GAINED);
    else if (was <= top - 1) r.rect(sx, was, 1, 1, COLORS.cold);
  }
}

/** A post in the ground at a given temperature. */
export function drawPost(
  r: Renderer, w: Walk, g: Ground, celsius: number, label: string, colour: string, height = 30,
): void {
  const x = Math.round(screenX(w, xForTemp(celsius), VIEW_W));
  if (x < -40 || x > VIEW_W + 40) return;
  const base = Math.round(groundY(g, celsius));
  r.rect(x, base - height, 1, height, colour);
  r.rect(x - 1, base - height - 1, 3, 2, colour);
  r.text(label, x, base - height - 11, { size: 7, color: colour, align: "center" });
}

/** The band holding most days, drawn as two fence posts and a line between them. */
export function drawSpread(r: Renderer, w: Walk, mean: number, sd: number, label: string): void {
  const lo = Math.round(screenX(w, xForTemp(mean - sd), VIEW_W));
  const hi = Math.round(screenX(w, xForTemp(mean + sd), VIEW_W));
  if (hi < -40 || lo > VIEW_W + 40) return;
  const y = BASE_Y - MAX_H - 16;
  r.rect(lo, y, Math.max(1, hi - lo), 1, COLORS.dim);
  r.rect(lo, y - 3, 1, 7, COLORS.dim);
  r.rect(hi, y - 3, 1, 7, COLORS.dim);
  r.text(label, (lo + hi) / 2, y - 11, { size: 7, color: COLORS.dim, align: "center" });
}

export function drawWalker(r: Renderer, w: Walk, g: Ground): void {
  const celsius = tempAtX(w.x);
  const y = groundY(g, celsius);
  const frame = !w.moving ? HERO.stand : Math.floor(w.stride) % 2 === 0 ? HERO.runA : HERO.runB;
  drawSprite(r.px, frame, Math.round(screenX(w, w.x, VIEW_W)) - 5, Math.round(y) - HERO.stand.length, {
    flip: w.facing === -1,
    palette: lookPalette(),
    shirt: lookShirt(),
  });
}

/** The push: the land slides right, carrying every day with it. */
export function pushedGround(degrees: number): Ground {
  return groundFor(shiftedDays(degrees));
}
