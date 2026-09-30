import { worldToScreen } from "../core";
import { COLORS } from "../render/palette";
import { VIEW_H, VIEW_W, type Renderer } from "../render/renderer";
import { buildTerrain, terrainWidth } from "../world";
import { WalkScene } from "./scene";

/**
 * Level 0: the height metaphor. The measurements are made up (a steady growth
 * plus realistic day-to-day noise) and the caption says so; every climate
 * number later in the game is real data.
 */
export const GROWTH_CM_PER_DAY = 6 / 365; // a growing teenager, roughly
export const NOISE_CM = 0.5; // posture, time of day, sloppy tape measure
const START_CM = 165;

/** Small seeded PRNG so the "measurements" are the same every play and in tests. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fakeHeights(days: number, seed = 7): number[] {
  const rand = mulberry32(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());
  return Array.from({ length: days }, (_, d) => START_CM + GROWTH_CM_PER_DAY * d + NOISE_CM * gauss());
}

const SLOW_DAYS = 7;
const YEAR = 365;
const RULER_X = 128;
const PX_PER_CM = 8;

type Phase = "intro" | "daily" | "year" | "walk";

export class HeightScene extends WalkScene {
  private heights = fakeHeights(YEAR);
  private shownDays = 0;
  private phase: Phase = "intro";
  private clock = 0;

  constructor() {
    super(buildTerrain({ values: new Array(40).fill(0), cellWidth: 12, valueScale: 1, zeroY: 0 }), 150);
    this.lookAhead = -25;
    this.cam = { ...this.cam, cy: this.player.y + this.lookAhead };
    // Stand still by the ruler until the measuring sequence is over.
    this.controlsEnabled = false;
    this.say(["Imagine measuring your height every morning."], () => this.startDaily());
  }

  private startDaily(): void {
    this.phase = "daily";
    this.say(["Taller than yesterday? Shorter? It jumps around."]);
  }

  protected onUpdate(dt: number): void {
    this.clock += dt;
    if (this.phase === "daily" && this.clock > 0.9 && this.shownDays < SLOW_DAYS) {
      this.clock = 0;
      this.shownDays++;
      if (this.shownDays === SLOW_DAYS) {
        this.say(["Posture, time of day, a wobbly tape measure...", "the noise is bigger than a day's growth."], () => {
          this.phase = "year";
          this.say(["Keep measuring. For a whole year."]);
        });
      }
    }
    if (this.phase === "year" && this.shownDays < YEAR) {
      this.shownDays = Math.min(YEAR, this.shownDays + Math.ceil(dt * 90));
      if (this.shownDays === YEAR) {
        this.say(["Any two days: noise. A whole year: you clearly grew.", "(Made-up numbers. Everything after this is real data.)"], () => {
          this.say(["Weather works the same way. Let's look.", "← → to move, SPACE to jump. Walk right."]);
          this.phase = "walk";
          this.controlsEnabled = true;
        });
      }
    }
    const end = this.terrain.x0 + terrainWidth(this.terrain) - 8;
    if (this.phase === "walk" && this.player.x >= end) this.done = true;
  }

  draw(r: Renderer): void {
    r.clear();
    const px = r.px;
    r.terrain(this.terrain, this.cam, () => COLORS.ground);

    // The ruler, with a marker at the latest measurement (exaggerated vertically).
    const base = worldToScreen(this.cam, RULER_X, 0, VIEW_W, VIEW_H);
    const rulerH = 80;
    const top = base.sy - rulerH;
    px.fillStyle = COLORS.ruler;
    px.fillRect(Math.round(base.sx), Math.round(top), 6, rulerH);
    r.text("(magnified)", base.sx + 3, top - 8, { size: 5, color: COLORS.dim, align: "center" });
    px.fillStyle = "#6b5e3e";
    for (let i = 0; i <= rulerH; i += 4) px.fillRect(Math.round(base.sx), Math.round(top + i), i % 8 === 0 ? 4 : 2, 1);
    if (this.shownDays > 0) {
      const h = this.heights[this.shownDays - 1];
      // The ruler is magnified: 1 cm = PX_PER_CM px, starting 16 px above the ground.
      const markerY = Math.round(base.sy - 16 - (h - START_CM) * PX_PER_CM);
      px.fillStyle = COLORS.accent;
      px.fillRect(Math.round(base.sx) - 3, markerY, 12, 1);
      r.text(`${h.toFixed(1)} cm`, base.sx + 10, markerY - 3, { color: COLORS.accent, size: 6 });
    }
    r.player(this.player, this.cam, this.time);

    this.drawLog(r);
    if (this.phase !== "intro" && this.phase !== "daily") this.drawChart(r);
    if (this.phase === "intro" && Math.floor(this.time * 2) % 2 === 0) {
      r.text("HEIGHT CHECK", VIEW_W / 2, 18, { size: 12, color: COLORS.accent, align: "center" });
    }
    this.drawCaption(r);
  }

  private drawLog(r: Renderer): void {
    if (this.phase !== "daily") return;
    const first = Math.max(0, this.shownDays - 7);
    for (let d = first; d < this.shownDays; d++) {
      const diff = d === 0 ? "" : ` (${this.heights[d] >= this.heights[d - 1] ? "+" : "−"}${Math.abs(this.heights[d] - this.heights[d - 1]).toFixed(1)})`;
      r.text(`Day ${d + 1}: ${this.heights[d].toFixed(1)} cm${diff}`, 190, 16 + (d - first) * 9, { size: 6, color: COLORS.text });
    }
  }

  private drawChart(r: Renderer): void {
    const px = r.px;
    const x0 = 196, y0 = 12, w = 116, h = 70;
    px.fillStyle = "rgba(255,255,255,0.06)";
    px.fillRect(x0, y0, w, h);
    const lo = START_CM - 2, hi = START_CM + 8;
    px.fillStyle = COLORS.accent;
    for (let d = 0; d < this.shownDays; d++) {
      const x = x0 + (d / YEAR) * w;
      const y = y0 + h - ((this.heights[d] - lo) / (hi - lo)) * h;
      px.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    r.text("height", x0 + 2, y0 + 2, { size: 5, color: COLORS.dim });
    r.text(`day ${this.shownDays}`, x0 + w - 2, y0 + h - 7, { size: 5, color: COLORS.dim, align: "right" });
  }
}
