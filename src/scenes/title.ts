import type { InputFrame } from "../core";
import { reduceMotion } from "../core/motion";
import { GLOBAL } from "../data";
import { drawBackdrop, THEMES } from "../render/backdrop";
import { CLOTHES, cycleLook, getLook, lookPalette, lookShirt, SKINS, type Look } from "../render/look";
import { COLORS, stripeColor } from "../render/palette";
import { VIEW_H, VIEW_W, type Renderer } from "../render/renderer";
import { drawSprite, HERO } from "../render/sprites";
import type { Scene } from "./scene";

/**
 * Start screen. Browsers only allow sound after a gesture, so the first key or
 * tap here also unlocks audio (and asks for fullscreen on phones).
 *
 * It doubles as the look picker, which keeps it to one scene: the hero is already
 * on screen here, so the player sees the change as they make it.
 */
const FIELDS: { key: keyof Look; label: string }[] = [
  { key: "skin", label: "skin" },
  { key: "clothes", label: "clothes" },
  { key: "outfit", label: "outfit" },
];

const REPEAT = 0.16;

export class TitleScene implements Scene {
  done = false;
  readonly zoomAvailable = true; // shows the touch zoom button, used here to open the look picker
  readonly zoomHint = "look";
  private time = 0;
  private looking = false;
  private field = 0;
  private zoomWas = false;
  private repeat = 0;

  update(input: InputFrame, dt: number): void {
    this.time += dt;
    // Edge-detected, so holding the key does not immediately toggle back.
    const zoomEdge = input.zoomHeld && !this.zoomWas;
    this.zoomWas = input.zoomHeld;
    this.repeat = Math.max(0, this.repeat - dt);

    if (!this.looking) {
      // Checked before anyPressed, or opening the picker would also start the game.
      if (zoomEdge) {
        this.looking = true;
        return;
      }
      // Audio unlock and fullscreen happen in the input gesture handler (main.ts).
      if (input.anyPressed) this.done = true;
      return;
    }

    if (zoomEdge) {
      this.looking = false;
      return;
    }
    if (input.move !== 0 && this.repeat === 0) {
      cycleLook(FIELDS[this.field].key, input.move);
      this.repeat = REPEAT;
    }
    if (input.jumpPressed) this.field = (this.field + 1) % FIELDS.length;
  }

  draw(r: Renderer): void {
    // Held still under reduced motion: this scroll never stops on its own, which
    // is also what WCAG 2.2.2 is about.
    drawBackdrop(r.px, THEMES.dusk, reduceMotion() ? 0 : this.time * 6, this.time, VIEW_W, VIEW_H);
    const values = GLOBAL.annual.values;
    const w = VIEW_W / values.length;
    values.forEach((v, i) => {
      r.px.fillStyle = stripeColor(v, GLOBAL.stripes.centre, GLOBAL.stripes.halfRange);
      const h = 18 + Math.round(v * 14);
      const x0 = Math.round(i * w);
      r.px.fillRect(x0, VIEW_H - h, Math.round((i + 1) * w) - x0, h);
    });
    const bob = reduceMotion() ? 0 : Math.round(Math.sin(this.time * 3) * 1.5);
    const frame = this.looking ? HERO.stand : Math.floor(this.time * 3) % 2 ? HERO.runA : HERO.runB;
    drawSprite(r.px, frame, VIEW_W / 2 - 5, 96 + bob, false, lookPalette(), lookShirt());
    r.text("HEIGHT CHECK", VIEW_W / 2, 34, { size: 20, color: COLORS.accent, align: "center", title: true });
    r.text("a tiny game about noise, trends and the warming stripes", VIEW_W / 2, 60, { size: 8, color: COLORS.text, align: "center" });
    if (this.looking) this.drawPicker(r);
    else {
      if (Math.floor(this.time * 2) % 2 === 0) {
        r.text("press any key / tap to start", VIEW_W / 2, 78, { size: 8, color: COLORS.dim, align: "center" });
      }
      r.text("Z: change look", VIEW_W / 2, 112, { size: 7, color: COLORS.dim, align: "center" });
    }
    r.text("M: mute · T: text size", VIEW_W - 4, 4, { size: 8, color: COLORS.dim, align: "right" });
  }

  /** Rough picker: three rows, swatches for the two colour fields. */
  private drawPicker(r: Renderer): void {
    const look = getLook();
    const px = r.px;
    const top = 74;
    px.fillStyle = "#05060d";
    px.fillRect(96, top - 3, 128, 22);
    px.fillStyle = "#1b2140";
    px.fillRect(97, top - 2, 126, 20);

    FIELDS.forEach((f, i) => {
      const y = top + i * 6;
      const on = i === this.field;
      const label = f.key === "outfit" ? look.outfit : f.key === "clothes" ? CLOTHES[look.clothes].name : "";
      r.text(on ? `> ${f.label}` : `  ${f.label}`, 102, y - 2, { size: 7, color: on ? COLORS.accent : COLORS.dim });
      if (f.key === "outfit" || f.key === "clothes") {
        r.text(label, 216, y - 2, { size: 7, color: on ? COLORS.text : COLORS.dim, align: "right" });
      }
      if (f.key === "skin") this.swatches(px, SKINS, look.skin, 150, y - 1, on);
      if (f.key === "clothes") this.swatches(px, CLOTHES.map((c) => c.y), look.clothes, 150, y - 1, on);
    });

    r.text("← → change · SPACE next · Z done", VIEW_W / 2, 122, { size: 7, color: COLORS.dim, align: "center" });
  }

  private swatches(
    ctx: CanvasRenderingContext2D, colors: string[], selected: number, x: number, y: number, active: boolean,
  ): void {
    colors.forEach((c, i) => {
      const sx = x + i * 6;
      ctx.fillStyle = c;
      ctx.fillRect(sx, y, 5, 4);
      if (i === selected) {
        ctx.fillStyle = active ? COLORS.accent : COLORS.dim;
        ctx.fillRect(sx - 1, y - 1, 7, 1);
        ctx.fillRect(sx - 1, y + 4, 7, 1);
      }
    });
  }
}
