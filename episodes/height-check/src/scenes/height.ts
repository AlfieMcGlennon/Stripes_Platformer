import { worldToScreen } from "../core";
import { mulberry32 } from "@stripes/engine";
import { drawBackdrop, THEMES } from "../render/backdrop";
import { COLORS } from "../render/palette";
import { VIEW_H, VIEW_W, type Renderer } from "../render/renderer";
import { buildTerrain, terrainWidth } from "../world";
import { WalkScene } from "./scene";

/**
 * Level 0: the height metaphor. The measurements are made up (steady growth
 * plus realistic day-to-day wobble) and the caption says so; every climate
 * number later in the game is real data. Holding Z here introduces the verb
 * the whole game is built on: zoom out (in time) to see the trend.
 */
export const GROWTH_CM_PER_DAY = 6 / 365; // a growing teenager, roughly
export const NOISE_CM = 0.5; // posture, time of day, how you stand
const START_CM = 165;

export function fakeHeights(days: number, seed = 7): number[] {
  const rand = mulberry32(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());
  return Array.from({ length: days }, (_, d) => START_CM + GROWTH_CM_PER_DAY * d + NOISE_CM * gauss());
}

const WEEK = 7;
const YEAR = 365;
const RULER_X = 128;
const PX_PER_CM = 8;

export class HeightScene extends WalkScene {
  private heights = fakeHeights(YEAR);
  private shownDays = 0;
  private showChart = false;
  private walkPhase = false;
  private ticking = false;
  private dayTimer = 0;

  constructor() {
    super(buildTerrain({ values: new Array(40).fill(0), cellWidth: 12, valueScale: 1, zeroY: 0 }), 150);
    this.lookAhead = -25;
    this.cam = { ...this.cam, cy: this.player.y + this.lookAhead };
    this.controlsEnabled = false;
    this.play([
      { say: ["Imagine measuring your height every morning."] },
      { run: () => (this.ticking = true) },
      { say: ["Taller than yesterday? Shorter? It jumps around."], wait: false },
      { until: () => this.shownDays >= WEEK },
      { pause: 0.6 },
      { say: ["How you stand, the time of day... the wobble is bigger than a day's growth."] },
      { run: () => (this.showChart = true) },
      {
        zoom: {
          prompt: ["Now keep measuring for a year.", "HOLD Z to fast-forward."],
          target: () => ({ ...this.cam }),
          seconds: 3.5,
          onProgress: (t) => (this.shownDays = Math.max(WEEK, Math.round(WEEK + t * (YEAR - WEEK)))),
        },
      },
      { say: ["Any two days: noise. A whole year: you clearly grew.", "(Made-up numbers. Everything after this is real data.)"] },
      { say: ["The weather works the same way. Let's look.", "← → move · SPACE jump · Z zoom out"], wait: false },
      { run: () => { this.controlsEnabled = true; this.walkPhase = true; } },
    ]);
  }

  protected override onUpdate(dt: number): void {
    if (this.ticking && this.shownDays < WEEK) {
      this.dayTimer += dt;
      if (this.dayTimer > 0.5) {
        this.dayTimer = 0;
        this.shownDays++;
      }
    }
    const end = this.terrain.x0 + terrainWidth(this.terrain) - 8;
    if (this.walkPhase && this.player.x >= end) this.done = true;
  }

  draw(r: Renderer): void {
    drawBackdrop(r.px, THEMES.dusk, this.cam.cx, this.time, VIEW_W, VIEW_H);
    r.steps(this.terrain, this.cam, () => "#3e5641");
    this.drawRuler(r);
    r.particles(this.particles, this.cam);
    r.player(this.player, this.cam, this.time);
    if (this.shownDays > 0 && !this.showChart) this.drawLog(r);
    if (this.showChart) this.drawChart(r);
    if (this.shownDays === 0) {
      r.text("HEIGHT CHECK", VIEW_W / 2, 22, { size: 16, color: COLORS.accent, align: "center", title: true });
      r.text("a tiny game about noise and trends", VIEW_W / 2, 44, { size: 8, color: COLORS.dim, align: "center" });
    }
    this.drawCaption(r);
  }

  private drawRuler(r: Renderer): void {
    const px = r.px;
    const base = worldToScreen(this.cam, RULER_X, 0, VIEW_W, VIEW_H);
    const rulerH = 80;
    const x = Math.round(base.sx);
    const top = Math.round(base.sy - rulerH);
    px.fillStyle = "#1a1a2e";
    px.fillRect(x - 1, top - 1, 8, rulerH + 1);
    px.fillStyle = COLORS.ruler;
    px.fillRect(x, top, 6, rulerH);
    px.fillStyle = "#b8a27a";
    px.fillRect(x + 5, top, 1, rulerH);
    px.fillStyle = "#6b5e3e";
    for (let i = 0; i <= rulerH; i += 4) px.fillRect(x, top + i, i % 8 === 0 ? 4 : 2, 1);
    r.text("(magnified)", x + 3, top - 10, { size: 7, color: COLORS.dim, align: "center" });
    if (this.shownDays > 0) {
      const h = this.heights[this.shownDays - 1];
      const markerY = Math.round(base.sy - 16 - (h - START_CM) * PX_PER_CM);
      px.fillStyle = COLORS.accent;
      px.fillRect(x - 4, markerY, 14, 1);
      r.text(`${h.toFixed(1)} cm`, x + 12, markerY - 5, { color: COLORS.accent, size: 8 });
    }
  }

  private drawLog(r: Renderer): void {
    for (let d = 0; d < this.shownDays; d++) {
      const up = d > 0 && this.heights[d] >= this.heights[d - 1];
      const diff = d === 0 ? "" : `  ${up ? "+" : "−"}${Math.abs(this.heights[d] - this.heights[d - 1]).toFixed(1)}`;
      const color = d === 0 ? COLORS.text : up ? "#f4a582" : "#92c5de";
      r.text(`Day ${d + 1}: ${this.heights[d].toFixed(1)}${diff}`, 200, 10 + d * 10, { size: 8, color });
    }
  }

  private drawChart(r: Renderer): void {
    const px = r.px;
    const x0 = 196, y0 = 10, w = 116, h = 74;
    px.fillStyle = "#05060d";
    px.fillRect(x0 - 2, y0 - 2, w + 4, h + 4);
    px.fillStyle = "#141a33";
    px.fillRect(x0, y0, w, h);
    const lo = START_CM - 2, hi = START_CM + 8;
    for (let d = 0; d < this.shownDays; d++) {
      const x = x0 + (d / YEAR) * w;
      const y = y0 + h - ((this.heights[d] - lo) / (hi - lo)) * h;
      px.fillStyle = d === this.shownDays - 1 ? "#ffffff" : COLORS.accent;
      px.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    r.text("height", x0 + 3, y0 + 2, { size: 7, color: COLORS.dim });
    r.text(`day ${this.shownDays}`, x0 + w - 3, y0 + h - 10, { size: 7, color: COLORS.dim, align: "right" });
  }
}
