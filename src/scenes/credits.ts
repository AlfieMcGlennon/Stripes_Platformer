import type { InputFrame } from "../core";
import { GLOBAL } from "../data";
import { drawBackdrop, THEMES } from "../render/backdrop";
import { COLORS, stripeColor } from "../render/palette";
import { VIEW_H, VIEW_W, type Renderer } from "../render/renderer";
import type { Scene } from "./scene";

/** Sources and honest caveats over a band of stripes. Continue restarts. */
export class CreditsScene implements Scene {
  done = false;
  private time = 0;

  update(input: InputFrame, dt: number): void {
    this.time += dt;
    if (this.time > 1.5 && input.actionPressed) this.done = true;
  }

  draw(r: Renderer): void {
    drawBackdrop(r.px, THEMES.stripes, this.time * 10, this.time, VIEW_W, VIEW_H, 0);
    const values = GLOBAL.annual.values;
    const w = VIEW_W / values.length;
    values.forEach((v, i) => {
      r.px.fillStyle = stripeColor(v, GLOBAL.stripes.centre, GLOBAL.stripes.halfRange);
      r.px.fillRect(Math.floor(i * w), 0, Math.ceil(w), 10);
    });
    const lines: [string, string, number][] = [
      ["Day to day it's noise. Zoom out and it's a trend.", COLORS.accent, 9],
      ["", "", 0],
      ["DATA", COLORS.dim, 7],
      [`Global temperature: ${GLOBAL.meta.dataset}, Met Office Hadley Centre / CRU`, COLORS.text, 7],
      [`(Morice et al. 2021, ${GLOBAL.meta.licence}), vs ${GLOBAL.meta.baseline}`, COLORS.text, 7],
      ["Ice age: Tierney et al. 2020, Nature · IPCC AR6 WG1 SPM A.2.2", COLORS.text, 7],
      ["Warming stripes concept: Ed Hawkins, showyourstripes.info (CC BY 4.0)", COLORS.text, 7],
      ["", "", 0],
      ["SIMPLIFICATIONS", COLORS.dim, 7],
      ["Level 0 heights are made up; every climate number is real.", COLORS.text, 7],
      ["The ice-age exit is drawn as a straight line at its average pace over", COLORS.text, 7],
      ["an assumed 7,000–10,000 years; the last 10,000 years are drawn flat.", COLORS.text, 7],
      ["Paleo records are smoothed, so the rate comparison is between averages.", COLORS.text, 7],
    ];
    let y = 18;
    for (const [text, color, size] of lines) {
      if (text) r.text(text, VIEW_W / 2, y, { size, color, align: "center" });
      y += size ? size + 3.5 : 6;
    }
    if (Math.floor(this.time * 2) % 2 === 0 && this.time > 1.5) {
      r.text("▶ play again", VIEW_W / 2, VIEW_H - 14, { size: 8, color: COLORS.accent, align: "center" });
    }
  }
}
