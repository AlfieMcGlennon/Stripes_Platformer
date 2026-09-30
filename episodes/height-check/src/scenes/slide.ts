import type { InputFrame } from "../core";
import { worldToScreen } from "../core";
import { setSlideVolume, sfx } from "../core/audio";
import { annualFor, DERIVED, GLOBAL, PALEO, signed } from "../data";
import { drawBackdrop, drawSnow, prewarmTheme } from "../render/backdrop";
import { COLORS } from "../render/palette";
import { VIEW_H, VIEW_W, type Renderer } from "../render/renderer";
import { buildTerrain, emit, groundAt, stepSled, terrainWidth } from "../world";
import { revealCamera, WalkScene } from "./scene";
import { allClimateThemes, climateTheme, drawMagnifier, landColor, drawRateRace, drawThermometer, snowFor, tempColor } from "./slideArt";
import { reduceMotion } from "@stripes/engine";

/**
 * Level 4: sled back through time. x is a true time axis, so steepness is the
 * rate of change: the last 175 years are a cliff you drop off in a blink, the
 * end of the ice age a long ride.
 *
 * Simplifications, stated on screen and in the credits: the deglaciation is a
 * straight line at its average pace and the Holocene is drawn flat. Only 1850
 * onwards is instrumental data.
 */
export const YEARS_PER_CELL = 20;
export const CELL = 3;
export const PX_PER_DEGREE = 40;
const LGM_CE = 1950 - PALEO.lgmAgeYearsBP;
const DEGLACIATION_START_CE = 1950 - 20_000;
const DEGLACIATION_END_CE = DEGLACIATION_START_CE + PALEO.deglaciationYearsAssumed;
const FIRST_INSTRUMENTAL = GLOBAL.annual.start;
const RACE_SECONDS = 6;

/**
 * Temperature at a CE year along the simplified path. Two references meet here:
 * 1850 onwards is HadCRUT5 vs 1850-1900; earlier years are Tierney 2020's LGM
 * anomaly relative to the late Holocene (4-0 ka), which is what the game labels
 * "the last few thousand years". The offset between those two zeros is small but
 * not zero, and is not applied -- see docs/REVIEW-v0.3.md.
 */
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
  values.push(pathValue(DERIVED.lastYear));
  return values;
}

export function xForYear(yearCE: number): number {
  return ((yearCE - LGM_CE) / YEARS_PER_CELL) * CELL;
}

function yearAt(x: number): number {
  return LGM_CE + (x / CELL) * YEARS_PER_CELL;
}

function formatYear(yearCE: number): string {
  if (yearCE >= 1000) return `${Math.round(yearCE)} CE`;
  const ago = Math.round((DERIVED.lastYear - yearCE) / 100) * 100;
  return `${ago.toLocaleString("en-GB")} years ago`;
}

/** Well-known moments along the way (approximate dates), so the ramp has places. */
const LANDMARKS: [number, string][] = [
  [1769, "Watt's steam engine"],
  [-2560, "pyramids of Giza"],
  [-3000, "Stonehenge begun"],
  [-9500, "first farming"],
  [-15000, "Lascaux cave paintings"],
  [-18000, "ice over Scotland · mammoths"],
];

/**
 * The race panel compares two spans of the same length, which is the only
 * like-for-like rate comparison the game can make.
 *
 * The ratio is quoted as a range, not a single number: the panel draws a band
 * because the length of the deglaciation is uncertain, and collapsing that band
 * to one integer would claim precision the data does not have. The old
 * "23-34x" figure (50 years vs the whole deglaciation) is deliberately gone --
 * it divided a 50-year trend by a 7,000-10,000-year average, so most of it was a
 * smoothing artefact rather than a difference in rate.
 */
export function raceCaption(): string[] {
  const years = DERIVED.lastYear - GLOBAL.annual.start;
  const slow = (DERIVED.deglacialRatePerCentury * years) / 100;
  const fast = (DERIVED.deglacialRateFastPerCentury * years) / 100;
  const measured = DERIVED.lastYearAnomaly;
  const low = Math.round(measured / fast);
  const high = Math.round(measured / slow);
  return [
    `Same ${years} years: ice-age pace +${slow.toFixed(2)}–${fast.toFixed(2)} °C; measured +${measured.toFixed(1)} °C.`,
    `About ${low}–${high}× faster.`,
  ];
}

export class SlideScene extends WalkScene {
  private ended = false;
  private revealed = false;
  private raceT = -1;
  private pastCliff = false;
  private revealTime = 0;

  constructor() {
    const terrain = buildTerrain({ values: buildPathValues(), cellWidth: CELL, valueScale: PX_PER_DEGREE, zeroY: 0, mode: "linear" });
    super(terrain, terrainWidth(terrain) - 6);
    this.player.facing = -1;
    // Build all climate skies now (during the fade) so sledding never hitches.
    for (const theme of allClimateThemes()) prewarmTheme(theme, VIEW_W, VIEW_H);
    this.lookAhead = -30;
    const lgm = Math.abs(PALEO.lgmDelta).toFixed(0);
    const [short, long] = DERIVED.deglaciationYearsRange.map((y) => (y / 1000).toFixed(0));
    this.play([{ say: ["Let's go back in time. Hold ← to slide."], wait: false }]);
    this.triggers = [
      { x: xForYear(1850), dir: -1, lines: [`Whoa. That drop was just ${DERIVED.lastYear - 1850} years.`] },
      { x: xForYear(-1000), dir: -1, lines: ["Before 1850: about 10,000 relatively stable years.", "Farming, towns and cities grew up as the climate settled."] },
      { x: xForYear(DEGLACIATION_END_CE), dir: -1, lines: ["Further back, the last ice age was ending."] },
      { x: xForYear((DEGLACIATION_START_CE + DEGLACIATION_END_CE) / 2), dir: -1, lines: [`About ${lgm} °C of warming over roughly ${short}–${long} thousand years.`, "(Drawn as a straight line at its average pace.)"] },
    ];
  }

  protected override updatePlayer(input: InputFrame, dt: number): void {
    const before = this.player;
    this.player = stepSled(this.player, this.controlsEnabled ? input.move : 0, this.terrain, dt);
    const speed = Math.abs(this.player.vx);
    setSlideVolume(this.ended ? 0 : speed / 300);
    if (speed > 120 && !reduceMotion() && Math.random() < speed / 400) {
      const cold = this.valueAt(this.player.x) < -1;
      emit(this.particles, {
        x: this.player.x + 6 * Math.sign(this.player.vx) * -1, y: this.player.y - 1,
        vx: -this.player.vx * 0.2 + (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 30,
        life: 0.4, color: cold ? "#eef4ff" : "#c9a27a", size: 1, gravity: 120,
      });
    }
    if (!this.pastCliff && before.x > xForYear(1850) && this.player.x <= xForYear(1850)) {
      this.pastCliff = true;
      sfx.whoosh();
    }
  }

  onExit(): void {
    setSlideVolume(0);
  }

  private valueAt(x: number): number {
    return -groundAt(this.terrain, x) / PX_PER_DEGREE;
  }

  protected override onUpdate(dt: number): void {
    if (this.raceT >= 0 && this.raceT < 1) this.raceT = Math.min(1, this.raceT + dt / RACE_SECONDS);
    if (this.revealed) this.revealTime += dt;
    if (this.ended || this.player.x > 12 || Math.abs(this.player.vx) > 5) return;
    this.ended = true;
    this.controlsEnabled = false;
    setSlideVolume(0);
    this.play([
      { say: [`The last ice age: about ${Math.abs(PALEO.lgmDelta).toFixed(0)} °C colder than the last few thousand years.`] },
      { run: () => (this.captionLines = []) },
      { camera: () => revealCamera(this.terrain, 30, 20), seconds: 4 },
      { run: () => { this.revealed = true; sfx.reveal(); } },
      { pause: 2.5 },
      { say: ["21,000 years in one picture.", "Everything since 1850 is that red sliver. Zoomed in, it's a wall."] },
      { run: () => { this.raceT = 0; this.captionLines = []; } },
      { until: () => this.raceT >= 1 },
      { say: raceCaption() },
      // Clear the panel: the closing line points at the 21,000-year picture, so
      // the picture has to be visible when it lands.
      { run: () => (this.raceT = -1) },
      {
        say: [
          "IPCC AR6: the world has warmed faster since 1970 than in any other",
          "50-year period for at least 2,000 years (high confidence).",
        ],
      },
      {
        say: [
          "The ice age ended as orbital shifts warmed the planet; the oceans released CO2 and ice melted, amplifying it.",
          "Today the trigger is us: greenhouse gases, mostly CO2 from fossil fuels.",
        ],
      },
      { say: ["Day to day, it's noise. Zoom out, and it's this."], wait: false },
      { pause: 4 },
      { run: () => (this.done = true) },
    ]);
  }

  draw(r: Renderer): void {
    const v = this.revealed ? 0 : this.valueAt(this.player.x);
    drawBackdrop(r.px, climateTheme(v), this.cam.cx, this.time, VIEW_W, VIEW_H, this.revealed ? 0 : 1);
    if (!this.revealed) drawSnow(r.px, snowFor(v), this.time, VIEW_W, VIEW_H, -this.player.vx * 0.05);
    if (this.revealed) this.drawPaleoStripes(r);
    r.slope(
      this.terrain, this.cam,
      (x) => (this.revealed ? "#0b0f1e" : landColor(this.valueAt(x))),
      (x) => (this.valueAt(x) < -1.5 ? "#f4f8ff" : "rgba(255,255,255,0.85)"),
    );
    this.drawLandmarks(r);
    r.particles(this.particles, this.cam);
    r.player(this.player, this.cam, this.time, { sled: true, highlight: this.ended && !this.revealed });
    if (this.revealed) this.drawRevealLabels(r);
    else {
      drawThermometer(r, v);
      const year = yearAt(this.player.x);
      r.text(formatYear(year), 22, 4, { color: COLORS.accent, size: 10, title: true });
      // Two different zeros: HadCRUT5 anomalies are vs 1850-1900, but the paleo
      // curve is Tierney 2020's LGM-minus-late-Holocene difference. Saying
      // "vs pre-industrial" for both would assert that the late Holocene sat
      // exactly at the 1850-1900 mean, which this data cannot support.
      const reference = year >= FIRST_INSTRUMENTAL ? `vs ${GLOBAL.meta.baseline}` : "vs the last few thousand years";
      r.text(`${signed(v, 1)} ${reference}`, 22, 17, { size: 8, color: COLORS.text });
    }
    if (this.raceT >= 0) drawRateRace(r, this.raceT);
    this.drawCaption(r);
  }

  /** 21,000 years of stripes: the modern warming is the red sliver at the edge. */
  private drawPaleoStripes(r: Renderer): void {
    const alpha = Math.min(1, this.revealTime / 1.5);
    const end = terrainWidth(this.terrain);
    r.px.globalAlpha = alpha;
    for (let sx = 0; sx < VIEW_W; sx++) {
      const wx = (sx + 0.5 - VIEW_W / 2) / this.cam.zoomX + this.cam.cx;
      if (wx < 0 || wx > end) continue;
      // Sample the right edge of each column so the thin modern sliver is never skipped.
      const edge = Math.min(end, wx + 0.5 / this.cam.zoomX);
      r.px.fillStyle = tempColor(this.valueAt(edge));
      r.px.fillRect(sx, 0, 1, VIEW_H);
    }
    r.px.globalAlpha = 1;
  }

  private drawLandmarks(r: Renderer): void {
    if (this.cam.zoomX < 0.5) return;
    for (const [year, label] of LANDMARKS) {
      const x = xForYear(year);
      const s = worldToScreen(this.cam, x, groundAt(this.terrain, x), VIEW_W, VIEW_H);
      if (s.sx < -60 || s.sx > VIEW_W + 60) continue;
      const px = r.px;
      px.fillStyle = "#5b3a29";
      px.fillRect(Math.round(s.sx), Math.round(s.sy) - 14, 2, 14);
      px.fillStyle = "#c9a27a";
      px.fillRect(Math.round(s.sx) - 5, Math.round(s.sy) - 16, 12, 5);
      r.text(label, s.sx + 1, s.sy - 27, { size: 7, align: "center", color: "#fff6d5" });
    }
  }

  private drawRevealLabels(r: Renderer): void {
    if (this.raceT >= 0) return;
    const label = (x: number, text: string, color: string, dy: number, align: "left" | "center" | "right" = "center") => {
      const s = worldToScreen(this.cam, x, groundAt(this.terrain, x), VIEW_W, VIEW_H);
      r.text(text, s.sx, s.sy + dy, { size: 8, color, align });
    };
    label(24, "ice age", "#ffffff", -26, "left");
    // Placed low in the dark ground so it never sits under the magnifier box.
    label(xForYear(-5000), "10,000 relatively stable years", "#ffffff", 64);
    r.text("← 21,000 years →", VIEW_W / 2, VIEW_H - 50, { size: 7, color: COLORS.dim, align: "center" });
    if (this.revealTime > 1.2) drawMagnifier(r, this.cam, this.terrain, (x) => this.valueAt(x), xForYear, Math.min(1, (this.revealTime - 1.2) / 0.8));
  }
}
