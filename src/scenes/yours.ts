import type { InputFrame } from "../core";
import { sfx } from "../core/audio";
import { DERIVED, GLOBAL, olsSlope } from "../data";
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
const MIN_TREND_YEARS = 15;

export interface Lifetime {
  years: number;
  /** Warming along the least-squares trend over the lifetime, °C; null if too short to tell. */
  trendWarming: number | null;
}

export function lifetimeWarming(birthYear: number): Lifetime {
  const from = birthYear - GLOBAL.annual.start;
  const values = GLOBAL.annual.values.slice(from);
  const years = values.length - 1;
  if (years < MIN_TREND_YEARS) return { years, trendWarming: null };
  return { years, trendWarming: olsSlope(values) * years };
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
    const x0 = 20, w = VIEW_W - 40, top = 44, h = 64;
    values.forEach((v, i) => {
      r.px.fillStyle = stripeColor(v, GLOBAL.stripes.centre, GLOBAL.stripes.halfRange);
      r.px.fillRect(Math.floor(x0 + (i * w) / values.length), top, Math.ceil(w / values.length), h);
    });
    const life = lifetimeWarming(this.year);
    r.text("YOUR STRIPES", VIEW_W / 2, 6, { size: 12, color: COLORS.accent, align: "center", title: true });
    r.text(`Born in  ‹ ${this.year} ›`, VIEW_W / 2, 24, { size: 10, align: "center" });
    r.text(`${this.year}`, x0, top + h + 3, { size: 7, color: COLORS.dim });
    r.text(`${DERIVED.lastYear}`, x0 + w, top + h + 3, { size: 7, color: COLORS.dim, align: "right" });
    const line = life.trendWarming === null
      ? `${life.years} years: too short to tell. That's the whole point of this game!`
      : `Over your ${life.years} years, the trend shows about ${life.trendWarming >= 0 ? "+" : "−"}${Math.abs(life.trendWarming).toFixed(1)} °C of warming.`;
    r.text(line, VIEW_W / 2, top + h + 14, { size: 8, align: "center" });
    const saved = this.time - this.savedAt < 2;
    r.text(saved ? "Saved!" : "← → pick a year · press Z (or the zoom button) to save a picture", VIEW_W / 2, top + h + 30, { size: 7, color: saved ? COLORS.accent : COLORS.dim, align: "center" });
    r.text("SPACE / tap to finish", VIEW_W / 2, top + h + 42, { size: 7, color: COLORS.dim, align: "center" });
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
    ctx.fillRect(Math.floor(i * w), 0, Math.ceil(w), 470);
  });
  const life = lifetimeWarming(birthYear);
  ctx.fillStyle = "#f2efe6";
  ctx.textAlign = "center";
  ctx.font = `44px ${TITLE_FONT}`;
  ctx.fillText(`MY STRIPES: ${birthYear}–${DERIVED.lastYear}`, 600, 530);
  ctx.font = `28px ${BODY_FONT}`;
  ctx.fillText(
    life.trendWarming === null ? "Too short to see a trend. Zoom out!" : `About +${life.trendWarming.toFixed(1)} °C of warming in my lifetime (HadCRUT5 trend)`,
    600, 580,
  );
  ctx.font = `20px ${BODY_FONT}`;
  ctx.fillStyle = "#8a90a6";
  ctx.fillText("Height Check · stripes concept: Ed Hawkins, showyourstripes.info", 600, 615);
  return canvas;
}
