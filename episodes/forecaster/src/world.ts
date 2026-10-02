import {
  ditheredSky, drawRidge, drawSprite, drawStars, lookFrames, lookPalette, lookShirt, screenX,
  SPRITE_H, type Theme, type Walk,
} from "@stripes/engine";
import { bestSkill, SITES } from "./data";
import { GROUND_Y } from "./view";
import { COLORS, VIEW_H, VIEW_W, type Renderer } from "./view";

/**
 * The world you walk through. Left to right it is: four weather stations to collect,
 * a bench where the equation is assembled, then a corridor in which distance *is*
 * lead time — so walking further right is forecasting further ahead, and the fog
 * that closes in is the predictability horizon rather than a mood.
 */
export const SKY: Theme = {
  key: "fc-dawn", skyTop: "#141a3a", skyBottom: "#7d6a84", far: "#2c2a4a", near: "#1f1d36",
  stars: 30, snowline: 0,
};

/** Where everything stands, in world pixels. */
export const PLACES = {
  start: 40,
  stations: [200, 380, 560, 740] as number[],
  bench: 920,
  corridorFrom: 1040,
  corridorTo: 2240,
  climate: 2420,
  end: 2700,
};

export const MAX_LEAD = 30;

/** Distance along the corridor is how many days ahead you are asking about. */
export function leadAt(worldX: number): number {
  if (worldX <= PLACES.corridorFrom) return 1;
  const t = (worldX - PLACES.corridorFrom) / (PLACES.corridorTo - PLACES.corridorFrom);
  return 1 + Math.max(0, Math.min(1, t)) * (MAX_LEAD - 1);
}

export function xForLead(lead: number): number {
  const t = (lead - 1) / (MAX_LEAD - 1);
  return PLACES.corridorFrom + t * (PLACES.corridorTo - PLACES.corridorFrom);
}

export function drawSky(r: Renderer, w: Walk, time: number): void {
  r.px.drawImage(ditheredSky(SKY, VIEW_W, GROUND_Y + 10), 0, 0);
  drawStars(r.px, SKY, w.cam.cx, time, VIEW_W, GROUND_Y);
  drawRidge(r.px, SKY, "far", w.cam.cx, 0.14, GROUND_Y - 76, VIEW_W, 70);
  drawRidge(r.px, SKY, "near", w.cam.cx, 0.3, GROUND_Y - 44, VIEW_W, 50);
}

export function drawGround(r: Renderer, w: Walk): void {
  r.rect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y, "#2b3047");
  r.rect(0, GROUND_Y, VIEW_W, 1, "#454c6b");
  // Paces underfoot, so movement reads even on featureless stretches.
  const off = w.cam.cx % 24;
  for (let x = -24; x < VIEW_W + 24; x += 24) r.rect(Math.round(x - off), GROUND_Y + 7, 10, 1, "#3a4160");
}

/** A station: a mast, a louvred screen, and its reading once you have reached it. */
export function drawStation(r: Renderer, w: Walk, index: number, reached: boolean, anomaly: number): void {
  const x = Math.round(screenX(w, PLACES.stations[index], VIEW_W));
  if (x < -40 || x > VIEW_W + 40) return;
  const site = SITES[index];
  r.rect(x - 1, GROUND_Y - 30, 2, 30, "#565d75");
  r.rect(x - 8, GROUND_Y - 44, 16, 14, reached ? "#e8e4d6" : "#55596e");
  for (let i = 0; i < 4; i++) r.rect(x - 6, GROUND_Y - 42 + i * 3, 12, 1, "#9aa2b8");
  r.rect(x - 9, GROUND_Y - 46, 18, 3, reached ? "#b9c0d0" : "#44485c");
  r.text(site.name.split(",")[0], x, GROUND_Y - 58, {
    size: 7, color: reached ? COLORS.ink : COLORS.dim, align: "center",
  });
  if (!reached) return;
  const reading = anomaly / 10;
  r.text(`${reading >= 0 ? "+" : "−"}${Math.abs(reading).toFixed(1)} °C`, x, GROUND_Y - 68, {
    size: 8, color: reading >= 0 ? COLORS.hot : COLORS.cold, align: "center",
  });
}

/** The bench where the fitted equation is written out, once all four are collected. */
export function drawBench(r: Renderer, w: Walk, weights: number[], ready: boolean): void {
  const x = Math.round(screenX(w, PLACES.bench, VIEW_W));
  if (x < -140 || x > VIEW_W + 140) return;
  r.rect(x - 52, GROUND_Y - 10, 104, 4, "#6a4826");
  r.rect(x - 48, GROUND_Y - 6, 4, 6, "#4a3320");
  r.rect(x + 44, GROUND_Y - 6, 4, 6, "#4a3320");
  if (!ready) {
    r.text("the bench", x, GROUND_Y - 24, { size: 8, color: COLORS.dim, align: "center" });
    return;
  }
  r.rect(x - 70, GROUND_Y - 58, 140, 44, "rgba(5,6,13,0.82)");
  r.text("tomorrow =", x - 64, GROUND_Y - 54, { size: 8, color: COLORS.dim });
  SITES.forEach((site, i) => {
    const y = GROUND_Y - 44 + i * 9;
    r.text(`${weights[i] >= 0 ? "+" : "−"}${Math.abs(weights[i]).toFixed(2)}`, x - 56, y, {
      size: 7, color: COLORS.gold,
    });
    r.text(`× ${site.name.split(",")[0]}`, x - 34, y, { size: 7, color: COLORS.ink });
  });
}

/**
 * The corridor. Fog thickens with lead time and closes completely past the horizon,
 * which is the point: you can keep walking, you just cannot see.
 */
export function drawCorridor(r: Renderer, w: Walk, horizonLead: number): void {
  const lead = leadAt(w.x);
  const skill = Math.max(0, bestSkill(Math.round(lead)));
  const density = Math.max(0, Math.min(1, 1 - skill / bestSkill(1)));
  if (w.x < PLACES.corridorFrom - 60) return;

  // Day markers along the corridor, every five days.
  for (let d = 1; d <= MAX_LEAD; d += 1) {
    const x = Math.round(screenX(w, xForLead(d), VIEW_W));
    if (x < -10 || x > VIEW_W + 10) continue;
    const major = d === 1 || d % 5 === 0;
    r.rect(x, GROUND_Y - (major ? 12 : 5), 1, major ? 12 : 5, major ? COLORS.dim : COLORS.plateEdge);
    if (major) r.text(`+${d}d`, x, GROUND_Y + 12, { size: 7, color: COLORS.dim, align: "center" });
  }

  // The horizon post: beyond it nothing in these thermometers knows anything.
  const hx = Math.round(screenX(w, xForLead(horizonLead), VIEW_W));
  if (hx > -20 && hx < VIEW_W + 20) {
    r.rect(hx - 1, GROUND_Y - 54, 3, 54, COLORS.hot);
    r.rect(hx - 14, GROUND_Y - 58, 30, 8, COLORS.hot);
    r.text(`+${horizonLead}d`, hx + 1, GROUND_Y - 57, { size: 7, color: "#1a0d10", align: "center" });
  }

  /*
   * The fog lifts over the last stretch out of the corridor. It used to be drawn at
   * full density for ever, because there was no upper bound on x -- so the climate
   * question, which is the turn the whole episode builds to, was read through the
   * weather fog at alpha 0.88. Letting it clear as the reader walks out is the beat.
   */
  const leaving = Math.max(0, Math.min(1, (w.x - PLACES.corridorTo) / 140));
  const visible = density * (1 - leaving);
  if (visible > 0.02) {
    const ctx = r.px;
    ctx.globalAlpha = Math.min(0.88, visible * 0.95);
    const grad = ctx.createLinearGradient(0, GROUND_Y - 90, 0, GROUND_Y + 8);
    grad.addColorStop(0, "rgba(150,154,172,0.5)");
    grad.addColorStop(1, "rgba(120,124,142,0.95)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, GROUND_Y - 90, VIEW_W, 98);
    ctx.globalAlpha = 1;
  }
}

/** Past the fog: the same record, asked a question with a different shape. */
export function drawClimate(
  r: Renderer, w: Walk, streaks: { span: number; hits: number; total: number; since: number }[], shown: number,
): void {
  const base = Math.round(screenX(w, PLACES.climate, VIEW_W));
  if (base < -260 || base > VIEW_W + 260) return;
  r.text("a different question", base, GROUND_Y - 112, { size: 10, color: COLORS.gold, align: "center", title: true });
  streaks.slice(0, shown).forEach((c, i) => {
    const y = GROUND_Y - 92 + i * 22;
    const rate = c.hits / c.total;
    const label = c.span === 1
      ? "next year warmer than last"
      : `next ${c.span} years warmer than the last ${c.span}${c.since > 1900 ? `, since ${c.since}` : ""}`;
    r.text(label, base - 150, y, { size: 7, color: COLORS.ink });
    r.rect(base - 150, y + 9, 200, 6, COLORS.plate);
    r.rect(base - 150, y + 9, Math.round(200 * rate), 6,
      rate > 0.9 ? COLORS.gold : rate > 0.6 ? COLORS.hot : COLORS.cold);
    r.rect(base - 50, y + 7, 1, 10, COLORS.plateEdge);
    r.text(`${c.hits}/${c.total}`, base + 56, y + 8, { size: 7, color: rate > 0.9 ? COLORS.gold : COLORS.ink });
  });
}

export function drawWalker(r: Renderer, w: Walk): void {
  const kit = lookFrames();
  const frame = !w.moving ? kit.stand : Math.floor(w.stride) % 2 === 0 ? kit.runA : kit.runB;
  drawSprite(r.px, frame, Math.round(screenX(w, w.x, VIEW_W)) - 5, GROUND_Y - SPRITE_H, {
    flip: w.facing === -1,
    palette: lookPalette(),
    shirt: lookShirt(),
  });
}
