import { worldToScreen, type CameraState } from "../core";
import { allRisingFromYears, DERIVED, GLOBAL, olsSlope, olsStdErr, signed } from "../data";
import { drawBackdrop, THEMES } from "../render/backdrop";
import { COLORS } from "../render/palette";
import { VIEW_H, VIEW_W, type Renderer } from "../render/renderer";
import { buildTerrain, cellCentreX, cellIndexAt, type Terrain } from "../world";
import { revealCamera, WalkScene } from "./scene";

/**
 * Level 2: cherry-picking, using a claim people really make: "it's been
 * cooling since 2016". The player walks 2016-2022 (a super El Niño start, a
 * triple La Niña end), sees "cooling", takes ONE more step into 2023 and
 * watches the trend flip, then zooms out to 1970-now.
 */
export const FROM_YEAR = DERIVED.cherry.searchedFrom;
export const CELL = 20;
export const PX_PER_DEGREE = 160;
const C = DERIVED.cherry;
const FIRST = C.start - FROM_YEAR;
const LAST = C.end - FROM_YEAR;
const NEXT = LAST + 1;

export function cherryValues(): number[] {
  return GLOBAL.annual.values.slice(FROM_YEAR - GLOBAL.annual.start);
}

/** Shortest window from FROM_YEAR with no downhill examples at all. */
const ALL_RISING = allRisingFromYears(FROM_YEAR);

/** 95% error bar on the cherry-picked window's trend, in °C/decade. */
function windowErrorBar(): number {
  return olsStdErr(cherryValues().slice(FIRST, LAST + 1)) * 10 * 1.96;
}

/** Bare signed number, for strings that carry their own units. */
function per(v: number): string {
  return `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}`;
}

/** Straight trend line through cells [first, last] of a series, in world coords. */
function trendEnds(t: Terrain, values: number[], first: number, last: number): [number, number, number, number] {
  const slice = values.slice(first, last + 1);
  const slope = olsSlope(slice);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const mid = (slice.length - 1) / 2;
  const y = (k: number) => -(mean + slope * (k - mid)) * PX_PER_DEGREE;
  return [cellCentreX(t, first), y(0), cellCentreX(t, last), y(slice.length - 1)];
}

type Line = { first: number; last: number; color: string };

export class CherryScene extends WalkScene {
  private values = cherryValues();
  private ended = false;
  private oneMore = false;
  private lines: Line[] = [];
  private farCam: CameraState | null = null;

  constructor() {
    const values = cherryValues();
    const terrain = buildTerrain({ values, cellWidth: CELL, valueScale: PX_PER_DEGREE, zeroY: 0 });
    super(terrain, FIRST * CELL + 8);
    this.bounds = { min: FIRST * CELL, max: (LAST + 1) * CELL };
    this.play([{ say: ["“The planet's been cooling since 2016!”", "You'll see this claim online. Walk the evidence."], wait: false }]);
  }

  protected override cellValue(i: number): number | null {
    return this.values[i];
  }

  private walkedTrend(): number | null {
    const i = cellIndexAt(this.terrain, this.player.x);
    if (i - FIRST < 2) return null;
    return olsSlope(this.values.slice(FIRST, i + 1)) * 10;
  }

  protected override onUpdate(): void {
    if (!this.ended && this.player.x >= (LAST + 1) * CELL - 8 && this.player.grounded) this.firstClaim();
  }

  private firstClaim(): void {
    this.ended = true;
    this.controlsEnabled = false;
    this.play([
      { run: () => this.lines.push({ first: FIRST, last: LAST, color: "#92c5de" }) },
      { say: [`${C.start}–${C.end}: ${signed(C.trendPerDecade)} per decade. Cooling!`, "Case closed? Take just one more step »"] },
      { run: () => { this.oneMore = true; this.bounds = { min: FIRST * CELL, max: (NEXT + 1) * CELL }; this.controlsEnabled = true; } },
      { until: () => this.player.x >= NEXT * CELL + CELL / 2 && this.player.grounded },
      { run: () => { this.controlsEnabled = false; this.lines.push({ first: FIRST, last: NEXT, color: "#f4a582" }); } },
      { say: [`${C.start}–${C.end + 1}: ${signed(C.trendPlusOneYear)} per decade. One year flipped it.`, "2016 was a huge El Niño year; 2020–22 were La Niña years."] },
      { zoom: { prompt: ["HOLD Z to zoom out and see the rest."], target: () => (this.farCam ??= revealCamera(this.terrain, 30, 30)) } },
      { pause: 0.6 },
      { run: () => this.lines.push({ first: 0, last: this.values.length - 1, color: COLORS.accent }) },
      { say: [`${FROM_YEAR}–${DERIVED.lastYear}: ${signed(C.longTrendPerDecade)} per decade.`, "The 'cooling' is one little wobble on the way up."] },
      {
        say: [
          `Seven years can't settle it: ${per(C.trendPerDecade)} ± ${windowErrorBar().toFixed(2)} °C/decade.`,
          "That range covers cooling, no change, and the real warming at once.",
        ],
      },
      {
        // The lesson is the asymmetry, not "statistics can show anything": short
        // windows disagree with each other, long ones agree. Both numbers are
        // computed from the same series the player just walked.
        say: [
          `Since ${C.start} the world actually warmed at ${per(C.trendToLatest)} °C/decade.`,
          `${Math.round(C.coolingWindowShare * 100)}% of 7-year windows slope down. Of ${ALL_RISING}-year windows: none.`,
        ],
      },
      { run: () => (this.done = true) },
    ]);
  }

  draw(r: Renderer): void {
    drawBackdrop(r.px, THEMES.sunset, this.cam.cx, this.time, VIEW_W, VIEW_H, 1 - this.zoomProgress * 0.8);
    const lit = (i: number) => (i >= FIRST && i <= LAST) || (this.oneMore && i === NEXT);
    r.steps(this.terrain, this.cam, (i) => (i === NEXT ? "#b5563a" : lit(i) ? "#8c3b3b" : "#4b5563"), {
      alpha: (i) => (lit(i) ? 1 : this.zoomProgress),
    });
    for (const l of this.lines) this.drawTrend(r, l);
    if (this.zoomProgress > 0.5) this.drawYearLabels(r);
    r.particles(this.particles, this.cam);
    r.player(this.player, this.cam, this.time, { highlight: this.ended && !this.controlsEnabled });
    this.drawHud(r);
    this.drawCaption(r);
  }

  private drawTrend(r: Renderer, l: Line): void {
    const [x0, y0, x1, y1] = trendEnds(this.terrain, this.values, l.first, l.last);
    const a = worldToScreen(this.cam, x0, y0 - 6, VIEW_W, VIEW_H);
    const b = worldToScreen(this.cam, x1, y1 - 6, VIEW_W, VIEW_H);
    r.line(a.sx, a.sy, b.sx, b.sy, l.color, 2);
  }

  private drawYearLabels(r: Renderer): void {
    for (const idx of [0, FIRST, this.values.length - 1]) {
      const s = worldToScreen(this.cam, cellCentreX(this.terrain, idx), this.terrain.groundY[idx], VIEW_W, VIEW_H);
      r.text(String(FROM_YEAR + idx), s.sx, s.sy + 4, { size: 7, color: COLORS.text, align: "center" });
    }
  }

  private drawHud(r: Renderer): void {
    if (this.zoomProgress > 0) return;
    const i = cellIndexAt(this.terrain, this.player.x);
    r.text(`${FROM_YEAR + i}`, 6, 4, { color: COLORS.accent, size: 10, title: true });
    r.text(signed(this.values[i]), 6, 17, { size: 9 });
    const trend = this.walkedTrend();
    if (trend !== null) {
      r.text(`trend since ${C.start}: ${signed(trend)}/decade`, 6, 28, { size: 7, color: trend < 0 ? "#92c5de" : "#f4a582" });
    }
  }
}
