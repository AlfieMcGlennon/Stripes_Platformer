/**
 * Hand-made pixel sprites as strings: one char per pixel, "." is transparent.
 * The hero is a kid in a yellow raincoat (it's a weather game). Frames face
 * right; the renderer mirrors them for left.
 */
export const SPRITE_PALETTE: Record<string, string> = {
  o: "#1a1a2e", // outline
  y: "#ffd166", // main garment, recoloured by the chosen clothes
  Y: "#e3a72f", // main garment shade
  s: "#f6c9a4", // skin
  e: "#1a1a2e", // eye
  b: "#3a6ea5", // wellingtons
  w: "#fff6d5", // highlight, shirt, trainers
  r: "#ef8354", // scarf
  h: "#5a4634", // hair, where there is no hood
  t: "#b23a48", // tie
  k: "#434d63", // trousers and shorts
  d: "#23242e", // shoes
};

/*
 * The hero is composed rather than drawn whole: a head, a torso and a pair of legs,
 * all 10 px wide, so an outfit is a choice of three pieces and every frame stays the
 * same height. `y`/`Y` is always the main garment, which is what the clothes colour
 * recolours and what a patterned outfit paints per column -- so the stripes tee gets
 * the ramp while bare arms, trousers and hair do not.
 */
const HOOD = [
  "...oooo...",
  "..oywyyo..",
  ".oyyyyyyo.",
  ".oyysssso.",
  ".oyyssese.",
  ".oyysssso.",
];

const HAIR = [
  "...oooo...",
  "..ohwhho..",
  ".ohhhhhho.",
  ".ohhsssso.",
  ".ohhssese.",
  ".ohhsssso.",
];

/** Buttoned to the chin, with a scarf. */
const COAT = [
  "..orrrrro.",
  ".oyyyyyyo.",
  "oyYyyyyYyo",
  "oyYyyyyYyo",
  ".oyyyyyyo.",
];

/** Collar, shirt and a tie down the front, jacket either side. */
const JACKET = [
  "..owwwwo..",
  ".oyywtwyo.",
  "oyYywtwyYo",
  "oyYywwwyYo",
  ".oyyyyyyo.",
];

/** Short sleeves, so the arms are skin from the shoulder down. */
const TEE = [
  "..osssso..",
  ".oyyyyyyo.",
  "ossyyyysso",
  "ossyyyysso",
  ".oyyyyyyo.",
];

/** Long trousers in the garment colour, over wellingtons. */
const LEGS_WELLIES = {
  stand: ["..oyooyo..", "..obo.obo.", "..ooo.ooo."],
  runA: ["..oyooyo..", ".obo...obo", ".ooo...ooo"],
  runB: ["...oyyo...", "...obbo...", "...oooo..."],
  jump: ["..oyooyo..", ".obo..obo.", ".oo....oo."],
};

/** Suit trousers over dark shoes. */
const LEGS_SHOES = {
  stand: ["..okooko..", "..odo.odo.", "..ooo.ooo."],
  runA: ["..okooko..", ".odo...odo", ".ooo...ooo"],
  runB: ["...okko...", "...oddo...", "...oooo..."],
  jump: ["..okooko..", ".odo..odo.", ".oo....oo."],
};

/** Shorts, bare shins, trainers. */
const LEGS_TRAINERS = {
  stand: ["..okooko..", "..oso.oso.", "..owo.owo."],
  runA: ["..okooko..", ".oso...oso", ".owo...owo"],
  runB: ["...okko...", "...osso...", "...owwo..."],
  jump: ["..okooko..", ".oso..oso.", ".ow....wo."],
};

export type Frame = string[];
export interface HeroFrames {
  stand: Frame;
  runA: Frame;
  runB: Frame;
  jump: Frame;
}

type Legs = typeof LEGS_WELLIES;

function compose(head: Frame, torso: Frame, legs: Legs): HeroFrames {
  const body = [...head, ...torso];
  return {
    stand: [...body, ...legs.stand],
    runA: [...body, ...legs.runA],
    runB: [...body, ...legs.runB],
    jump: [...body, ...legs.jump],
  };
}

/** The garment sets a player can choose between. `stripes` is a patterned tee. */
export const OUTFIT_IDS = ["raincoat", "suit", "summer", "stripes"] as const;
export type OutfitId = (typeof OUTFIT_IDS)[number];

export const HERO_FRAMES: Record<OutfitId, HeroFrames> = {
  raincoat: compose(HOOD, COAT, LEGS_WELLIES),
  suit: compose(HAIR, JACKET, LEGS_SHOES),
  summer: compose(HAIR, TEE, LEGS_TRAINERS),
  stripes: compose(HAIR, TEE, LEGS_TRAINERS),
};

/** The default set. Call sites that want the player's own choice use `lookFrames()`. */
export const HERO = HERO_FRAMES.raincoat;

/** Sled drawn under the hero on the slide level. */
export const SLED: Frame = [
  "o..........o",
  "oooooooooooo",
  ".orrrrrrrro.",
  "..oooooooo..",
];

export const SPRITE_W = 10;
export const SPRITE_H = HERO.stand.length;

/** Pick a frame from the player's motion state, out of a chosen garment set. */
export function heroFrame(
  grounded: boolean, moving: boolean, stride: number, frames: HeroFrames = HERO,
): Frame {
  if (!grounded) return frames.jump;
  if (!moving) return frames.stand;
  return Math.floor(stride / 6) % 2 === 0 ? frames.runA : frames.runB;
}

/** Garment pixels, which a patterned outfit may colour per column. */
const GARMENT = new Set(["y", "Y"]);

export interface SpriteOptions {
  flip?: boolean;
  palette?: Record<string, string>;
  /** Per-column colour for garment pixels, e.g. the stripes outfit. */
  shirt?: (col: number) => string;
  /** Integer pixel size; 1 draws into a 320x180-style layer. */
  scale?: number;
  /** Draw only the first `rows` rows, e.g. head and torso for a seated figure. */
  rows?: number;
}

export function drawSprite(
  ctx: CanvasRenderingContext2D, frame: Frame, x: number, y: number, options: SpriteOptions = {},
): void {
  const { flip = false, palette = SPRITE_PALETTE, shirt, scale = 1 } = options;
  const limit = Math.min(options.rows ?? frame.length, frame.length);
  for (let row = 0; row < limit; row++) {
    const line = frame[row];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      if (ch === ".") continue;
      const drawCol = flip ? line.length - 1 - col : col;
      ctx.fillStyle = shirt && GARMENT.has(ch) ? shirt(drawCol) : palette[ch] ?? "#f0f";
      ctx.fillRect(Math.round(x) + drawCol * scale, Math.round(y) + row * scale, scale, scale);
    }
  }
}

/** Rows of a hero frame that are head and torso; the rest is legs. */
export const BUST_ROWS = 11;
