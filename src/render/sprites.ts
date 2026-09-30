/**
 * Hand-made pixel sprites as strings: one char per pixel, "." is transparent.
 * The hero is a kid in a yellow raincoat (it's a weather game). Frames face
 * right; the renderer mirrors them for left.
 */
export const SPRITE_PALETTE: Record<string, string> = {
  o: "#1a1a2e", // outline
  y: "#ffd166", // raincoat
  Y: "#e3a72f", // raincoat shade
  s: "#f6c9a4", // skin
  e: "#1a1a2e", // eye
  b: "#3a6ea5", // boots
  w: "#fff6d5", // highlight
  r: "#ef8354", // scarf
};

const HEAD = [
  "...oooo...",
  "..oywyyo..",
  ".oyyyyyyo.",
  ".oyysssso.",
  ".oyyssese.",
  ".oyysssso.",
  "..orrrrro.",
  ".oyyyyyyo.",
  "oyYyyyyYyo",
  "oyYyyyyYyo",
  ".oyyyyyyo.",
];

const LEGS = {
  stand: ["..oyooyo..", "..obo.obo.", "..ooo.ooo."],
  runA: ["..oyooyo..", ".obo...obo", ".ooo...ooo"],
  runB: ["...oyyo...", "...obbo...", "...oooo..."],
  jump: ["..oyooyo..", ".obo..obo.", ".oo....oo."],
};

export type Frame = string[];

export type Costume = "coat" | "jacket" | "summer";

/**
 * What the hero is wearing, as three palettes over one set of frames.
 *
 * `r` is the scarf and `Y` the shaded outer edge of the sleeves, so recolouring
 * both to skin turns the raincoat into a short-sleeved top with a bare neck
 * without needing a second sprite. `y` carries the hood as well as the coat, so
 * in `summer` it reads as a pale sun hat.
 */
export const COSTUMES: Record<Costume, Record<string, string>> = {
  coat: SPRITE_PALETTE,
  jacket: { ...SPRITE_PALETTE, y: "#6f9a63", Y: "#4e7347", r: "#f6c9a4" },
  summer: { ...SPRITE_PALETTE, y: "#ece8dc", Y: "#f6c9a4", r: "#f6c9a4", w: "#ffffff", b: "#b3846a" },
};

/**
 * Pick a costume from an already-smoothed temperature. Callers must pass a
 * multi-decade mean, never a single year -- see `scenes/costume.ts`.
 */
export function costumeFor(smoothed: number, mild: number, warm: number): Costume {
  return smoothed >= warm ? "summer" : smoothed >= mild ? "jacket" : "coat";
}

export const HERO = {
  stand: [...HEAD, ...LEGS.stand],
  runA: [...HEAD, ...LEGS.runA],
  runB: [...HEAD, ...LEGS.runB],
  jump: [...HEAD, ...LEGS.jump],
};

/** Sled drawn under the hero on the slide level. */
export const SLED: Frame = [
  "o..........o",
  "oooooooooooo",
  ".orrrrrrrro.",
  "..oooooooo..",
];

export const SPRITE_W = 10;
export const SPRITE_H = HERO.stand.length;

/** Pick a frame from the player's motion state. */
export function heroFrame(grounded: boolean, moving: boolean, stride: number): Frame {
  if (!grounded) return HERO.jump;
  if (!moving) return HERO.stand;
  return Math.floor(stride / 6) % 2 === 0 ? HERO.runA : HERO.runB;
}

export function drawSprite(
  ctx: CanvasRenderingContext2D, frame: Frame, x: number, y: number, flip = false, palette = SPRITE_PALETTE,
): void {
  for (let row = 0; row < frame.length; row++) {
    const line = frame[row];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      if (ch === ".") continue;
      ctx.fillStyle = palette[ch] ?? "#f0f";
      ctx.fillRect(x + (flip ? line.length - 1 - col : col), y + row, 1, 1);
    }
  }
}
