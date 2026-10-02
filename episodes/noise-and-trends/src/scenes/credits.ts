import type { InputFrame } from "../core";
import { DERIVED, GLOBAL } from "../data";
import { drawBackdrop, THEMES } from "../render/backdrop";
import { COLORS, stripeColor } from "../render/palette";
import { VIEW_H, VIEW_W, type Renderer } from "../render/renderer";
import type { Scene } from "./scene";
import { reduceMotion } from "@stripes/engine";

/** Sources and caveats, in reading order. Paginated at draw time to fit the view. */
/** Where the text starts, below the stripe band. */
const TOP = 18;

const CREDIT_LINES: [string, string, number][] = [
  ["Day to day it's noise. Zoom out and it's a trend.", COLORS.accent, 9],
  ["", "", 0],
  ["DATA", COLORS.dim, 7],
  [`Global temperature: ${GLOBAL.meta.dataset}, Met Office Hadley Centre / CRU`, COLORS.text, 7],
  [`(Morice et al. 2021, ${GLOBAL.meta.licence}), vs ${GLOBAL.meta.baseline}`, COLORS.text, 7],
  ["Ice age: Tierney et al. 2020, Nature · Warming rate: IPCC AR6 WG1 SPM A.2.2", COLORS.text, 7],
  ["Stripes concept: Ed Hawkins, showyourstripes.info (CC BY 4.0) · colours: ColorBrewer RdBu", COLORS.text, 7],
  ["", "", 0],
  ["SIMPLIFICATIONS", COLORS.dim, 7],
  ["Level 0 heights are illustrative and its post exaggerates height about 4x; every climate number comes from the data pipeline.", COLORS.text, 7],
  ["Ice-age exit: a straight line at its average pace over an assumed 7,000–10,000 years.", COLORS.text, 7],
  ["Holocene drawn flat. Before 1850 the zero is the late Holocene, after it 1850–1900.", COLORS.text, 7],
  ["Level 1 names El Niño, La Niña and Pinatubo as causes of the wobble. That is a plain-language account of year-to-year variability, not a formal attribution.", COLORS.text, 7],
  [`Stripe colours are centred on ${GLOBAL.stripes.reference}; quoted figures are vs ${GLOBAL.meta.baseline}.`, COLORS.text, 7],
  ["Ice-age colours add darker blues below the stripes scale; stripes saturate at +1.15 °C.", COLORS.text, 7],
  [`The rate race compares equal ${DERIVED.lastYear - GLOBAL.annual.start}-year spans; the ice-age side is still an average.`, COLORS.text, 7],
];

/** Sources and honest caveats over a band of stripes. Continue restarts. */
export class CreditsScene implements Scene {
  done = false;
  private time = 0;
  private page = 0;
  private paged: [string, string, number][][] | null = null;
  /** The height the current pagination was built for, so touch UI appearing repages. */
  private pagedFor = -1;

  update(input: InputFrame, dt: number): void {
    this.time += dt;
    if (this.time > 1.5 && input.actionPressed) {
      if (this.paged && this.page < this.paged.length - 1) {
        this.page++;
        this.time = 0;
      } else {
        this.done = true;
      }
    }
  }

  /*
   * Split into pages that fit the view rather than letting the tail fall off the
   * bottom, which is what happened once the simplifications grew: in the landscape
   * profile the list ran to y=198 against 164 of usable height. Nothing is cut,
   * because these are the honesty notes. A page break prefers a blank line, so a
   * heading is never left stranded at the foot of a page.
   */
  private pages(r: Renderer): [string, string, number][][] {
    // Touch buttons reserve the bottom of the view, so they change the page breaks.
    const avail = VIEW_H - TOP - 26 - r.bottomReserve;
    if (this.paged && this.pagedFor === avail) return this.paged;
    this.pagedFor = avail;
    this.page = Math.min(this.page, 0);
    const out: [string, string, number][][] = [];
    let cur: [string, string, number][] = [];
    let used = 0;
    for (const row of CREDIT_LINES) {
      const [text, , size] = row;
      const h = text ? r.wrap([text], VIEW_W - 12, size).length * (size + 3) : 4;
      if (used + h > avail && cur.length) {
        while (cur.length && !cur[cur.length - 1][0]) cur.pop();
        out.push(cur);
        cur = [];
        used = 0;
      }
      if (!(used === 0 && !text)) {
        cur.push(row);
        used += h;
      }
    }
    if (cur.length) out.push(cur);
    this.paged = out;
    return out;
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
    /*
     * Wrapped, not just centred. These lines were authored against a 320-wide view
     * and run up to 308px; in the portrait profile the view is 200 across and they
     * would be clipped at both ends. The engine's own wrapper measures in the font
     * they are drawn in, so this is the same break the captions get.
     */
    const pages = this.pages(r);
    const page = pages[Math.min(this.page, pages.length - 1)];
    let y = TOP;
    for (const [text, color, size] of page) {
      if (!text) {
        y += 4;
        continue;
      }
      for (const line of r.wrap([text], VIEW_W - 12, size)) {
        r.text(line, VIEW_W / 2, y, { size, color, align: "center" });
        y += size + 3;
      }
    }
    const more = this.page < pages.length - 1;
    if (pages.length > 1) {
      r.text(`${this.page + 1} / ${pages.length}`, VIEW_W / 2, VIEW_H - 24 - r.bottomReserve, {
        size: 7, color: COLORS.dim, align: "center",
      });
    }
    if (Math.floor(this.time * 2) % 2 === 0 && this.time > 1.5) {
      r.text(
        more ? "press any key / tap for more" : "press any key / tap to play again",
        VIEW_W / 2, VIEW_H - 14 - r.bottomReserve, { size: 8, color: COLORS.accent, align: "center" },
      );
    }
  }
}
