import type { InputFrame } from "../core";
import { DERIVED, GLOBAL } from "../data";
import { drawBackdrop, THEMES } from "../render/backdrop";
import { COLORS, stripeColor } from "../render/palette";
import { VIEW_H, VIEW_W, type Renderer } from "../render/renderer";
import type { Scene } from "./scene";
import { reduceMotion } from "@stripes/engine";

/** Sources and honest caveats over a band of stripes. Continue restarts. */
export class CreditsScene implements Scene {
  done = false;
  private time = 0;

  update(input: InputFrame, dt: number): void {
    this.time += dt;
    if (this.time > 1.5 && input.actionPressed) this.done = true;
  }

  draw(r: Renderer): void {
    drawBackdrop(r.px, THEMES.stripes, reduceMotion() ? 0 : this.time * 10, this.time, VIEW_W, VIEW_H, 0);
    const values = GLOBAL.annual.values;
    const w = VIEW_W / values.length;
    values.forEach((v, i) => {
      r.px.fillStyle = stripeColor(v, GLOBAL.stripes.centre, GLOBAL.stripes.halfRange);
      // Round both edges: a floored start with a ceiled width overdraws the
      // neighbour, which left a third of the years visibly narrower than the rest.
      const x0 = Math.round(i * w);
      r.px.fillRect(x0, 0, Math.round((i + 1) * w) - x0, 10);
    });
    const lines: [string, string, number][] = [
      ["Day to day it's noise. Zoom out and it's a trend.", COLORS.accent, 9],
      ["", "", 0],
      ["DATA", COLORS.dim, 7],
      [`Global temperature: ${GLOBAL.meta.dataset}, Met Office Hadley Centre / CRU`, COLORS.text, 7],
      [`(Morice et al. 2021, ${GLOBAL.meta.licence}), vs ${GLOBAL.meta.baseline}`, COLORS.text, 7],
      ["Ice age: Tierney et al. 2020, Nature · Warming rate: IPCC AR6 WG1 SPM A.2.2", COLORS.text, 7],
      ["Stripes concept: Ed Hawkins, showyourstripes.info (CC BY 4.0) · colours: ColorBrewer RdBu", COLORS.text, 7],
      ["", "", 0],
      ["SIMPLIFICATIONS", COLORS.dim, 7],
      ["Level 0 heights are illustrative and its post exaggerates height about 4x;", COLORS.text, 7],
      ["every climate number comes from the data pipeline.", COLORS.text, 7],
      ["Ice-age exit: a straight line at its average pace over an assumed 7,000–10,000 years.", COLORS.text, 7],
      ["Holocene drawn flat. Before 1850 the zero is the late Holocene, after it 1850–1900.", COLORS.text, 7],
      ["Level 1 names El Niño, La Niña and Pinatubo as causes of the wobble. That is a", COLORS.text, 7],
      ["plain-language account of year-to-year variability, not a formal attribution.", COLORS.text, 7],
      [`Stripe colours are centred on ${GLOBAL.stripes.reference}; quoted figures are vs ${GLOBAL.meta.baseline}.`, COLORS.text, 7],
      ["Ice-age colours add darker blues below the stripes scale; stripes saturate at +1.15 °C.", COLORS.text, 7],
      [`The rate race compares equal ${DERIVED.lastYear - GLOBAL.annual.start}-year spans; the ice-age side is still an average.`, COLORS.text, 7],
    ];
    /*
     * Wrapped, not just centred. These lines were authored against a 320-wide view
     * and run up to 308px; in the portrait profile the view is 200 across and they
     * would be clipped at both ends. The engine's own wrapper measures in the font
     * they are drawn in, so this is the same break the captions get.
     */
    let y = 18;
    for (const [text, color, size] of lines) {
      if (!text) {
        y += 4;
        continue;
      }
      for (const line of r.wrap([text], VIEW_W - 12, size)) {
        r.text(line, VIEW_W / 2, y, { size, color, align: "center" });
        y += size + 3;
      }
    }
    if (Math.floor(this.time * 2) % 2 === 0 && this.time > 1.5) {
      r.text("press any key / tap to play again", VIEW_W / 2, VIEW_H - 14, { size: 8, color: COLORS.accent, align: "center" });
    }
  }
}
