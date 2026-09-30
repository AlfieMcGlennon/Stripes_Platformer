import { stripeColor } from "./palette";
import { SPRITE_PALETTE, SPRITE_W } from "./sprites";

/**
 * The player's chosen appearance. Purely cosmetic: nothing here reacts to the
 * climate data, deliberately. An earlier version changed the hero's clothes as
 * the trend rose, which was cut -- the avatar should be the player, not another
 * readout, and the game already has better channels for temperature.
 *
 * The stripes outfit is the one nod to the subject, and it is a fixed blue-to-red
 * ramp rather than a data series, so it cannot be misread as a measurement.
 */
export const SKINS: string[] = ["#f6c9a4", "#f2d6c0", "#e0a878", "#c0825a", "#8d5524", "#5c3a21"];

export interface ClothesOption {
  name: string;
  /** Main garment colour and its shaded edge. */
  y: string;
  Y: string;
}

export const CLOTHES: ClothesOption[] = [
  { name: "raincoat", y: "#ffd166", Y: "#e3a72f" },
  { name: "green", y: "#6f9a63", Y: "#4e7347" },
  { name: "blue", y: "#4f7fbf", Y: "#365a8c" },
  { name: "red", y: "#d1495b", Y: "#9e3648" },
  { name: "purple", y: "#8e6bbf", Y: "#654a8c" },
  { name: "pale", y: "#ece8dc", Y: "#c6c2b6" },
];

export const OUTFITS = ["plain", "stripes"] as const;
export type Outfit = (typeof OUTFITS)[number];

export interface Look {
  skin: number;
  clothes: number;
  outfit: Outfit;
}

const KEY = "heightcheck.look";
const DEFAULT: Look = { skin: 0, clothes: 0, outfit: "plain" };

let current: Look = load();

function load(): Look {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const v = JSON.parse(raw) as Partial<Look>;
    return {
      skin: clamp(v.skin ?? 0, SKINS.length),
      clothes: clamp(v.clothes ?? 0, CLOTHES.length),
      outfit: v.outfit === "stripes" ? "stripes" : "plain",
    };
  } catch {
    return { ...DEFAULT };
  }
}

function clamp(i: number, length: number): number {
  return Number.isInteger(i) && i >= 0 && i < length ? i : 0;
}

export function getLook(): Look {
  return current;
}

export function setLook(next: Look): void {
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode or blocked storage: the choice just won't persist.
  }
}

/** Step one field of the look, wrapping. */
export function cycleLook(field: keyof Look, delta: number): Look {
  const next = { ...current };
  if (field === "outfit") {
    const i = (OUTFITS.indexOf(current.outfit) + delta + OUTFITS.length) % OUTFITS.length;
    next.outfit = OUTFITS[i];
  } else {
    const length = field === "skin" ? SKINS.length : CLOTHES.length;
    next[field] = (current[field] + delta + length) % length;
  }
  setLook(next);
  return next;
}

/** Sprite palette for a look: the shared geometry recoloured. */
export function lookPalette(look: Look = current): Record<string, string> {
  const clothes = CLOTHES[look.clothes];
  return { ...SPRITE_PALETTE, s: SKINS[look.skin], y: clothes.y, Y: clothes.Y };
}

/**
 * Per-column garment colour for the stripes outfit: a fixed blue-to-red ramp
 * across the sprite, so it reads as warming stripes without standing for any
 * particular year's data.
 */
export function shirtStripes(col: number): string {
  const t = SPRITE_W <= 1 ? 0 : (col / (SPRITE_W - 1)) * 2 - 1;
  return stripeColor(t, 0, 1);
}

/** The column shader for a look, or undefined when the garment is plain. */
export function lookShirt(look: Look = current): ((col: number) => string) | undefined {
  return look.outfit === "stripes" ? shirtStripes : undefined;
}
