import { describe, expect, it } from "vitest";
import { lerpColor, parseColor, shade } from "../src/color";
import { advanceTween, follow, startTween, tweenDone, worldToScreen } from "../src/camera";
import {
  CLOTHES, cycleLook, lookPalette, lookShirt, OUTFITS, setLook, shirtStripes, SKINS,
} from "../src/look";
import { RDBU, stripeColor, stripePosition } from "../src/palette";
import { mulberry32 } from "../src/random";
import { BUST_ROWS, HERO, heroFrame, SPRITE_H, SPRITE_W } from "../src/sprites";

describe("colour", () => {
  it("parses and interpolates", () => {
    expect(parseColor("#053061")).toEqual([5, 48, 97]);
    expect(lerpColor("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  it("shades multiplicatively and clamps at white", () => {
    expect(shade("#404040", 2)).toBe("#808080");
    expect(shade("#ffffff", 2)).toBe("#ffffff");
  });
});

describe("stripe scale", () => {
  it("saturates rather than running off the end of the palette", () => {
    expect(stripePosition(99, 0.5, 0.64)).toBe(1);
    expect(stripePosition(-99, 0.5, 0.64)).toBe(-1);
  });

  it("maps the ends of the scale to the ends of RdBu", () => {
    expect(stripeColor(-1, 0, 1)).toBe(RDBU[0]);
    expect(stripeColor(1, 0, 1)).toBe(RDBU[RDBU.length - 1]);
  });

  it("is monotonic in position, and diverging in colour", () => {
    // The scale itself is diverging, so no single channel is monotonic: red peaks
    // at the near-white midpoint. What must hold is that position is monotonic in
    // value, and that each half is dominated by the channel it should be.
    const positions = [-0.4, -0.1, 0.2, 0.9].map((v) => stripePosition(v, 0.5, 0.64));
    for (let i = 1; i < positions.length; i++) expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    const [coldR, , coldB] = parseColor(stripeColor(-0.8, 0, 1));
    const [warmR, , warmB] = parseColor(stripeColor(0.8, 0, 1));
    expect(coldB).toBeGreaterThan(coldR);
    expect(warmR).toBeGreaterThan(warmB);
  });
});

describe("random", () => {
  it("is seeded, so procedural art is identical every run", () => {
    expect(mulberry32(11)()).toBe(mulberry32(11)());
    expect(mulberry32(11)()).not.toBe(mulberry32(23)());
  });
});

describe("camera", () => {
  it("tweens from start to finish and reports completion", () => {
    const tw = startTween({ cx: 0, cy: 0, zoomX: 1, zoomY: 1 }, { cx: 100, cy: 0, zoomX: 0.5, zoomY: 0.5 }, 1);
    expect(tweenDone(tw)).toBe(false);
    advanceTween(tw, 0.5);
    const end = advanceTween(tw, 0.6);
    expect(tweenDone(tw)).toBe(true);
    expect(end.cx).toBeCloseTo(100);
    expect(end.zoomX).toBeCloseTo(0.5);
  });

  it("follows towards a target without overshooting it", () => {
    let cam = { cx: 0, cy: 0, zoomX: 1, zoomY: 1 };
    for (let i = 0; i < 300; i++) cam = follow(cam, 50, 10, 1 / 60, 4);
    expect(cam.cx).toBeCloseTo(50, 1);
    expect(cam.cy).toBeCloseTo(10, 1);
  });

  it("puts the camera centre at the middle of the view", () => {
    const s = worldToScreen({ cx: 40, cy: 20, zoomX: 1, zoomY: 1 }, 40, 20, 320, 180);
    expect(s.sx).toBeCloseTo(160);
    expect(s.sy).toBeCloseTo(90);
  });
});

describe("hero sprite", () => {
  it("has square rows and a consistent frame size", () => {
    for (const frame of [HERO.stand, HERO.runA, HERO.runB, HERO.jump]) {
      expect(frame.length).toBe(SPRITE_H);
      for (const row of frame) expect(row.length).toBe(SPRITE_W);
    }
  });

  it("crops to head and torso without reaching the legs", () => {
    expect(BUST_ROWS).toBeLessThan(SPRITE_H);
  });

  it("picks a jump frame when airborne and alternates while running", () => {
    expect(heroFrame(false, true, 0)).toBe(HERO.jump);
    expect(heroFrame(true, false, 0)).toBe(HERO.stand);
    expect(heroFrame(true, true, 0)).not.toBe(heroFrame(true, true, 6));
  });
});

describe("look", () => {
  it("cycles each field and wraps", () => {
    setLook({ skin: 0, clothes: 0, outfit: OUTFITS[0] });
    expect(cycleLook("skin", -1).skin).toBe(SKINS.length - 1);
    expect(cycleLook("clothes", 1).clothes).toBe(1);
    // Derived from the list, so adding a garment set cannot silently break the wrap.
    for (let i = 1; i < OUTFITS.length; i++) {
      expect(cycleLook("outfit", 1).outfit).toBe(OUTFITS[i]);
    }
    expect(cycleLook("outfit", 1).outfit).toBe(OUTFITS[0]);
  });

  it("recolours only skin and garment, and patterns only when asked", () => {
    setLook({ skin: 2, clothes: 3, outfit: "raincoat" });
    expect(lookPalette().s).toBe(SKINS[2]);
    expect(lookPalette().y).toBe(CLOTHES[3].y);
    expect(lookPalette().o).toBe("#1a1a2e");
    expect(lookShirt()).toBeUndefined();
    setLook({ skin: 0, clothes: 0, outfit: "stripes" });
    expect(lookShirt()).toBeTypeOf("function");
  });

  it("runs the stripes outfit cold to warm across the sprite", () => {
    expect(shirtStripes(0)).toBe(RDBU[0]);
    expect(shirtStripes(SPRITE_W - 1)).toBe(RDBU[RDBU.length - 1]);
  });
});
