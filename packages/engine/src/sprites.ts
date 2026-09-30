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

/** Garment pixels, which a patterned outfit may colour per column. */
const GARMENT = new Set(["y", "Y"]);

export function drawSprite(
  ctx: CanvasRenderingContext2D, frame: Frame, x: number, y: number, flip = false, palette = SPRITE_PALETTE,
  shirt?: (col: number) => string,
): void {
  for (let row = 0; row < frame.length; row++) {
    const line = frame[row];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      if (ch === ".") continue;
      const drawCol = flip ? line.length - 1 - col : col;
      ctx.fillStyle = shirt && GARMENT.has(ch) ? shirt(drawCol) : palette[ch] ?? "#f0f";
      ctx.fillRect(x + drawCol, y + row, 1, 1);
    }
  }
}
