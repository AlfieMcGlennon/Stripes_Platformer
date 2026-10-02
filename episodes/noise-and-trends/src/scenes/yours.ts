import type { InputFrame } from "../core";
import { sfx } from "../core/audio";
import { DERIVED, GLOBAL, signed } from "../data";
import { drawBackdrop, THEMES } from "../render/backdrop";
import { COLORS, stripeColor } from "../render/palette";
import { BODY_FONT, TITLE_FONT, VIEW_H, VIEW_W, type Renderer } from "../render/renderer";
import type { Scene } from "./scene";

/**
 * "Your Stripes": pick a birth year, see the stripes of your own lifetime and
 * how much warming the trend shows over it. Saves a shareable PNG. Short
 * lifetimes deliberately get "too short to tell", the game's lesson again.
 */
const MIN_YEAR = 1930;
/**
 * Thirty years is the WMO climate normal, and it is the rule the game wants the
 * player to leave with. It was 15, which undercut the whole point: the game
 * spends a level proving a 7-year window is worthless, then quoted a 15-year
 * trend to one decimal with no error bar.
 */
const MIN_TREND_YEARS = 30;
const DECADE = 10;

export interface Lifetime {
  years: number;
  /** Last decade's mean minus the first decade's, °C; null if the span is too short. */
  trendWarming: number | null;
  /** 95% error bar on that difference, °C. */
  plusMinus: number | null;
}

const mean = (a: number[]): number => a.reduce((x, y) => x + y, 0) / a.length;

function variance(a: number[]): number {
  const m = mean(a);
  return a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1);
}

export function lifetimeWarming(birthYear: number): Lifetime {
  const from = birthYear - GLOBAL.annual.start;
  const values = GLOBAL.annual.values.slice(from);
  const years = values.length - 1;
  if (years < MIN_TREND_YEARS) return { years, trendWarming: null, plusMinus: null };
  // A difference of decade means, not a least-squares fit across the whole life.
  // The OLS version was not monotonic in age: fitting a line through the 1940-70
  // plateau told someone born in 1930 they had lived through *less* warming than
  // someone born in 1960, which reads as a bug and can't be defended in a caption.
  const first = values.slice(0, DECADE);
  const last = values.slice(-DECADE);
  return {
    years,
    trendWarming: mean(last) - mean(first),
    plusMinus: 1.96 * Math.sqrt(variance(first) / DECADE + variance(last) / DECADE),
  };
}

/**
 * The same data as a 1px stepped line over the stripes. Without it colour is the
 * only channel here: colour-blind players lose the ordering, and in greyscale --
 * a photocopy, a tired projector -- the coldest and warmest years come out at
 * exactly 1.00:1, i.e. identical.
 */
function drawValueLine(
  ctx: CanvasRenderingContext2D, values: number[], x0: number, top: number, w: number, h: number,
  thickness = 1, color = "#ffffff",
): void {
  const lo = Math.min(...values);
  const span = Math.max(0.001, Math.max(...values) - lo);
  const step = w / values.length;
  ctx.fillStyle = color;
  values.forEach((v, i) => {
    const y = top + h - thickness - ((v - lo) / span) * (h - thickness * 3);
    ctx.fillRect(Math.round(x0 + i * step), Math.round(y), Math.max(1, Math.round(step)), thickness);
  });
}

/** "+1.1 ± 0.18 °C", or a bare figure if there is no error bar to show. */
export function lifetimeLabel(life: Lifetime): string {
  const v = life.trendWarming ?? 0;
  const sign = v >= 0 ? "+" : "−";
  const pm = life.plusMinus === null ? "" : ` ± ${life.plusMinus.toFixed(2)}`;
  return `${sign}${Math.abs(v).toFixed(1)}${pm} °C`;
}

function initialYear(): number {
  const y = Number(new URLSearchParams(location.search).get("y"));
  return Number.isInteger(y) && y >= MIN_YEAR && y < DERIVED.lastYear ? y : 2000;
}

export class YoursScene implements Scene {
  done = false;
  readonly zoomAvailable = true; // shows the touch "zoom" button, used here to save
  readonly zoomHint = "save";
  private time = 0;
  private year = initialYear();
  private repeat = 0;
  private zoomWasHeld = false;
  private savedAt = -10;

  update(input: InputFrame, dt: number): void {
    this.time += dt;
    // Tap to step a year; hold to scroll.
    if (input.move !== 0) {
      this.repeat -= dt;
      if (this.repeat <= 0) {
        this.year = Math.max(MIN_YEAR, Math.min(DERIVED.lastYear - 1, this.year + input.move));
        this.repeat = this.repeat < -1 ? 0.03 : 0.12;
        sfx.blip();
      }
    } else this.repeat = 0;
    if (input.zoomHeld && !this.zoomWasHeld) this.save();
    this.zoomWasHeld = input.zoomHeld;
    if (this.time > 0.5 && input.actionPressed) this.done = true;
  }

  private save(): void {
    const canvas = renderShareCard(this.year);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `my-stripes-${this.year}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    });
    this.savedAt = this.time;
    sfx.reveal();
  }

  draw(r: Renderer): void {
    drawBackdrop(r.px, THEMES.stripes, 0, this.time, VIEW_W, VIEW_H, 0);
    const from = this.year - GLOBAL.annual.start;
    const values = GLOBAL.annual.values.slice(from);
    // h is 52, not 64: the text below used to run to y=157, underneath the touch
    // buttons that live at y 136-176.
    const x0 = 20, w = VIEW_W - 40, top = 44, h = 52;
    const step = w / values.length;
    values.forEach((v, i) => {
      r.px.fillStyle = stripeColor(v, GLOBAL.stripes.centre, GLOBAL.stripes.halfRange);
      const bx = Math.round(x0 + i * step);
      r.px.fillRect(bx, top, Math.round(x0 + (i + 1) * step) - bx, h);
    });
    drawValueLine(r.px, values, x0, top, w, h);
    const life = lifetimeWarming(this.year);
    r.text("YOUR STRIPES", VIEW_W / 2, 5, { size: 20, color: COLORS.accent, align: "center", title: true });
    r.text(`Born in  ‹ ${this.year} ›`, VIEW_W / 2, 24, { size: 10, align: "center" });
    r.text(`${this.year}`, x0, top + h + 2, { size: 7, color: COLORS.dim });
    r.text(`${DERIVED.lastYear}`, x0 + w, top + h + 2, { size: 7, color: COLORS.dim, align: "right" });
    // A short life gets the rule and a real number from the long view, rather
      // than a precise-looking figure its own span cannot support.
    const lines = life.trendWarming === null
      ? [
          `Only ${life.years} years — too short to call. Climate is measured over ${MIN_TREND_YEARS}.`,
          `Over the whole record since ${GLOBAL.annual.start}: ${signed(DERIVED.lastYearAnomaly, 1)}.`,
        ]
      : [`Your last 10 years ran ${lifetimeLabel(life)} warmer than your first 10.`];
    lines.forEach((t, i) => r.text(t, VIEW_W / 2, top + h + 11 + i * 10, { size: 8, align: "center" }));
    const saved = this.time - this.savedAt < 2;
    r.text(
      saved ? "Saved!" : "« » pick a year · Z saves a picture · SPACE finishes",
      VIEW_W / 2, top + h + 31, { size: 7, color: saved ? COLORS.accent : COLORS.dim, align: "center" },
    );
  }
}

/** A 1200x630 image (social-card shape) of the player's lifetime stripes. */
export function renderShareCard(birthYear: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0b1020";
  ctx.fillRect(0, 0, 1200, 630);
  const values = GLOBAL.annual.values.slice(birthYear - GLOBAL.annual.start);
  const w = 1200 / values.length;
  values.forEach((v, i) => {
    ctx.fillStyle = stripeColor(v, GLOBAL.stripes.centre, GLOBAL.stripes.halfRange);
    const bx = Math.round(i * w);
    ctx.fillRect(bx, 0, Math.round((i + 1) * w) - bx, 470);
  });
  // The card is the one artefact that leaves the browser and the one most likely
  // to be printed, so it must not rely on hue alone.
  drawValueLine(ctx, values, 0, 0, 1200, 470, 4);
  const life = lifetimeWarming(birthYear);
  ctx.fillStyle = "#f2efe6";
  ctx.textAlign = "center";
  ctx.font = `44px ${TITLE_FONT}`;
  ctx.fillText(`MY STRIPES: ${birthYear}–${DERIVED.lastYear}`, 600, 530);
  ctx.font = `28px ${BODY_FONT}`;
  ctx.fillText(
    life.trendWarming === null
      ? `Too short to see a trend — that's the point. Zoom out: ${signed(DERIVED.lastYearAnomaly, 1)} since ${GLOBAL.annual.start}.`
      : `My last 10 years ran ${lifetimeLabel(life)} warmer than my first 10 (HadCRUT5)`,
    600, 580,
  );
  ctx.font = `20px ${BODY_FONT}`;
  ctx.fillStyle = "#8a90a6";
  ctx.fillText("Noise and Trends · stripes concept: Ed Hawkins, showyourstripes.info", 600, 615);
  return canvas;
}
