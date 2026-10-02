import { describe, expect, it } from "vitest";
import type { InputFrame } from "../src/core";
import { buttonAt } from "../src/core/layout";
import {
  CLOTHES, cycleLook, getLook, HERO_FRAMES, lookFrames, lookPalette, lookShirt, OUTFITS, setLook,
  shirtStripes, SKINS, SPRITE_H, SPRITE_W,
} from "@stripes/engine";
import { DERIVED, PALEO } from "../src/data";
import type { Renderer } from "../src/render/renderer";
import { WalkScene } from "../src/scenes/scene";
import { allClimateThemes, climateTheme } from "../src/scenes/slideArt";
import { lifetimeWarming } from "../src/scenes/yours";
import { buildTerrain } from "../src/world";

const idle: InputFrame = { move: 0, jumpPressed: false, jumpHeld: false, zoomHeld: false, actionPressed: false, anyPressed: false };

describe("touch layout", () => {
  it("maps taps to buttons, including taps in the letterbox bars", () => {
    expect(buttonAt(20, 156)).toBe("left");
    expect(buttonAt(-30, 156)).toBe("left"); // left black bar on a wide phone
    expect(buttonAt(350, 156)).toBe("jump"); // right black bar
    expect(buttonAt(160, 60)).toBeNull();
  });

  it("ignores the zoom button when it isn't shown", () => {
    expect(buttonAt(260, 156, 6, true)).toBe("zoom");
    expect(buttonAt(260, 156, 6, false)).toBeNull();
  });
});

describe("slide climate themes", () => {
  it("stay within the 9 cached themes for any temperature", () => {
    const keys = new Set(allClimateThemes().map((t) => t.key));
    for (const v of [-50, PALEO.lgmDelta, -1, 0, 0.7, DERIVED.lastYearAnomaly, 5, 50]) {
      const theme = climateTheme(v);
      expect(keys.has(theme.key)).toBe(true);
      expect(theme.skyTop).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

class TestScene extends WalkScene {
  log: string[] = [];
  draw(_r: Renderer): void {}
}

describe("beat sequencer", () => {
  const flat = buildTerrain({ values: new Array(40).fill(0), cellWidth: 10, valueScale: 1, zeroY: 0 });

  it("runs say/wait, pause and run beats in order", () => {
    const s = new TestScene(flat, 50);
    s.play([
      { say: ["hello"] },
      { run: () => s.log.push("after-say") },
      { pause: 0.5 },
      { run: () => s.log.push("after-pause") },
    ]);
    expect(s.captionLines).toEqual(["hello"]);
    expect(s.waitingForAction).toBe(true);
    s.update(idle, 1 / 60);
    expect(s.log).toEqual([]);
    s.update({ ...idle, actionPressed: true }, 1 / 60);
    expect(s.log).toEqual(["after-say"]);
    for (let i = 0; i < 40; i++) s.update(idle, 1 / 60);
    expect(s.log).toEqual(["after-say", "after-pause"]);
  });

  it("zoom beats need holding, relax when released, and finish when held long enough", () => {
    const s = new TestScene(flat, 50);
    const far = { cx: 200, cy: 0, zoomX: 0.2, zoomY: 0.2 };
    s.play([{ zoom: { prompt: ["hold"], target: () => far, seconds: 1 } }, { run: () => s.log.push("zoomed") }]);
    expect(s.zoomAvailable).toBe(true);
    for (let i = 0; i < 30; i++) s.update({ ...idle, zoomHeld: true }, 1 / 60);
    const halfway = s.zoomProgress;
    expect(halfway).toBeGreaterThan(0);
    for (let i = 0; i < 30; i++) s.update(idle, 1 / 60);
    expect(s.zoomProgress).toBeLessThan(halfway);
    for (let i = 0; i < 90; i++) s.update({ ...idle, zoomHeld: true }, 1 / 60);
    expect(s.log).toEqual(["zoomed"]);
    expect(s.cam.zoomX).toBeCloseTo(0.2);
  });

  it("play() mid-zoom cancels the zoom cleanly", () => {
    const s = new TestScene(flat, 50);
    s.play([{ zoom: { prompt: ["hold"], target: () => ({ cx: 0, cy: 0, zoomX: 0.2, zoomY: 0.2 }) } }]);
    for (let i = 0; i < 10; i++) s.update({ ...idle, zoomHeld: true }, 1 / 60);
    s.play([{ say: ["next"] }]);
    expect(() => s.update(idle, 1 / 60)).not.toThrow();
    expect(s.zoomAvailable).toBe(false);
  });
});

describe("look", () => {
  it("cycles each field and wraps, and never reacts to climate data", () => {
    setLook({ skin: 0, clothes: 0, outfit: OUTFITS[0] });
    expect(cycleLook("skin", 1).skin).toBe(1);
    expect(cycleLook("skin", -1).skin).toBe(0);
    expect(cycleLook("skin", -1).skin).toBe(SKINS.length - 1); // wraps backwards
    expect(cycleLook("clothes", 1).clothes).toBe(1);
    expect(cycleLook("outfit", 1).outfit).toBe(OUTFITS[1]);
    for (let i = 2; i < OUTFITS.length; i++) cycleLook("outfit", 1);
    expect(cycleLook("outfit", 1).outfit).toBe(OUTFITS[0]); // wraps
  });

  /*
   * An outfit is a set of garments, not a recolour, so each one is its own frames.
   * They have to stay interchangeable: the same width, the same height, and a bust
   * crop that still lands on a torso.
   */
  it("gives every outfit its own garments at one interchangeable size", () => {
    const ids = [...OUTFITS];
    expect(ids.length).toBeGreaterThan(2);
    for (const id of ids) {
      for (const frame of Object.values(HERO_FRAMES[id])) {
        expect(frame.length).toBe(SPRITE_H);
        for (const row of frame) expect(row.length).toBe(SPRITE_W);
      }
    }
    // The raincoat has a hood and wellingtons; the summer kit has neither.
    expect(HERO_FRAMES.raincoat.stand.join("")).toContain("b");
    expect(HERO_FRAMES.summer.stand.join("")).not.toContain("b");
    expect(HERO_FRAMES.suit.stand.join("")).toContain("t");
    // Hair shows on everything but the hooded coat.
    expect(HERO_FRAMES.raincoat.stand.join("")).not.toContain("h");
    for (const id of ["suit", "summer", "stripes"] as const) {
      expect(HERO_FRAMES[id].stand.join("")).toContain("h");
    }
  });

  it("follows the chosen outfit when asked for frames", () => {
    setLook({ skin: 0, clothes: 0, outfit: "suit" });
    expect(lookFrames()).toBe(HERO_FRAMES.suit);
    setLook({ skin: 0, clothes: 0, outfit: "summer" });
    expect(lookFrames()).toBe(HERO_FRAMES.summer);
  });

  it("recolours the sprite palette and only patterns the garment when asked", () => {
    setLook({ skin: 2, clothes: 3, outfit: "raincoat" });
    const palette = lookPalette();
    expect(palette.s).toBe(SKINS[2]);
    expect(palette.y).toBe(CLOTHES[3].y);
    expect(palette.o).toBe("#1a1a2e"); // outline untouched
    expect(lookShirt()).toBeUndefined();
    setLook({ skin: 0, clothes: 0, outfit: "stripes" });
    expect(lookShirt()).toBeTypeOf("function");
  });

  it("runs the stripes outfit cold-to-warm across the sprite", () => {
    expect(shirtStripes(0)).toBe("#053061"); // darkest blue at the left edge
    expect(shirtStripes(9)).toBe("#67001f"); // darkest red at the right edge
  });

  it("falls back to a valid look when storage is unavailable or junk", () => {
    const look = getLook();
    expect(look.skin).toBeGreaterThanOrEqual(0);
    expect(look.skin).toBeLessThan(SKINS.length);
    expect(look.clothes).toBeLessThan(CLOTHES.length);
  });
});

describe("your stripes", () => {
  it("reports lifetime warming along the trend, or 'too short' for short spans", () => {
    const born1960 = lifetimeWarming(1960);
    expect(born1960.trendWarming).not.toBeNull();
    expect(born1960.trendWarming!).toBeGreaterThan(0.5);
    expect(lifetimeWarming(DERIVED.lastYear - 5).trendWarming).toBeNull();
  });
});
