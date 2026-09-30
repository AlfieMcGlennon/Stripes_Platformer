import type { InputFrame } from "../core";
import { GLOBAL, PALEO } from "../data";
import { COLORS } from "../render/palette";
import { VIEW_W, type Renderer } from "../render/renderer";
import type { Scene } from "./scene";

/** Sources and honest caveats. Pressing continue restarts the game. */
export class CreditsScene implements Scene {
  done = false;
  private time = 0;

  update(input: InputFrame, dt: number): void {
    this.time += dt;
    if (this.time > 1 && input.actionPressed) this.done = true;
  }

  draw(r: Renderer): void {
    r.clear();
    const lines: [string, string][] = [
      ["Day to day it's noise. Zoom out and it's a trend.", COLORS.accent],
      ["", ""],
      ["DATA", COLORS.dim],
      [`Global temperature: ${GLOBAL.meta.dataset}, Met Office Hadley Centre / CRU`, COLORS.text],
      [`(Morice et al. 2021, ${GLOBAL.meta.licence}), vs ${GLOBAL.meta.baseline}.`, COLORS.text],
      [`Ice age: ${PALEO.meta.dataset.replace(" v1.0", "")}.`, COLORS.text],
      ["Warming stripes concept: Ed Hawkins, showyourstripes.info (CC BY 4.0).", COLORS.text],
      ["", ""],
      ["SIMPLIFICATIONS", COLORS.dim],
      ["Height numbers in level 0 are made up; all climate numbers are real.", COLORS.text],
      ["Ice-age path is a straight line at its average rate; the last", COLORS.text],
      ["10,000 years are drawn flat. Paleo records are smoothed, so", COLORS.text],
      ["the rate comparison is between averages.", COLORS.text],
    ];
    lines.forEach(([text, color], i) => r.text(text, VIEW_W / 2, 14 + i * 10, { size: 6, color, align: "center" }));
    if (Math.floor(this.time * 2) % 2 === 0) r.text("▶ play again", VIEW_W / 2, 160, { size: 6, color: COLORS.accent, align: "center" });
  }
}
