import { worldToScreen, type CameraState } from "../core";
import { DERIVED, GLOBAL, olsSlope, signed } from "../data";
import { drawBackdrop, THEMES } from "../render/backdrop";
import { COLORS } from "../render/palette";
import { VIEW_H, VIEW_W, type Renderer } from "../render/renderer";
import { buildTerrain, cellCentreX, cellIndexAt, type Terrain } from "../world";
import { revealCamera, WalkScene } from "./scene";

/**
 * Level 2: cherry-picking. build_data.py searched every 8-year window since
 * 1970 for the one with the most negative trend; the player walks only that
 * window, sees "cooling", then zooms out to the whole record. The game says
 * outright that the window was chosen that way.
 */
export const FROM_YEAR = DERIVED.cherry.searchedFrom;
export const CELL = 20;
export const PX_PER_DEGREE = 160;
const C = DERIVED.cherry;
const WINDOW_FIRST = C.start - FROM_YEAR;
const WINDOW_LAST = WINDOW_FIRST + C.length - 1;

export function cherryValues(): number[] {
  return GLOBAL.annual.values.slice(FROM_YEAR - GLOBAL.annual.start);
}

/** Straight trend line through cells [first, last] of a series, in world coords. */
function trendEnds(t: Terrain, values: number[], first: number, last: number): [number, number, number, number] {
  const slice = values.slice(first, last + 1);
  const slope = olsSlope(slice);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const mid = (slice.length - 1) / 2;
  const valueAt = (k: number) => mean + slope * (k - mid);
  const y = (v: number) => -v * PX_PER_DEGREE;
  return [cellCentreX(t, first), y(valueAt(0)), cellCentreX(t, last), y(valueAt(slice.length - 1))];
}

export class CherryScene extends WalkScene {
  private values = cherryValues();
  private ended = false;
  private showShortTrend = false;
  private showLongTrend = false;
  private farCam: CameraState | null = null;

  constructor() {
    const values = cherryValues();
    const terrain = buildTerrain({ values, cellWidth: CELL, valueScale: PX_PER_DEGREE, zeroY: 0 });
    super(terrain, WINDOW_FIRST * CELL + 8);
    this.bounds = { min: WINDOW_FIRST * CELL, max: (WINDOW_LAST + 1) * CELL };
    this.cam = { ...this.cam, cx: this.player.x + 60 };
    this.play([
      { say: ["Someone online says: “The planet is cooling!”", "Here's their evidence. Walk it."], wait: false },
    ]);
  }

  protected cellValue(i: number): number | null {
    return this.values[i];
  }

  private walkedTrend(): number | null {
    const i = cellIndexAt(this.terrain, this.player.x);
    if (i - WINDOW_FIRST < 2) return null;
    return olsSlope(this.values.slice(WINDOW_FIRST, i + 1)) * 10;
  }

  protected onUpdate(): void {
    if (this.ended || this.player.x < (WINDOW_LAST + 1) * CELL - 8 || !this.player.grounded) return;
    this.ended = true;
    this.controlsEnabled = false;
    const end = C.start + C.length - 1;
    this.play([
      { run: () => (this.showShortTrend = true) },
      { say: [`${C.start}–${end}: ${signed(C.trendPerDecade)} per decade.`, "Cooling! Case closed?"] },
      {
        zoom: {
          prompt: ["HOLD Z to zoom out and see the rest."],
          target: () => (this.farCam ??= revealCamera(this.terrain, 30, 30)),
        },
      },
      { pause: 0.6 },
      { run: () => (this.showLongTrend = true) },
      { say: [`${FROM_YEAR}–${DERIVED.lastYear}: ${signed(C.longTrendPerDecade)} per decade.`, "Their 'cooling' is one little dip on the way up."] },
      { say: [`We searched all ${C.windowsSearched} eight-year windows since ${FROM_YEAR} for the coolest-looking one.`, `Only ${Math.round(C.coolingWindowShare * 100)}% slope down at all.`] },
      { say: ["Choose a short enough window and you can 'show' almost anything.", "That's cherry-picking. Zoom out."] },
      { run: () => (this.done = true) },
    ]);
  }

  draw(r: Renderer): void {
    drawBackdrop(r.px, THEMES.sunset, this.cam.cx, this.time, VIEW_W, VIEW_H, 1 - this.zoomProgress * 0.8);
    const inWindow = (i: number) => i >= WINDOW_FIRST && i <= WINDOW_LAST;
    r.steps(this.terrain, this.cam, (i) => (inWindow(i) ? "#8c3b3b" : "#4b5563"), {
      alpha: (i) => (inWindow(i) ? 1 : this.zoomProgress),
    });
    if (this.showShortTrend) this.drawTrend(r, WINDOW_FIRST, WINDOW_LAST, "#92c5de");
    if (this.showLongTrend) this.drawTrend(r, 0, this.values.length - 1, COLORS.accent);
    if (this.zoomProgress > 0.5) this.drawYearLabels(r);
    r.particles(this.particles, this.cam);
    r.player(this.player, this.cam, this.time, { highlight: this.ended });
    this.drawHud(r);
    this.drawCaption(r);
  }

  private drawTrend(r: Renderer, first: number, last: number, color: string): void {
    const [x0, y0, x1, y1] = trendEnds(this.terrain, this.values, first, last);
    const a = worldToScreen(this.cam, x0, y0 - 6, VIEW_W, VIEW_H);
    const b = worldToScreen(this.cam, x1, y1 - 6, VIEW_W, VIEW_H);
    r.line(a.sx, a.sy, b.sx, b.sy, color, 2);
  }

  private drawYearLabels(r: Renderer): void {
    for (const idx of [0, WINDOW_FIRST, WINDOW_LAST, this.values.length - 1]) {
      const s = worldToScreen(this.cam, cellCentreX(this.terrain, idx), this.terrain.groundY[idx], VIEW_W, VIEW_H);
      r.text(String(FROM_YEAR + idx), s.sx, s.sy + 4, { size: 6, color: COLORS.dim, align: "center" });
    }
  }

  private drawHud(r: Renderer): void {
    if (this.zoomProgress > 0) return;
    const i = cellIndexAt(this.terrain, this.player.x);
    r.text(`${FROM_YEAR + i}`, 6, 4, { color: COLORS.accent, size: 10, title: true });
    r.text(signed(this.values[i]), 6, 17, { size: 9 });
    const trend = this.walkedTrend();
    if (trend !== null) {
      r.text(`trend so far: ${signed(trend)}/decade`, 6, 28, { size: 7, color: trend < 0 ? "#92c5de" : "#f4a582" });
    }
  }
}
