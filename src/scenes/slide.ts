import { worldToScreen } from "../core";
import { annualFor, DERIVED, GLOBAL, PALEO, signed } from "../data";
import { COLORS, stripeColor } from "../render/palette";
import { VIEW_H, VIEW_W, type Renderer } from "../render/renderer";
import { buildTerrain, groundAt, terrainWidth, DEFAULT_TUNING } from "../world";
import { revealCamera, WalkScene } from "./scene";

/**
 * Level 3: the slide back through time. x is a true time axis, so the recent
 * warming is a cliff and the deglaciation is a long ramp: the rate is visible
 * as steepness.
 *
 * Simplifications (stated in the credits and docs): the deglaciation is drawn
 * as a straight line at its average rate, and the Holocene as flat at the
 * pre-industrial level. Only 1850 onwards is instrumental data.
 */
export const YEARS_PER_CELL = 20;
export const CELL = 2;
export const PX_PER_DEGREE = 30;
const LGM_CE = 1950 - PALEO.lgmAgeYearsBP;
const DEGLACIATION_START_CE = 1950 - 20_000;
const DEGLACIATION_END_CE = DEGLACIATION_START_CE + PALEO.deglaciationYearsAssumed;
const FIRST_INSTRUMENTAL = GLOBAL.annual.start;

/** Temperature (vs pre-industrial) at a CE year along the simplified path. */
export function pathValue(yearCE: number): number {
  if (yearCE >= FIRST_INSTRUMENTAL) {
    const last = GLOBAL.annual.start + GLOBAL.annual.values.length - 1;
    return annualFor(Math.min(last, Math.round(yearCE)));
  }
  if (yearCE >= DEGLACIATION_END_CE) return 0;
  if (yearCE <= DEGLACIATION_START_CE) return PALEO.lgmDelta;
  const f = (yearCE - DEGLACIATION_START_CE) / (DEGLACIATION_END_CE - DEGLACIATION_START_CE);
  return PALEO.lgmDelta * (1 - f);
}

/** Samples every YEARS_PER_CELL years; recent cells average the instrumental years they cover. */
export function buildPathValues(): number[] {
  const values: number[] = [];
  for (let y = LGM_CE; y <= DERIVED.lastYear; y += YEARS_PER_CELL) {
    if (y + YEARS_PER_CELL > FIRST_INSTRUMENTAL) {
      const years = Array.from({ length: YEARS_PER_CELL }, (_, k) => y + k).filter((v) => v <= DERIVED.lastYear);
      values.push(years.reduce((a, v) => a + pathValue(v), 0) / years.length);
    } else values.push(pathValue(y));
  }
  // Make sure the path ends exactly on the latest year so the cliff top matches level 2.
  values.push(pathValue(DERIVED.lastYear));
  return values;
}

function xForYear(yearCE: number): number {
  return ((yearCE - LGM_CE) / YEARS_PER_CELL) * CELL;
}

function formatYear(yearCE: number): string {
  if (yearCE >= 0) return `${Math.round(yearCE)} CE`;
  const ago = Math.round((DERIVED.lastYear - yearCE) / 100) * 100;
  return `${ago.toLocaleString("en-GB")} years ago`;
}

export class SlideScene extends WalkScene {
  private ended = false;
  private revealed = false;

  constructor() {
    const terrain = buildTerrain({ values: buildPathValues(), cellWidth: CELL, valueScale: PX_PER_DEGREE, zeroY: 0, mode: "linear" });
    super(terrain, terrainWidth(terrain) - 6, { ...DEFAULT_TUNING, runSpeed: 150, snapDown: 10 });
    this.player.facing = -1;
    const lgm = Math.abs(PALEO.lgmDelta).toFixed(0);
    this.say(["Let's go further back. Walk left ←"]);
    this.triggers = [
      { x: xForYear(1850), dir: -1, lines: [`That drop was ${DERIVED.lastYear - 1850} years of warming.`] },
      { x: xForYear(-1000), dir: -1, lines: ["Before 1850: about 10,000 fairly steady years.", "Farming, towns and cities all began here."] },
      { x: xForYear(DEGLACIATION_END_CE), dir: -1, lines: ["Further back, the last ice age was ending."] },
      { x: xForYear((DEGLACIATION_START_CE + DEGLACIATION_END_CE) / 2), dir: -1, lines: [`About ${lgm} °C of warming...`, "spread over roughly 10,000 years."] },
    ];
  }

  protected onUpdate(): void {
    if (this.ended || this.player.x > 12 || !this.player.grounded) return;
    this.ended = true;
    this.controlsEnabled = false;
    this.say([`The last ice age: about ${Math.abs(PALEO.lgmDelta).toFixed(0)} °C colder than pre-industrial.`], () => {
      this.captionLines = [];
      this.moveCamera(revealCamera(this.terrain, 40, 20), 4, () => {
        this.revealed = true;
        this.say([
          `Ice age to pre-industrial: ~${DERIVED.deglacialRatePerCentury.toFixed(2)} °C per century.`,
          `Last ${DERIVED.recentTrendYears} years: ~${DERIVED.recentTrendPerCentury.toFixed(1)} °C per century.`,
        ], () => this.say([`Roughly ${DERIVED.rateRatio}× faster.`, "Same planet. A very different speed."], () => (this.done = true)));
      });
    });
  }

  draw(r: Renderer): void {
    r.clear();
    // Ground colour follows temperature, so the ice age reads blue and today red.
    const value = -groundAt(this.terrain, this.player.x) / PX_PER_DEGREE;
    const tint = stripeColor(this.revealed ? 0 : value, GLOBAL.stripes.centre, 2.5);
    r.terrain(this.terrain, this.cam, () => (this.revealed ? COLORS.ground : tint), "rgba(255,255,255,0.8)");
    r.player(this.player, this.cam, this.time, this.ended);
    if (this.revealed) this.drawRevealLabels(r);
    else {
      const year = LGM_CE + (this.player.x / CELL) * YEARS_PER_CELL;
      r.text(formatYear(year), 6, 6, { color: COLORS.accent });
      r.text(`${signed(value, 1)} vs pre-industrial`, 6, 15, { size: 6, color: COLORS.dim });
    }
    this.drawCaption(r);
  }

  private drawRevealLabels(r: Renderer): void {
    const t = this.terrain;
    const label = (x: number, text: string, color: string, dy: number, align: "left" | "center" | "right" = "center") => {
      const s = worldToScreen(this.cam, x, groundAt(t, x), VIEW_W, VIEW_H);
      r.text(text, s.sx, s.sy + dy, { size: 6, color, align });
    };
    // Trace the instrumental era in red: at this zoom it is a few pixels wide, which is the point.
    const px = r.px;
    px.fillStyle = "#d6604d";
    for (let x = xForYear(FIRST_INSTRUMENTAL); x <= terrainWidth(t); x += 0.5) {
      const s = worldToScreen(this.cam, x, groundAt(t, x), VIEW_W, VIEW_H);
      px.fillRect(Math.round(s.sx) - 1, Math.round(s.sy), 3, 3);
    }
    label(40, "ice age", "#92c5de", -14, "left");
    label(xForYear(-5500), "10,000 steady years", COLORS.dim, -12);
    label(terrainWidth(t) - 8, `last ${DERIVED.lastYear - FIRST_INSTRUMENTAL} years ↗`, "#f4a582", 6, "right");
    const axisY = VIEW_H - 44;
    r.px.fillStyle = COLORS.dim;
    r.px.fillRect(16, axisY, VIEW_W - 32, 1);
    r.text("20,000 years →", VIEW_W / 2, axisY + 2, { size: 5, color: COLORS.dim, align: "center" });
  }
}
