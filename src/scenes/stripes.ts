import { worldToScreen } from "../core";
import { DERIVED, GLOBAL, signed } from "../data";
import { COLORS, stripeColor } from "../render/palette";
import { VIEW_H, VIEW_W, type Renderer } from "../render/renderer";
import { buildTerrain, cellCentreX, cellIndexAt, terrainWidth } from "../world";
import { revealCamera, WalkScene } from "./scene";

/** Level 2: climb the real annual series, one stripe-coloured step per year. */
export const CELL = 12;
export const PX_PER_DEGREE = 160;
export function colorForYear(index: number): string {
  return stripeColor(GLOBAL.annual.values[index], GLOBAL.stripes.centre, GLOBAL.stripes.halfRange);
}

export class StripesScene extends WalkScene {
  private revealed = false;
  private ended = false;
  private skyStripes = 0.2;
  private skyTarget = 0.2;

  constructor() {
    super(buildTerrain({ values: GLOBAL.annual.values, cellWidth: CELL, valueScale: PX_PER_DEGREE, zeroY: 0 }), 8);
    const at = (year: number) => (year - GLOBAL.annual.start) * CELL;
    this.triggers = [
      { x: at(1851), dir: 1, lines: ["Now one step per year, starting in 1850.", "Colour = how warm that year was."] },
      { x: at(1885), dir: 1, lines: ["Up a little. Down a little."] },
      { x: at(1915), dir: 1, lines: ["Any single step? Easy to brush off."] },
      { x: at(1950), dir: 1, lines: ["Keep climbing."] },
      { x: at(1985), dir: 1, lines: ["You've been here before, month by month."] },
      { x: at(2005), dir: 1, lines: ["Each year is still only a small step."] },
    ];
  }

  protected onUpdate(dt: number): void {
    this.skyStripes += (this.skyTarget - this.skyStripes) * Math.min(1, dt * 1.5);
    const end = this.terrain.x0 + terrainWidth(this.terrain) - 8;
    if (this.ended || this.player.x < end || !this.player.grounded) return;
    this.ended = true;
    this.controlsEnabled = false;
    this.say([`${DERIVED.lastYear}. Now, step back.`], () => {
      this.captionLines = [];
      this.moveCamera(revealCamera(this.terrain), 4.5, () => {
        this.revealed = true;
        this.say(["We started down there.", "Now we're here."], () => {
          this.say([
            `${DERIVED.lastYear} was ${signed(DERIVED.lastYearAnomaly, 1)} warmer than the ${GLOBAL.meta.baseline} average.`,
            "No single step shows it. All of them together do.",
          ], () => {
            this.skyTarget = 1;
            this.say(["These are the warming stripes."], () => (this.done = true));
          });
        });
      });
    });
  }

  draw(r: Renderer): void {
    r.clear();
    const px = r.px;
    const t = this.terrain;
    // Faint full-height stripes in the sky; they become the classic graphic at the end.
    for (let i = 0; i < t.groundY.length; i++) {
      const a = worldToScreen(this.cam, t.x0 + i * CELL, 0, VIEW_W, VIEW_H);
      const b = worldToScreen(this.cam, t.x0 + (i + 1) * CELL, 0, VIEW_W, VIEW_H);
      if (b.sx < 0 || a.sx > VIEW_W) continue;
      px.globalAlpha = this.skyStripes;
      px.fillStyle = colorForYear(i);
      px.fillRect(Math.floor(a.sx), 0, Math.max(1, Math.ceil(b.sx) - Math.floor(a.sx)), VIEW_H);
    }
    px.globalAlpha = 1;
    r.terrain(t, this.cam, colorForYear, "rgba(255,255,255,0.7)");
    r.player(this.player, this.cam, this.time, this.ended);
    if (this.revealed) this.drawRevealLabels(r);
    else this.drawHud(r);
    this.drawCaption(r);
  }

  private drawHud(r: Renderer): void {
    const i = cellIndexAt(this.terrain, this.player.x);
    r.text(`${GLOBAL.annual.start + i}  ${signed(GLOBAL.annual.values[i])}`, 6, 6, { color: COLORS.accent });
    r.text(`vs ${GLOBAL.meta.baseline} average`, VIEW_W - 6, 6, { size: 5, color: COLORS.dim, align: "right" });
  }

  private drawRevealLabels(r: Renderer): void {
    const t = this.terrain;
    const first = worldToScreen(this.cam, cellCentreX(t, 0), t.groundY[0], VIEW_W, VIEW_H);
    r.text(`${GLOBAL.annual.start} ↓`, first.sx, first.sy - 16, { size: 6, color: COLORS.text });
    const you = worldToScreen(this.cam, this.player.x, this.player.y, VIEW_W, VIEW_H);
    r.text("you ↓", you.sx - 6, you.sy - 24, { size: 6, color: COLORS.accent, align: "right" });
  }
}
