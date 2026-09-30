import { worldToScreen, type CameraState } from "../core";
import { DERIVED, GLOBAL, PALEO } from "../data";
import { groundAt, type Terrain } from "../world";
import { lerpHex, type Theme } from "../render/backdrop";
import { COLORS, stripeColor, stripePosition } from "../render/palette";
import type { Renderer } from "../render/renderer";

/**
 * Drawing helpers for the slide level: temperature colours, the climate-driven
 * backdrop theme, the thermometer HUD and the "same 175 years" rate race.
 */

/**
 * Colour for a temperature vs pre-industrial, on the *same* scale as the
 * warming stripes (centred on 1971-2000). Below pre-industrial the blue keeps
 * deepening until the ice age, so the whole journey reads as one set of stripes.
 */
export function tempColor(v: number): string {
  const { centre, halfRange } = GLOBAL.stripes;
  if (v >= 0) return stripeColor(v, centre, halfRange);
  const atZero = stripePosition(0, centre, halfRange);
  const pos = atZero + (-1 - atZero) * Math.min(1, v / PALEO.lgmDelta);
  return stripeColor(pos, 0, 1);
}

/**
 * Landscape colour while sledding (not data, just scenery): ice sheet in the
 * deep cold, tundra, then grassland, drying to ochre in the modern heat. The
 * thermometer and the reveal carry the actual temperature colours.
 */
const LAND: [number, string][] = [[-6, "#d7e4f2"], [-3.5, "#a9bccb"], [-1.5, "#6f7f6a"], [0, "#3e5641"], [0.6, "#5d5a36"], [1.4, "#9a5b3a"]];

export function landColor(v: number): string {
  if (v <= LAND[0][0]) return LAND[0][1];
  for (let i = 1; i < LAND.length; i++) {
    if (v <= LAND[i][0]) return lerpHex(LAND[i - 1][1], LAND[i][1], (v - LAND[i - 1][0]) / (LAND[i][0] - LAND[i - 1][0]));
  }
  return LAND[LAND.length - 1][1];
}

/** 0 = ice age, 1 = pre-industrial, 2 = today. */
function climatePhase(v: number): number {
  return v < 0 ? 1 + v / Math.abs(PALEO.lgmDelta) : 1 + v / Math.max(0.5, DERIVED.lastYearAnomaly);
}

const ICE: Theme = { key: "ice", skyTop: "#1b2a44", skyBottom: "#9fb7d4", far: "#6d84a3", near: "#dfe8f5", stars: 0, snowline: 1 };
const MILD: Theme = { key: "mild", skyTop: "#10233f", skyBottom: "#4f8a8b", far: "#2d4a53", near: "#1f3a33", stars: 25, snowline: 0.25 };
const HOT: Theme = { key: "hot", skyTop: "#2a1a2e", skyBottom: "#d9734e", far: "#5a2d3a", near: "#3a1f2a", stars: 5, snowline: 0 };

/**
 * Themes are cached as offscreen art, so we quantise the climate to a few
 * steps and blend colours between the three anchors.
 */
export function climateTheme(v: number): Theme {
  return themeForPhase(Math.max(0, Math.min(2, Math.round(climatePhase(v) * 4) / 4)));
}

/** Every theme the slide can show (phases 0, 0.25 ... 2), for pre-warming. */
export function allClimateThemes(): Theme[] {
  return Array.from({ length: 9 }, (_, i) => themeForPhase(i / 4));
}

function themeForPhase(phase: number): Theme {
  const [a, b, t] = phase <= 1 ? [ICE, MILD, phase] : [MILD, HOT, phase - 1];
  const mix = (x: string, y: string) => lerpHex(x, y, t);
  return {
    key: `climate-${phase}`,
    skyTop: mix(a.skyTop, b.skyTop),
    skyBottom: mix(a.skyBottom, b.skyBottom),
    far: mix(a.far, b.far),
    near: mix(a.near, b.near),
    stars: Math.round(a.stars + (b.stars - a.stars) * t),
    snowline: a.snowline + (b.snowline - a.snowline) * t,
  };
}

/** Snow density for the current temperature: heavy in the ice age, none today. */
export function snowFor(v: number): number {
  return v < -0.5 ? Math.min(1, -v / Math.abs(PALEO.lgmDelta)) : 0;
}

/** Vertical thermometer, -7..+2 °C, on the left edge. */
export function drawThermometer(r: Renderer, v: number): void {
  const px = r.px;
  const x = 8, top = 40, h = 90, lo = -7, hi = 2;
  const yFor = (t: number) => top + h - ((t - lo) / (hi - lo)) * h;
  px.fillStyle = "#05060d";
  px.fillRect(x - 2, top - 2, 9, h + 12);
  px.fillStyle = "#1b2140";
  px.fillRect(x, top, 5, h);
  px.fillStyle = tempColor(v);
  const level = Math.round(yFor(v));
  px.fillRect(x + 1, level, 3, top + h - level);
  px.fillRect(x - 1, top + h, 7, 7);
  px.fillStyle = "#ffffff";
  px.fillRect(x - 1, Math.round(yFor(0)), 7, 1);
  r.text("0", x + 9, yFor(0) - 4, { size: 7, color: COLORS.dim });
}

/**
 * The finale: two panels on the same axes over the same 175 years. Left: the
 * ice-age exit at its average pace (a band, because its duration is uncertain).
 * Right: the measured HadCRUT5 record since 1850. `t` runs 0..1.
 */
export function drawRateRace(r: Renderer, t: number): void {
  const px = r.px;
  const years = DERIVED.lastYear - GLOBAL.annual.start;
  const panelW = 118, panelH = 80, top = 22, gap = 16;
  const left = (320 - panelW * 2 - gap) / 2;
  const maxV = 1.6;
  const minV = -0.3;
  const yOf = (v: number) => Math.round(top + panelH - ((v - minV) / (maxV - minV)) * panelH);
  px.fillStyle = "rgba(5,6,13,0.88)";
  px.fillRect(left - 8, top - 16, panelW * 2 + gap + 16, panelH + 36);
  const shown = Math.floor(t * years);

  const panel = (x0: number, title: string, color: string, series: (k: number) => [number, number]) => {
    px.fillStyle = "#141a33";
    px.fillRect(x0, top, panelW, panelH);
    px.fillStyle = "#2a3358";
    for (let g = 0; g < maxV; g += 0.5) px.fillRect(x0, yOf(g), panelW, 1);
    let last: [number, number] = [0, 0];
    for (let k = 0; k <= shown; k++) {
      const [lo, hi] = series(k);
      const sx = x0 + Math.round((k / years) * (panelW - 1));
      const y1 = yOf(hi);
      const y0 = yOf(lo);
      px.fillStyle = color;
      px.fillRect(sx, Math.min(y0, y1), 1, Math.max(1, Math.abs(y0 - y1) + 1));
      last = [lo, hi];
    }
    r.text(title, x0 + panelW / 2, top - 12, { size: 7, align: "center" });
    const fmt = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}`;
    const label = last[0] === last[1] ? `${fmt(last[1])} °C` : `${fmt(last[0])} to ${fmt(last[1])} °C`;
    r.text(label, x0 + panelW / 2, top + panelH + 3, { size: 8, color, align: "center" });
  };

  const slow = DERIVED.deglacialRatePerCentury / 100;
  const fast = DERIVED.deglacialRateFastPerCentury / 100;
  panel(left, "Ice age ending (avg. pace)", "#92c5de", (k) => [slow * k, fast * k]);
  // Both panels start from the 1850-1900 level, so they share a zero.
  panel(left + panelW + gap, "Since 1850 (measured)", "#f4a582", (k) => {
    const v = GLOBAL.annual.values[Math.min(GLOBAL.annual.values.length - 1, k)];
    return [v, v];
  });
  r.text(`year ${shown} of ${years}`, 160, top + panelH + 14, { size: 7, color: COLORS.dim, align: "center" });
}

/**
 * The one zoom *in* of the game: a magnifier on the last few centuries, where
 * the modern warming is only a pixel or two wide at the full-journey scale.
 */
export function drawMagnifier(
  r: Renderer, cam: CameraState, t: Terrain, valueAt: (x: number) => number, xForYear: (y: number) => number, appear: number,
): void {
  const px = r.px;
  const fromYear = 1650, toYear = DERIVED.lastYear;
  const box = { x: 196, y: 14, w: 116, h: 76 };
  const lo = -0.6, hi = 1.8;
  // Where the magnified span sits on the main view, for the connector lines.
  const a = worldToScreen(cam, xForYear(fromYear), groundAt(t, xForYear(fromYear)), 320, 180);
  const b = worldToScreen(cam, xForYear(toYear), groundAt(t, xForYear(toYear)), 320, 180);
  px.globalAlpha = appear;
  r.line(a.sx, a.sy, box.x, box.y + box.h, "#ffd166", 1, false);
  r.line(b.sx, b.sy, box.x + box.w, box.y + box.h, "#ffd166", 1, false);
  px.fillStyle = "#05060d";
  px.fillRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4);
  px.fillStyle = "#ffd166";
  px.fillRect(box.x - 1, box.y - 1, box.w + 2, box.h + 2);
  for (let k = 0; k < box.w; k++) {
    const year = fromYear + ((k + 0.5) / box.w) * (toYear - fromYear);
    const v = valueAt(xForYear(year));
    px.fillStyle = tempColor(v);
    px.fillRect(box.x + k, box.y, 1, box.h);
    const gy = Math.round(box.y + box.h - ((v - lo) / (hi - lo)) * box.h);
    px.fillStyle = "#0b0f1e";
    px.fillRect(box.x + k, gy, 1, box.y + box.h - gy);
    px.fillStyle = "#ffffff";
    px.fillRect(box.x + k, gy, 1, 1);
  }
  px.globalAlpha = 1;
  if (appear >= 1) {
    r.text(`last ${toYear - fromYear} years, zoomed in 20×`, box.x + box.w / 2, box.y + box.h + 4, { size: 7, color: COLORS.accent, align: "center" });
    r.text("1850 →", box.x + ((1850 - fromYear) / (toYear - fromYear)) * box.w - 2, box.y + box.h - 12, { size: 7, align: "right" });
    r.text(`${toYear}: +${DERIVED.lastYearAnomaly.toFixed(1)} °C`, box.x + box.w - 3, box.y + 3, { size: 7, align: "right" });
  }
}
