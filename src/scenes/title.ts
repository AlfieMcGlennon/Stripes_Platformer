import type { InputFrame } from "../core";
import { unlock } from "../core/audio";
import { GLOBAL } from "../data";
import { drawBackdrop, THEMES } from "../render/backdrop";
import { COLORS, stripeColor } from "../render/palette";
import { VIEW_H, VIEW_W, type Renderer } from "../render/renderer";
import { drawSprite, HERO } from "../render/sprites";
import type { Scene } from "./scene";

/**
 * Start screen. Browsers only allow sound after a gesture, so the first key or
 * tap here also unlocks audio (and asks for fullscreen on phones).
 */
export class TitleScene implements Scene {
  done = false;
  private time = 0;

  update(input: InputFrame, dt: number): void {
    this.time += dt;
    if (this.time > 0.3 && input.anyPressed) {
      unlock();
      if (matchMedia("(pointer: coarse)").matches) {
        document.documentElement.requestFullscreen?.().catch(() => undefined);
      }
      this.done = true;
    }
  }

  draw(r: Renderer): void {
    drawBackdrop(r.px, THEMES.dusk, this.time * 6, this.time, VIEW_W, VIEW_H);
    const values = GLOBAL.annual.values;
    const w = VIEW_W / values.length;
    values.forEach((v, i) => {
      r.px.fillStyle = stripeColor(v, GLOBAL.stripes.centre, GLOBAL.stripes.halfRange);
      const h = 18 + Math.round(v * 14);
      r.px.fillRect(Math.floor(i * w), VIEW_H - h, Math.ceil(w), h);
    });
    const bob = Math.round(Math.sin(this.time * 3) * 1.5);
    drawSprite(r.px, Math.floor(this.time * 3) % 2 ? HERO.runA : HERO.runB, VIEW_W / 2 - 5, 96 + bob);
    r.text("HEIGHT CHECK", VIEW_W / 2, 34, { size: 20, color: COLORS.accent, align: "center", title: true });
    r.text("a tiny game about noise, trends and the warming stripes", VIEW_W / 2, 60, { size: 8, color: COLORS.text, align: "center" });
    if (Math.floor(this.time * 2) % 2 === 0) {
      r.text("press any key / tap to start", VIEW_W / 2, 78, { size: 8, color: COLORS.dim, align: "center" });
    }
    r.text("M: mute", VIEW_W - 4, 4, { size: 8, color: COLORS.dim, align: "right" });
  }
}
