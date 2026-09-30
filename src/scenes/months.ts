import { lerp, worldToScreen, type CameraState } from "../core";
import { GLOBAL, monthlyWindow, signed } from "../data";
import { drawBackdrop, THEMES } from "../render/backdrop";
import { COLORS } from "../render/palette";
import { VIEW_H, VIEW_W, type Renderer } from "../render/renderer";
import { buildTerrain, cellIndexAt, groupMeans, terrainWidth } from "../world";
import { revealCamera, WalkScene } from "./scene";

/**
 * Level 1: month-to-month global temperature. The window is fixed (1985-1994)
 * because it contains Pinatubo, a large natural wiggle, not because of its trend.
 * Holding Z averages the months into years while the camera pulls back.
 */
export const FIRST_YEAR = 1985;
export const LAST_YEAR = 1994;
export const CELL = 12;
export const PX_PER_DEGREE = 130;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export class MonthsScene extends WalkScene {
  private monthly: number[];
  private annualGround: number[];
  private monthlyGround: number[];
  private averaging = false;
  private ended = false;
  private farCam: CameraState | null = null;

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
      { x: at(14), dir: 1, lines: ["Warmer than last month? Colder?", "It flips all the time."] },
      { x: at(28), dir: 1, lines: ["Much of this wobble is El Niño and La Niña:", "the Pacific sloshing heat in and out of the air."] },
      { x: at((1991 - FIRST_YEAR) * 12 + 5), dir: 1, lines: ["June 1991: Mount Pinatubo erupts.", "Its sulphur haze reflects sunlight and cools 1992."] },
      { x: at(100), dir: 1, lines: ["Ten years of months. Is it warming?", "Hard to tell up close."] },
    ];
  }

  protected cellValue(i: number): number | null {
    return this.averaging ? null : this.monthly[i];
  }

  protected onUpdate(): void {
    const end = this.terrain.x0 + terrainWidth(this.terrain) - 8;
    if (this.ended || this.player.x < end || !this.player.grounded) return;
    this.ended = true;
    this.controlsEnabled = false;
    this.averaging = true;
    this.play([
      {
        zoom: {
          prompt: ["Step back: HOLD Z to average the months into years."],
          target: () => (this.farCam ??= revealCamera(this.terrain, 40, 40)),
          onProgress: (t) => {
            this.terrain.groundY = this.monthlyGround.map((m, i) => lerp(m, this.annualGround[i], t));
          },
        },
      },
      { pause: 1.8 },
      { say: ["Smoother. But still bumpy, year to year.", "Any single year, you could brush off."] },
      { run: () => (this.done = true) },
    ]);
  }

  draw(r: Renderer): void {
    drawBackdrop(r.px, THEMES.night, this.cam.cx, this.time, VIEW_W, VIEW_H, 1 - this.zoomProgress * 0.7);
    r.steps(this.terrain, this.cam, (i) => (Math.floor(i / 12) % 2 === 0 ? "#3e5641" : "#344a38"));

    for (let y = 0; y <= LAST_YEAR - FIRST_YEAR; y++) {
      const i = y * 12;
      const s = worldToScreen(this.cam, (i + 6) * CELL, this.terrain.groundY[i + 6], VIEW_W, VIEW_H);
      if (s.sx > -30 && s.sx < VIEW_W + 30) r.text(String(FIRST_YEAR + y), s.sx, s.sy + 5, { size: 7, color: "#a9c5a0", align: "center" });
    }
    r.particles(this.particles, this.cam);
    r.player(this.player, this.cam, this.time, { highlight: this.ended });
    this.drawHud(r);
    this.drawCaption(r);
  }

  private drawHud(r: Renderer): void {
    if (this.averaging) {
      r.text(`Averaging months → years  (${GLOBAL.meta.dataset})`, 6, 5, { size: 7, color: COLORS.dim });
      return;
    }
    const i = cellIndexAt(this.terrain, this.player.x);
    const year = FIRST_YEAR + Math.floor(i / 12);
    r.text(`${MONTHS[i % 12]} ${year}`, 6, 4, { color: COLORS.accent, size: 10, title: true });
    r.text(signed(this.monthly[i]), 6, 17, { color: COLORS.text, size: 9 });
    if (i > 0) {
      const diff = this.monthly[i] - this.monthly[i - 1];
      r.text(`vs last month ${signed(diff)}`, 6, 28, { size: 7, color: diff >= 0 ? "#f4a582" : "#92c5de" });
    }
    r.text(`vs ${GLOBAL.meta.baseline} average`, VIEW_W - 6, 5, { size: 7, color: COLORS.dim, align: "right" });
  }
}
