import { bestSkill, LEADS, SITES, skillOf } from "./data";
import {
  COLORS, CURVE, curveX, curveY, EQUATION, MAP, SKILL_TOP, SLIDER, type Renderer,
} from "./view";

/**
 * The instrument panel: where the four places are, how heavily the player is
 * leaning on each, the equation that results, and how well it does at every lead
 * time. All of it is drawn from the covariances, so nothing here is illustrative.
 */
const MAX_LEAD = LEADS[LEADS.length - 1].lead;

/** Longitude and latitude to the little map, with Britain and Ireland roughly placed. */
function mapPos(lat: number, lon: number): { x: number; y: number } {
  const t = (lon + 11) / 17;
  const u = (58.5 - lat) / 8.5;
  return { x: MAP.x + 8 + t * (MAP.w - 20), y: MAP.y + 8 + u * (MAP.h - 20) };
}

export function drawMap(r: Renderer, weights: number[], selected: number, anomalies: number[]): void {
  r.rect(MAP.x, MAP.y, MAP.w, MAP.h, COLORS.plate);
  r.rect(MAP.x, MAP.y, MAP.w, 1, COLORS.plateEdge);
  r.rect(MAP.x, MAP.y + MAP.h - 1, MAP.w, 1, COLORS.plateEdge);
  r.text("where you are reading from", MAP.x + MAP.w / 2, MAP.y + 3, {
    size: 7, color: COLORS.dim, align: "center",
  });

  // A hint of coastline, so the dots are somewhere rather than nowhere.
  r.px.strokeStyle = COLORS.plateEdge;
  r.px.lineWidth = 1;
  r.px.beginPath();
  const coast: [number, number][] = [
    [-5.5, 50.1], [-3, 51.5], [-5, 53.3], [-3, 54.8], [-5.5, 56.5], [-3, 58.5],
  ];
  coast.forEach(([lon, lat], i) => {
    const p = mapPos(lat, lon);
    if (i === 0) r.px.moveTo(p.x, p.y);
    else r.px.lineTo(p.x, p.y);
  });
  r.px.stroke();

  SITES.forEach((site, i) => {
    const p = mapPos(site.lat, site.lon);
    const w = weights[i];
    // Dot size is how much the player is leaning on this place.
    const size = 3 + Math.round(Math.abs(w) * 7);
    const warm = anomalies[i] >= 0;
    r.rect(p.x - size / 2 - 1, p.y - size / 2 - 1, size + 2, size + 2, COLORS.shadow);
    r.rect(p.x - size / 2, p.y - size / 2, size, size, warm ? COLORS.hot : COLORS.cold);
    if (i === selected) {
      r.rect(p.x - size / 2 - 3, p.y - size / 2 - 3, size + 6, 1, COLORS.gold);
      r.rect(p.x - size / 2 - 3, p.y + size / 2 + 2, size + 6, 1, COLORS.gold);
    }
  });
}

export function drawSliders(r: Renderer, weights: number[], selected: number, anomalies: number[]): void {
  SITES.forEach((site, i) => {
    const y = SLIDER.y + i * SLIDER.rowH;
    const on = i === selected;
    r.text(on ? `▸ ${site.name}` : `  ${site.name}`, SLIDER.x, y, {
      size: 8, color: on ? COLORS.gold : COLORS.ink,
    });
    const reading = anomalies[i] / 10;
    r.text(`${reading >= 0 ? "+" : "−"}${Math.abs(reading).toFixed(1)}`, SLIDER.barX - 8, y, {
      size: 8, color: reading >= 0 ? COLORS.hot : COLORS.cold, align: "right",
    });
    // The bar runs from -0.2 to 1.0, because a negative weight is allowed and useful.
    const zero = SLIDER.barX + (0.2 / 1.2) * SLIDER.barW;
    r.rect(SLIDER.barX, y + 3, SLIDER.barW, 3, COLORS.plate);
    r.rect(zero, y + 1, 1, 7, COLORS.plateEdge);
    const end = SLIDER.barX + ((weights[i] + 0.2) / 1.2) * SLIDER.barW;
    const from = Math.min(zero, end);
    r.rect(from, y + 3, Math.max(1, Math.abs(end - zero)), 3, on ? COLORS.gold : COLORS.dim);
    r.rect(end - 1, y, 2, 9, on ? COLORS.gold : COLORS.ink);
  });
}

/** The forecast written out, with the player's own numbers in it. */
export function drawEquation(r: Renderer, weights: number[], anomalies: number[], lead: number): void {
  const terms = SITES.map((site, i) => {
    const w = weights[i];
    const sign = i === 0 ? (w < 0 ? "−" : "") : w < 0 ? " − " : " + ";
    return `${sign}${Math.abs(w).toFixed(2)}×${site.key.slice(0, 4)}`;
  }).join("");
  r.text(`forecast(+${lead}d) =${terms.startsWith("−") ? " " : " "}${terms}`, EQUATION.x, EQUATION.y, {
    size: 8, color: COLORS.ink,
  });
  const value = weights.reduce((a, w, i) => a + w * (anomalies[i] / 10), 0);
  const parts = SITES.map((_, i) => `${weights[i].toFixed(2)}×${(anomalies[i] / 10).toFixed(1)}`).join(" + ");
  r.text(`today: ${parts}`, EQUATION.x, EQUATION.y + 10, { size: 7, color: COLORS.dim });
  r.text(`= ${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(2)} °C from normal`, EQUATION.x, EQUATION.y + 19, {
    size: 8, color: COLORS.gold,
  });
}

/** Skill against lead time: the player's weights, and the best anyone could do. */
export function drawCurve(
  r: Renderer, weights: number[], lead: number, showBest: boolean, horizonLead: number,
): void {
  r.rect(CURVE.x - 1, CURVE.y - 1, CURVE.w + 2, CURVE.h + 2, COLORS.plate);
  // Zero skill: no better than saying "an ordinary day for the time of year".
  const zero = curveY(0);
  for (let x = CURVE.x; x < CURVE.x + CURVE.w; x += 4) r.rect(x, zero, 2, 1, COLORS.plateEdge);
  r.text("no better than normal", CURVE.x + 2, zero + 2, { size: 7, color: COLORS.dim });
  r.text("skill", CURVE.x - 6, CURVE.y, { size: 7, color: COLORS.dim, align: "right" });
  r.text(SKILL_TOP.toFixed(2), CURVE.x - 6, CURVE.y + 8, { size: 7, color: COLORS.dim, align: "right" });

  if (showBest) {
    for (const s of LEADS) {
      r.rect(curveX(s.lead, MAX_LEAD), curveY(bestSkill(s.lead)), 2, 2, COLORS.dim);
    }
    r.text("best possible", CURVE.x + CURVE.w - 2, CURVE.y, { size: 7, color: COLORS.dim, align: "right" });
  }
  for (const s of LEADS) {
    const v = skillOf(weights, s.lead);
    const colour = s.lead === Math.round(lead) ? COLORS.gold : COLORS.cold;
    r.rect(curveX(s.lead, MAX_LEAD), curveY(v), 2, 2, colour);
  }

  // The lead the player is looking at.
  const lx = Math.round(curveX(lead, MAX_LEAD));
  for (let y = CURVE.y; y < CURVE.y + CURVE.h; y += 3) r.rect(lx, y, 1, 2, "rgba(255,209,102,0.5)");
  r.text(`+${Math.round(lead)}d`, lx, CURVE.y + CURVE.h + 3, { size: 7, color: COLORS.gold, align: "center" });
  r.text("+1d", CURVE.x, CURVE.y + CURVE.h + 3, { size: 7, color: COLORS.dim });
  r.text(`+${MAX_LEAD}d`, CURVE.x + CURVE.w, CURVE.y + CURVE.h + 3, { size: 7, color: COLORS.dim, align: "right" });

  if (showBest) {
    const hx = Math.round(curveX(horizonLead, MAX_LEAD));
    r.rect(hx, CURVE.y, 1, CURVE.h, COLORS.hot);
    r.text("useful skill ends", hx + 3, CURVE.y + 2, { size: 7, color: COLORS.hot });
  }
}

/** The climate half: how often the next span came out warmer than the last. */
export function drawStreaks(
  r: Renderer, streaks: { span: number; hits: number; total: number; since: number }[], shown: number,
): void {
  const x = 60;
  const w = 360;
  streaks.slice(0, shown).forEach((c, i) => {
    const y = 56 + i * 34;
    const rate = c.hits / c.total;
    const label = c.span === 1
      ? "next year warmer than last"
      : `next ${c.span} years warmer than the last ${c.span}`;
    r.text(c.since > 1900 ? `${label}, since ${c.since}` : label, x, y, { size: 8, color: COLORS.ink });
    r.rect(x, y + 12, w, 7, COLORS.plate);
    r.rect(x, y + 12, Math.round(w * rate), 7, rate > 0.9 ? COLORS.gold : rate > 0.6 ? COLORS.hot : COLORS.cold);
    r.rect(x + Math.round(w * 0.5), y + 10, 1, 11, COLORS.plateEdge);
    r.text(`${c.hits} of ${c.total}   ${Math.round(rate * 100)}%`, x + w + 4, y + 12, {
      size: 8, color: rate > 0.9 ? COLORS.gold : COLORS.ink, align: "left",
    });
  });
  r.text("a coin flip", x + Math.round(w * 0.5), 44, { size: 7, color: COLORS.dim, align: "center" });
}
