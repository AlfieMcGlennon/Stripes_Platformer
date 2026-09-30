import { lerp, worldToScreen, type CameraState } from "../core";
import { DERIVED, GLOBAL, olsSlope, signed } from "../data";
import { drawBackdrop, THEMES } from "../render/backdrop";
import { COLORS, stripeColor } from "../render/palette";
import { shade, VIEW_H, VIEW_W, type Renderer } from "../render/renderer";
import { buildTerrain, cellCentreX, cellIndexAt, terrainWidth } from "../world";
import { revealCamera, WalkScene } from "./scene";

/**
 * Level 3: climb the real annual series, one stripe-coloured step per year.
 * At the top the player holds Z to pull back; the sky fills with the warming
 * stripes as they do, then the game holds on the image in silence.
 */
export const CELL = 12;
export const PX_PER_DEGREE = 160;

export function colorForYear(index: number): string {
  return stripeColor(GLOBAL.annual.values[index], GLOBAL.stripes.centre, GLOBAL.stripes.halfRange);
}

export class StripesScene extends WalkScene {
  private ended = false;
  private revealed = false;
  private farCam: CameraState | null = null;

  constructor() {
    super(buildTerrain({ values: GLOBAL.annual.values, cellWidth: CELL, valueScale: PX_PER_DEGREE, zeroY: 0 }), 8);
    const at = (year: number) => (year - GLOBAL.annual.start) * CELL;
    this.triggers = [
      { x: at(1851), dir: 1, lines: ["Now one step per year, from 1850.", "Colour = how warm that year was."] },
      { x: at(1900), dir: 1, lines: ["Up a little. Down a little."] },
      { x: at(1955), dir: 1, lines: ["Any single step? Easy to brush off."] },
      { x: at(1985), dir: 1, lines: ["The ten years you walked month by month", "are just ten of these steps."] },
    ];
  }

  protected cellValue(i: number): number | null {
    return GLOBAL.annual.values[i];
  }

  protected onUpdate(): void {
    const end = this.terrain.x0 + terrainWidth(this.terrain) - 8;
    if (this.ended || this.player.x < end || !this.player.grounded) return;
    this.ended = true;
    this.controlsEnabled = false;
    this.play([
      { say: [`${DERIVED.lastYear}. You're at the top.`, "Now step back. HOLD Z."], wait: false },
      { zoom: { prompt: ["HOLD Z to zoom out."], target: () => (this.farCam ??= revealCamera(this.terrain)), seconds: 4 } },
      { run: () => { this.revealed = true; this.captionLines = []; } },
      { pause: 3 },
      { say: ["We started down there.", "Now we're here."] },
      {
        say: [
          `${DERIVED.lastYear}: about ${DERIVED.lastYearAnomaly.toFixed(1)} °C above the ${GLOBAL.meta.baseline} average (HadCRUT5).`,
          `The ten warmest years on record: all since ${DERIVED.warmestTen[0]}.`,
        ],
      },
      { say: ["No single step shows it. Together, they're the warming stripes."] },
      { run: () => (this.done = true) },
    ]);
  }

  draw(r: Renderer): void {
    const px = r.px;
    drawBackdrop(px, THEMES.stripes, this.cam.cx, this.time, VIEW_W, VIEW_H, 1 - this.zoomProgress);
    const t = this.terrain;
    // Sky stripes: faint while climbing, filling in as the player zooms out.
    const skyAlpha = this.revealed ? 1 : lerp(0.18, 1, Math.pow(this.zoomProgress, 1.5));
    for (let i = 0; i < t.groundY.length; i++) {
      const a = worldToScreen(this.cam, t.x0 + i * CELL, 0, VIEW_W, VIEW_H);
      const b = worldToScreen(this.cam, t.x0 + (i + 1) * CELL, 0, VIEW_W, VIEW_H);
      if (b.sx < 0 || a.sx > VIEW_W) continue;
      px.globalAlpha = skyAlpha;
      px.fillStyle = colorForYear(i);
      px.fillRect(Math.floor(a.sx), 0, Math.max(1, Math.ceil(b.sx) - Math.floor(a.sx)), VIEW_H);
    }
    px.globalAlpha = 1;
    const groundShade = lerp(1, 0.5, this.zoomProgress);
    r.steps(t, this.cam, (i) => shade(colorForYear(i), groundShade));
    if (this.zoomProgress > 0.6) r.stepOutline(t, this.cam, "#ffffff");
    this.drawYouStep(r);
    r.particles(this.particles, this.cam);
    r.player(this.player, this.cam, this.time, { highlight: this.ended });
    if (this.zoomProgress > 0.95) this.drawRevealLabels(r);
    else if (!this.ended) this.drawHud(r);
    this.drawCaption(r);
  }

  /** Pulse an outline round the player's own step so "you" survives the zoom. */
  private drawYouStep(r: Renderer): void {
    if (!this.ended) return;
    const i = cellIndexAt(this.terrain, this.player.x);
    const a = worldToScreen(this.cam, this.terrain.x0 + i * CELL, this.terrain.groundY[i], VIEW_W, VIEW_H);
    const b = worldToScreen(this.cam, this.terrain.x0 + (i + 1) * CELL, this.terrain.groundY[i], VIEW_W, VIEW_H);
    if (Math.floor(this.time * 3) % 2 === 0) {
      r.px.fillStyle = COLORS.accent;
      r.px.fillRect(Math.floor(a.sx) - 1, Math.round(a.sy) - 1, Math.max(3, Math.ceil(b.sx - a.sx) + 2), 2);
    }
  }

  private drawHud(r: Renderer): void {
    const i = cellIndexAt(this.terrain, this.player.x);
    r.text(`${GLOBAL.annual.start + i}`, 6, 4, { color: COLORS.accent, size: 10, title: true });
    r.text(signed(GLOBAL.annual.values[i]), 6, 17, { size: 9 });
    if (i >= 9) {
      const recent = olsSlope(GLOBAL.annual.values.slice(i - 9, i + 1)) * 10;
      r.text(`last 10 years: ${signed(recent)}/decade`, 6, 28, { size: 7, color: recent >= 0 ? "#f4a582" : "#92c5de" });
    }
    r.text(`vs ${GLOBAL.meta.baseline} average`, VIEW_W - 6, 5, { size: 6, color: COLORS.dim, align: "right" });
  }

  private drawRevealLabels(r: Renderer): void {
    const t = this.terrain;
    const first = worldToScreen(this.cam, cellCentreX(t, 0), t.groundY[0], VIEW_W, VIEW_H);
    r.text(`${GLOBAL.annual.start} ↓`, first.sx - 2, first.sy - 14, { size: 8 });
    const you = worldToScreen(this.cam, this.player.x, this.player.y, VIEW_W, VIEW_H);
    r.text(`${DERIVED.lastYear} · you`, you.sx - 10, you.sy - 12, { size: 8, color: COLORS.accent, align: "right" });
    // Legend: what the colours mean.
    const lx = VIEW_W - 104, ly = 6;
    for (let k = 0; k < 60; k++) {
      const v = GLOBAL.stripes.centre + ((k / 59) * 2 - 1) * GLOBAL.stripes.halfRange;
      r.px.fillStyle = stripeColor(v, GLOBAL.stripes.centre, GLOBAL.stripes.halfRange);
      r.px.fillRect(lx + k, ly, 1, 4);
    }
    r.text("cooler", lx - 2, ly - 1, { size: 6, align: "right" });
    r.text("warmer", lx + 62, ly - 1, { size: 6 });
    r.text(`colour centred on ${GLOBAL.stripes.reference}`, lx + 30, ly + 6, { size: 5, color: COLORS.dim, align: "center" });
  }
}
