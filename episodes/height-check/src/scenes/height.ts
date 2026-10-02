import { worldToScreen } from "../core";
import { mulberry32, SPRITE_H } from "@stripes/engine";
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
/**
 * Right beside the player, who stands at 150 and cannot move during this phase. 136
 * rather than 140: the post is six wide with its highlight on the right edge, and
 * the sprite box starts at 145, so at 140 the one column that makes the post read as
 * round was permanently behind the player.
 */
const RULER_X = 136;
/**
 * A stadiometer reads as one by being the height of the person it measures: the post
 * stands from the ground to a little over their head, and the arm rests on the head
 * rather than floating at an offset of its own.
 *
 * SPRITE_H is 14, so 24 puts the top ten pixels clear -- about the proportion a real
 * height post has to a real person. The old ruler was 80, nearly six times the
 * character, which read as scenery rather than as a measurement.
 */
const RULER_H = 24;
/**
 * Low enough that the arm stays on the head.
 *
 * The sprite is a fixed 14 pixels however tall the reading is, so any magnification
 * at all walks the arm off the head as the year's growth accumulates. At 1.1 it rose
 * six pixels clear by day 365 -- 43% of the character's height -- and sat strictly
 * above the head on 338 days of the 365, while the comment here claimed it rested on
 * it. At 0.35 the whole year's spread is 2.8 pixels, so the arm is never more than
 * three pixels off the head and reads as sitting on it.
 *
 * The cost is that the post shows almost nothing, which is the honest outcome: a
 * 14-pixel person cannot legibly carry 6 cm. The reading is the number beside the
 * arm, and the evidence is the log and the chart, which print to a tenth of a
 * centimetre. The post's job is to make it a measurement of this person.
 */
const PX_PER_CM = 0.35;

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
      {
        /*
         * The invented numbers are disclosed here, where they are introduced, rather
         * than in a caption nine beats later. By then the reader has spent the whole
         * level treating them as a record of something.
         */
        say: [
          "Imagine measuring your height every morning,",
          "against the same post. These numbers are invented;",
          "everything after this level is measured data.",
        ],
      },
      { run: () => (this.ticking = true) },
      /*
       * A beat for the first difference to exist. `ticking` only starts the timer:
       * day one lands half a second later and the first difference a second later
       * still, so a caption pointing at "the differences down the side" used to
       * appear over the title card with no log drawn at all.
       */
      { pause: 1.2 },
      {
        say: ["Taller than yesterday? Shorter?", "Look at the differences down the side."],
        wait: false,
      },
      { until: () => this.shownDays >= WEEK },
      /*
       * Long enough to read. This caption cannot be held (`wait: false`) and `say`
       * beats do not queue, so the next beat overwrites it: at 11 words `holdFor`
       * wants 3.65s, and it gets 2.3s of ticker plus this.
       */
      { pause: 1.6 },
      {
        say: [
          "How you stand, whether you have slept, the time of day.",
          "None of it is growing or shrinking you — and all of it",
          "is bigger than a day's worth of growth.",
        ],
      },
      { run: () => (this.showChart = true) },
      {
        zoom: {
          prompt: ["Now keep measuring for a year.", "HOLD Z to fast-forward."],
          target: () => ({ ...this.cam }),
          seconds: 3.5,
          onProgress: (t) => (this.shownDays = Math.max(WEEK, Math.round(WEEK + t * (YEAR - WEEK)))),
        },
      },
      {
        /*
         * States the quantity the level never stated. Subtracting the endpoints of
         * the log gives the wrong answer, because day one carries the week's largest
         * positive wobble -- so the total has to be said rather than left to be
         * read off. The beat that followed this one restated the moral a second time
         * and told the reader what they had understood, which is the one thing an
         * explainer cannot assert; its only load-bearing line was the disclosure,
         * which now opens the level.
         */
        say: [
          "Pick any two days and you learn nothing. Take the whole",
          `year and it is obvious: you grew about ${(GROWTH_CM_PER_DAY * YEAR).toFixed(0)} cm.`,
          "Same measurements, same wobble — only the span changed.",
        ],
      },
      {
        say: [
          "Temperature works the same way, for the same reason.",
          "Let's go and look.  « » move · SPACE jump · Z zoom out",
        ],
        wait: false,
      },
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
    if (this.shownDays > 0) this.drawLog(r);
    if (this.showChart) this.drawChart(r);
    if (this.shownDays === 0) {
      r.text("HEIGHT CHECK", VIEW_W / 2, 20, { size: 30, color: COLORS.accent, align: "center", title: true });
      r.text("a tiny game about noise and trends", VIEW_W / 2, 44, { size: 8, color: COLORS.dim, align: "center" });
    }
    this.drawCaption(r);
  }

  /** How many times the post exaggerates height, against the sprite's own scale. */
  private magnification(): number {
    return Math.round(PX_PER_CM / (SPRITE_H / START_CM));
  }

  private drawRuler(r: Renderer): void {
    const px = r.px;
    const base = worldToScreen(this.cam, RULER_X, 0, VIEW_W, VIEW_H);
    const x = Math.round(base.sx);
    const top = Math.round(base.sy - RULER_H);
    px.fillStyle = "#1a1a2e";
    px.fillRect(x - 1, top - 1, 8, RULER_H + 1);
    px.fillStyle = COLORS.ruler;
    px.fillRect(x, top, 6, RULER_H);
    px.fillStyle = "#b8a27a";
    px.fillRect(x + 5, top, 1, RULER_H);
    px.fillStyle = "#6b5e3e";
    for (let i = 0; i <= RULER_H; i += 4) px.fillRect(x, top + i, i % 8 === 0 ? 4 : 2, 1);
    r.text(`scale ×${this.magnification()}`, x + 3, top - 13, { size: 7, color: COLORS.dim, align: "center" });
    if (this.shownDays === 0) return;

    /*
     * The arm sits at the reading and reaches across to the player's head, so the
     * post is visibly measuring them. It is drawn before the player, so the player
     * covers its far end -- which is what an arm resting on someone's head does.
     */
    const h = this.heights[this.shownDays - 1];
    const markerY = Math.round(base.sy - SPRITE_H - (h - START_CM) * PX_PER_CM);
    const headX = Math.round(worldToScreen(this.cam, this.player.x, 0, VIEW_W, VIEW_H).sx);
    const from = x + 6;
    px.fillStyle = COLORS.accent;
    px.fillRect(from, markerY, Math.max(4, headX + 3 - from), 1);
    // Left of the post: to the right it would sit on top of the player.
    r.text(`${h.toFixed(1)} cm`, x - 3, markerY - 5, {
      color: COLORS.accent, size: 8, align: "right",
    });
  }

  /**
   * The week's measurements, with the day-to-day differences beside them -- and, at
   * the top, the growth those differences are supposed to be compared against.
   *
   * That second number used to appear nowhere on screen. A day's growth is 0.016 cm,
   * which `toFixed(1)` prints as "0.0", and on the post it is a fiftieth of a pixel.
   * So the caption's claim -- that the wobble is bigger than a day's growth -- had
   * one half printed and the other half missing entirely, which made the level's
   * central sentence an assertion rather than something the reader could check.
   *
   * It survives the chart appearing, because the caption after the chart says "pick
   * any two days" and the chart is 0.3 pixels per day: adjacent days share a column.
   */
  private drawLog(r: Renderer): void {
    r.text(`a day's growth: +${GROWTH_CM_PER_DAY.toFixed(2)} cm`, 200, 2, { size: 7, color: COLORS.dim });
    for (let d = 0; d < Math.min(this.shownDays, WEEK); d++) {
      const up = d > 0 && this.heights[d] >= this.heights[d - 1];
      const diff = d === 0 ? "" : `  ${up ? "+" : "−"}${Math.abs(this.heights[d] - this.heights[d - 1]).toFixed(1)}`;
      const color = d === 0 ? COLORS.text : up ? "#f4a582" : "#92c5de";
      r.text(`Day ${d + 1}: ${this.heights[d].toFixed(1)}${diff}`, 200, 10 + d * 10, { size: 8, color });
    }
  }

  private drawChart(r: Renderer): void {
    const px = r.px;
    /*
     * Below the log, which now stays up. The log's seven rows run to y=78, and a
     * three-line caption plate starts at y=136, so this has to live in between.
     */
    const x0 = 196, y0 = 84, w = 116, h = 44;
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
