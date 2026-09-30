import { easeInOutCubic, lerp, worldToScreen } from "../core";
import { GLOBAL, monthlyWindow, signed } from "../data";
import { COLORS } from "../render/palette";
import { VIEW_H, VIEW_W, type Renderer } from "../render/renderer";
import { buildTerrain, cellIndexAt, groupMeans, terrainWidth } from "../world";
import { revealCamera, WalkScene } from "./scene";

/**
 * Level 1: month-to-month global temperature. The window is fixed (1985-1994)
 * because it contains Pinatubo, a large natural wiggle, not because of its trend.
 */
export const FIRST_YEAR = 1985;
export const LAST_YEAR = 1994;
export const CELL = 12;
export const PX_PER_DEGREE = 130;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MORPH_SECONDS = 2.5;

export class MonthsScene extends WalkScene {
  private monthly: number[];
  private annualGround: number[];
  private monthlyGround: number[];
  private morph = -1; // -1 = not started, 0..1 = in progress
  private morphDone?: () => void;
  private ended = false;

  constructor() {
    const monthly = monthlyWindow(FIRST_YEAR, LAST_YEAR);
    const terrain = buildTerrain({ values: monthly, cellWidth: CELL, valueScale: PX_PER_DEGREE, zeroY: 0 });
    super(terrain, 10);
    this.monthly = monthly;
    this.monthlyGround = [...terrain.groundY];
    this.annualGround = groupMeans(terrain.groundY, 12).flatMap((g) => new Array(12).fill(g));
    const at = (month: number) => month * CELL;
    this.triggers = [
      { x: at(1), dir: 1, lines: ["Each step is one month of global temperature.", "Higher = warmer, for the whole planet."] },
      { x: at(16), dir: 1, lines: ["Warmer than last month? Colder?", "It flips all the time."] },
      { x: at((1991 - FIRST_YEAR) * 12 + 5), dir: 1, lines: ["June 1991: Mount Pinatubo erupts.", "Its haze cools the planet for a year or two."] },
      { x: at(100), dir: 1, lines: ["Ten years of months. Is it warming?", "Hard to tell from here."] },
    ];
  }

  protected onUpdate(dt: number): void {
    const end = this.terrain.x0 + terrainWidth(this.terrain) - 8;
    if (!this.ended && this.player.x >= end && this.player.grounded) {
      this.ended = true;
      this.controlsEnabled = false;
      this.say(["Now average each year's twelve months..."], () => this.startMorph(() => this.zoomOut()));
    }
    if (this.morph >= 0 && this.morph < 1) {
      this.morph = Math.min(1, this.morph + dt / MORPH_SECONDS);
      const t = easeInOutCubic(this.morph);
      this.terrain.groundY = this.monthlyGround.map((m, i) => lerp(m, this.annualGround[i], t));
      if (this.morph >= 1) this.morphDone?.();
    }
  }

  private startMorph(then: () => void): void {
    this.captionLines = [];
    this.morph = 0;
    this.morphDone = then;
  }

  private zoomOut(): void {
    this.moveCamera(revealCamera(this.terrain, 40, 40), 2.5, () =>
      this.say(["Smoother. But still bumpy, year to year.", "Any single year, you could brush off."], () => (this.done = true)),
    );
  }

  draw(r: Renderer): void {
    r.clear();
    r.terrain(this.terrain, this.cam, (i) => (Math.floor(i / 12) % 2 === 0 ? COLORS.ground : "#34423a"));

    // Year labels sit on the ground at each January.
    for (let y = 0; y <= LAST_YEAR - FIRST_YEAR; y++) {
      const i = y * 12;
      const s = worldToScreen(this.cam, i * CELL + 2, this.terrain.groundY[i], VIEW_W, VIEW_H);
      if (s.sx > -30 && s.sx < VIEW_W) r.text(String(FIRST_YEAR + y), s.sx, s.sy + 4, { size: 6, color: COLORS.dim });
    }
    r.player(this.player, this.cam, this.time, this.ended);
    this.drawHud(r);
    this.drawCaption(r);
  }

  private drawHud(r: Renderer): void {
    if (this.morph >= 0) {
      r.text(`Annual means, ${GLOBAL.meta.dataset}`, 6, 6, { size: 6, color: COLORS.dim });
      return;
    }
    const i = cellIndexAt(this.terrain, this.player.x);
    const year = FIRST_YEAR + Math.floor(i / 12);
    r.text(`${MONTHS[i % 12]} ${year}  ${signed(this.monthly[i])}`, 6, 6, { color: COLORS.accent });
    if (i > 0) {
      const diff = this.monthly[i] - this.monthly[i - 1];
      r.text(`vs last month ${signed(diff)}`, 6, 15, { size: 6, color: diff >= 0 ? "#f4a582" : "#92c5de" });
    }
    r.text(`vs ${GLOBAL.meta.baseline} average`, VIEW_W - 6, 6, { size: 5, color: COLORS.dim, align: "right" });
  }
}
