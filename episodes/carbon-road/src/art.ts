import { HERO, SPRITE_PALETTE, type Frame } from "@stripes/engine";
import { lookPalette, lookShirt } from "@stripes/engine";

/**
 * Vehicles, drawn with canvas primitives rather than a character grid, so at
 * 480x270 they get real curves: round spoked wheels, a car roofline, a swept wing.
 *
 * The rider is episode 1's own hero sprite, reading the same saved look, and each
 * vehicle draws them at the point in its own layering where they belong -- on the
 * cart bench, behind the locomotive's cab window, behind the car's glass, at the
 * airliner's forward window. That is why `draw` takes a rider callback rather
 * than the caller stamping a sprite on top afterwards.
 */
const OUTLINE = "#14182b";
const SPRITE_SCALE = 2;
/** Rows of the hero frame that are head and torso; the rest is legs. */
const BUST_ROWS = 11;

export interface Paint {
  body: string;
  shade: string;
  trim: string;
  glass: string;
}

const IRON: Paint = { body: "#59607a", shade: "#3b4157", trim: "#8f96ad", glass: "#8fd3e8" };
const TIMBER: Paint = { body: "#8a6136", shade: "#61411f", trim: "#b08a56", glass: "#8fd3e8" };
const RED: Paint = { body: "#b8392f", shade: "#7d2119", trim: "#e2c98f", glass: "#a9dcef" };
const GREEN: Paint = { body: "#3fae74", shade: "#27794f", trim: "#cfe9d8", glass: "#a9dcef" };
const PLANE: Paint = { body: "#ccd3e0", shade: "#98a1b6", trim: "#6f778f", glass: "#7fc6e0" };

/* ---------------- the hero ---------------- */

/** Episode 1's sprite at an integer scale, optionally only the first `rows`. */
export function drawHero(
  ctx: CanvasRenderingContext2D, frame: Frame, x: number, y: number, scale = SPRITE_SCALE, rows = frame.length,
): void {
  const palette = { ...SPRITE_PALETTE, ...lookPalette() };
  const shirt = lookShirt();
  const limit = Math.min(rows, frame.length);
  for (let row = 0; row < limit; row++) {
    const line = frame[row];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      if (ch === ".") continue;
      ctx.fillStyle = shirt && (ch === "y" || ch === "Y") ? shirt(col) : palette[ch] ?? "#f0f";
      ctx.fillRect(Math.round(x) + col * scale, Math.round(y) + row * scale, scale, scale);
    }
  }
}

/** Walking, feet on `groundY`. */
export function drawHeroWalking(ctx: CanvasRenderingContext2D, x: number, groundY: number, phase: number): void {
  const frame = Math.floor(phase) % 2 === 0 ? HERO.runA : HERO.runB;
  drawHero(ctx, frame, x, groundY - HERO.stand.length * SPRITE_SCALE);
}

/** Standing still. */
export function drawHeroStanding(ctx: CanvasRenderingContext2D, x: number, groundY: number): void {
  drawHero(ctx, HERO.stand, x, groundY - HERO.stand.length * SPRITE_SCALE);
}

/** Head and torso only, for a seated rider. `y` is the seat line. */
function drawHeroSeated(ctx: CanvasRenderingContext2D, x: number, seatY: number, scale = SPRITE_SCALE): void {
  drawHero(ctx, HERO.stand, x, seatY - BUST_ROWS * scale, scale, BUST_ROWS);
}

/** A rider callback: the vehicle decides where and at what scale. */
export type Rider = (ctx: CanvasRenderingContext2D, x: number, seatY: number, scale: number) => void;

export const seatRider: Rider = (ctx, x, seatY, scale) => drawHeroSeated(ctx, x, seatY, scale);

/* ---------------- shared bits ---------------- */

function wheel(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, spin: number, spokes = 8): void {
  ctx.fillStyle = OUTLINE;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a2f45";
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7d8499";
  ctx.lineWidth = 1;
  for (let i = 0; i < spokes; i++) {
    const a = spin + (i * Math.PI * 2) / spokes;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2));
    ctx.stroke();
  }
  ctx.fillStyle = "#9aa2b8";
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(1.2, r * 0.22), 0, Math.PI * 2);
  ctx.fill();
}

function tyre(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, spin: number): void {
  ctx.fillStyle = "#1b1f2e";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c3cad8";
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7d8499";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const a = spin + (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r * 0.45, cy + Math.sin(a) * r * 0.45);
    ctx.stroke();
  }
}

function shape(ctx: CanvasRenderingContext2D, path: () => void, fill: string, stroke = OUTLINE, width = 1.4): void {
  ctx.beginPath();
  path();
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.stroke();
}

function shadow(ctx: CanvasRenderingContext2D, cx: number, groundY: number, rx: number): void {
  ctx.fillStyle = "rgba(5,6,13,0.34)";
  ctx.beginPath();
  ctx.ellipse(cx, groundY, rx, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
}

/* ---------------- vehicles ---------------- */

function drawCart(ctx: CanvasRenderingContext2D, x: number, groundY: number, spin: number, rider?: Rider): void {
  shadow(ctx, x + 40, groundY, 40);
  const walk = Math.sin(spin * 2);

  ctx.strokeStyle = TIMBER.shade;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 36, groundY - 18);
  ctx.lineTo(x + 54, groundY - 21);
  ctx.stroke();

  // horse
  const hx = x + 52;
  shape(ctx, () => ctx.ellipse(hx + 9, groundY - 24, 13, 9, 0, 0, Math.PI * 2), "#6f4524", OUTLINE, 1.2);
  ctx.strokeStyle = "#5d3820";
  ctx.lineWidth = 2.6;
  for (const [ox, ph] of [[-7, 0], [-3, 1], [11, 1], [15, 0]] as [number, number][]) {
    const a = walk * (ph ? -1 : 1) * 0.5;
    ctx.beginPath();
    ctx.moveTo(hx + 9 + ox, groundY - 19);
    ctx.lineTo(hx + 9 + ox + Math.sin(a) * 4, groundY - 1);
    ctx.stroke();
  }
  shape(ctx, () => {
    ctx.moveTo(hx + 18, groundY - 30);
    ctx.lineTo(hx + 26, groundY - 40);
    ctx.lineTo(hx + 31, groundY - 37);
    ctx.lineTo(hx + 23, groundY - 23);
  }, "#6f4524", OUTLINE, 1.2);
  shape(ctx, () => ctx.ellipse(hx + 29, groundY - 39, 6, 3.6, -0.5, 0, Math.PI * 2), "#6f4524", OUTLINE, 1.2);
  ctx.fillStyle = "#3b2415";
  ctx.beginPath();
  ctx.moveTo(hx + 20, groundY - 32);
  ctx.lineTo(hx + 27, groundY - 41);
  ctx.lineTo(hx + 24, groundY - 30);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(hx + 31, groundY - 40, 1.8, 1.8);
  ctx.strokeStyle = "#3b2415";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hx - 4, groundY - 27);
  ctx.lineTo(hx - 10, groundY - 15);
  ctx.stroke();

  // cart: bed, then the rider on the bench, then the front board over their knees
  shape(ctx, () => {
    ctx.moveTo(x + 2, groundY - 15);
    ctx.lineTo(x + 36, groundY - 15);
    ctx.lineTo(x + 36, groundY - 26);
    ctx.lineTo(x + 4, groundY - 26);
  }, TIMBER.body);
  ctx.fillStyle = TIMBER.shade;
  for (let i = 0; i < 5; i++) ctx.fillRect(x + 6 + i * 7, groundY - 24, 1, 9);
  ctx.fillStyle = "#3a3f52";
  ctx.beginPath();
  ctx.ellipse(x + 12, groundY - 28, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  rider?.(ctx, x + 20, groundY - 26, SPRITE_SCALE);

  // bench front, drawn after the rider so they sit behind it
  shape(ctx, () => {
    ctx.moveTo(x + 24, groundY - 15);
    ctx.lineTo(x + 38, groundY - 15);
    ctx.lineTo(x + 38, groundY - 22);
    ctx.lineTo(x + 24, groundY - 22);
  }, TIMBER.trim);

  wheel(ctx, x + 11, groundY - 8, 8, spin);
  wheel(ctx, x + 32, groundY - 9, 9, spin);
}

function drawLoco(ctx: CanvasRenderingContext2D, x: number, groundY: number, spin: number, rider?: Rider): void {
  shadow(ctx, x + 34, groundY, 34);

  ctx.fillStyle = IRON.shade;
  ctx.fillRect(x + 2, groundY - 14, 66, 5);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x + 2, groundY - 14, 66, 5);

  shape(ctx, () => {
    ctx.moveTo(x + 6, groundY - 16);
    ctx.lineTo(x + 40, groundY - 16);
    ctx.lineTo(x + 40, groundY - 32);
    ctx.lineTo(x + 6, groundY - 32);
  }, IRON.body);
  ctx.strokeStyle = IRON.trim;
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 6 + i * 8, groundY - 32);
    ctx.lineTo(x + 6 + i * 8, groundY - 16);
    ctx.stroke();
  }
  shape(ctx, () => ctx.arc(x + 8, groundY - 24, 7, -Math.PI / 2, Math.PI / 2), IRON.shade);
  shape(ctx, () => {
    ctx.moveTo(x + 9, groundY - 32);
    ctx.lineTo(x + 17, groundY - 32);
    ctx.lineTo(x + 16, groundY - 45);
    ctx.lineTo(x + 19, groundY - 47);
    ctx.lineTo(x + 7, groundY - 47);
    ctx.lineTo(x + 10, groundY - 45);
  }, IRON.body);
  shape(ctx, () => ctx.arc(x + 28, groundY - 32, 5, Math.PI, 0), IRON.trim);

  // cab: back wall and roof, then the rider, then the front pillar and window frame
  shape(ctx, () => {
    ctx.moveTo(x + 40, groundY - 16);
    ctx.lineTo(x + 66, groundY - 16);
    ctx.lineTo(x + 66, groundY - 44);
    ctx.lineTo(x + 38, groundY - 44);
    ctx.lineTo(x + 38, groundY - 40);
    ctx.lineTo(x + 40, groundY - 40);
  }, IRON.body);
  ctx.fillStyle = "#1a2033";
  ctx.fillRect(x + 42, groundY - 40, 22, 20);

  rider?.(ctx, x + 44, groundY - 20, SPRITE_SCALE);

  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.4;
  ctx.strokeRect(x + 42, groundY - 40, 22, 20);
  ctx.fillStyle = IRON.body;
  ctx.fillRect(x + 52, groundY - 40, 2, 20);
  ctx.fillRect(x + 38, groundY - 46, 30, 3);

  ctx.fillStyle = RED.body;
  ctx.fillRect(x + 1, groundY - 17, 4, 8);

  wheel(ctx, x + 13, groundY - 8, 6, spin);
  wheel(ctx, x + 27, groundY - 7, 5, spin * 1.2);
  wheel(ctx, x + 52, groundY - 10, 10, spin * 0.7, 10);
  ctx.strokeStyle = IRON.trim;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x + 13 + Math.cos(spin) * 4, groundY - 8 + Math.sin(spin) * 4);
  ctx.lineTo(x + 52 + Math.cos(spin * 0.7) * 7, groundY - 10 + Math.sin(spin * 0.7) * 7);
  ctx.stroke();
}

function drawCar(ctx: CanvasRenderingContext2D, x: number, groundY: number, spin: number, paint: Paint, rider?: Rider): void {
  shadow(ctx, x + 30, groundY, 28);

  shape(ctx, () => {
    ctx.moveTo(x + 2, groundY - 9);
    ctx.lineTo(x + 3, groundY - 16);
    ctx.lineTo(x + 13, groundY - 18);
    ctx.lineTo(x + 46, groundY - 18);
    ctx.lineTo(x + 57, groundY - 15);
    ctx.lineTo(x + 58, groundY - 8);
    ctx.lineTo(x + 50, groundY - 7);
    ctx.lineTo(x + 9, groundY - 7);
  }, paint.body);

  // cabin shell, then the rider inside, then glass and pillars over them
  shape(ctx, () => {
    ctx.moveTo(x + 15, groundY - 18);
    ctx.quadraticCurveTo(x + 22, groundY - 34, x + 34, groundY - 34);
    ctx.quadraticCurveTo(x + 45, groundY - 34, x + 47, groundY - 18);
  }, paint.body);
  ctx.fillStyle = "#151a2c";
  ctx.fillRect(x + 18, groundY - 31, 26, 14);

  rider?.(ctx, x + 20, groundY - 17, SPRITE_SCALE);

  ctx.globalAlpha = 0.3;
  ctx.fillStyle = paint.glass;
  ctx.fillRect(x + 18, groundY - 31, 26, 14);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x + 18, groundY - 31, 26, 14);
  ctx.fillStyle = paint.body;
  ctx.fillRect(x + 30, groundY - 31, 2, 14);

  ctx.fillStyle = paint.trim;
  ctx.fillRect(x + 2, groundY - 12, 7, 2);
  ctx.fillRect(x + 51, groundY - 12, 7, 2);
  ctx.fillStyle = "#ffe9a8";
  ctx.beginPath();
  ctx.arc(x + 56, groundY - 15, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = paint.shade;
  ctx.fillRect(x + 13, groundY - 13, 34, 1);

  tyre(ctx, x + 16, groundY - 6, 6.5, spin);
  tyre(ctx, x + 45, groundY - 6, 6.5, spin);
}

function drawJet(ctx: CanvasRenderingContext2D, x: number, y: number, spin: number, rider?: Rider): void {
  // y is the fuselage centreline: this one flies.
  ctx.fillStyle = PLANE.shade;
  shape(ctx, () => {
    ctx.moveTo(x + 36, y + 1);
    ctx.lineTo(x + 21, y + 14);
    ctx.lineTo(x + 32, y + 14);
    ctx.lineTo(x + 46, y + 2);
  }, PLANE.shade, OUTLINE, 1);

  shape(ctx, () => {
    ctx.moveTo(x + 4, y);
    ctx.quadraticCurveTo(x + 10, y - 7, x + 32, y - 7);
    ctx.lineTo(x + 64, y - 7);
    ctx.quadraticCurveTo(x + 74, y - 6, x + 76, y - 1);
    ctx.lineTo(x + 76, y + 1);
    ctx.quadraticCurveTo(x + 68, y + 6, x + 32, y + 6);
    ctx.quadraticCurveTo(x + 10, y + 6, x + 4, y);
  }, PLANE.body);

  // cockpit glazing, with the rider visible through it
  ctx.fillStyle = "#151a2c";
  ctx.beginPath();
  ctx.moveTo(x + 6, y - 1);
  ctx.lineTo(x + 15, y - 5);
  ctx.lineTo(x + 15, y - 1);
  ctx.closePath();
  ctx.fill();
  rider?.(ctx, x + 7, y + 1, 1);
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = PLANE.glass;
  ctx.beginPath();
  ctx.moveTo(x + 6, y - 1);
  ctx.lineTo(x + 15, y - 5);
  ctx.lineTo(x + 15, y - 1);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = PLANE.trim;
  ctx.fillRect(x + 10, y + 1.6, 62, 1.4);
  ctx.fillStyle = PLANE.glass;
  for (let i = 0; i < 11; i++) ctx.fillRect(x + 20 + i * 4.6, y - 4, 2, 2);

  shape(ctx, () => {
    ctx.moveTo(x + 64, y - 7);
    ctx.lineTo(x + 72, y - 24);
    ctx.lineTo(x + 78, y - 24);
    ctx.lineTo(x + 76, y - 6);
  }, PLANE.body);
  ctx.fillStyle = "#d1495b";
  ctx.beginPath();
  ctx.moveTo(x + 69, y - 13);
  ctx.lineTo(x + 74, y - 23);
  ctx.lineTo(x + 77.5, y - 23);
  ctx.lineTo(x + 73, y - 13);
  ctx.closePath();
  ctx.fill();

  shape(ctx, () => {
    ctx.moveTo(x + 70, y - 6);
    ctx.lineTo(x + 62, y - 11);
    ctx.lineTo(x + 68, y - 11);
    ctx.lineTo(x + 76, y - 6);
  }, PLANE.shade, OUTLINE, 0.8);

  shape(ctx, () => {
    ctx.moveTo(x + 42, y + 2);
    ctx.lineTo(x + 27, y + 19);
    ctx.lineTo(x + 40, y + 19);
    ctx.lineTo(x + 52, y + 3);
  }, PLANE.body, OUTLINE, 1.2);

  for (const [ex, ey] of [[33, 13], [42, 6]] as [number, number][]) {
    shape(ctx, () => ctx.ellipse(x + ex, y + ey, 6.5, 3.4, -0.2, 0, Math.PI * 2), PLANE.trim, OUTLINE, 1);
    ctx.fillStyle = "#2a2f45";
    ctx.beginPath();
    ctx.ellipse(x + ex - 5.5, y + ey, 1.6, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(spin * 6 + ex);
    ctx.fillStyle = "#ffbe6b";
    ctx.fillRect(x + ex + 5, y + ey - 1.2, 6, 2.4);
    ctx.globalAlpha = 1;
  }
}

export interface VehicleArt {
  id: "cart" | "loco" | "car" | "jet" | "clean";
  name: string;
  /** Where the character stands to board, from the left edge. */
  door: number;
  /** Exhaust origin, from the left edge and above the ground line. */
  stack: { x: number; y: number };
  draw: (ctx: CanvasRenderingContext2D, x: number, groundY: number, spin: number, rider?: Rider) => void;
  airborne?: boolean;
}

export const ART: Record<VehicleArt["id"], VehicleArt> = {
  cart: {
    id: "cart", name: "horse and cart", door: 26, stack: { x: 22, y: 30 },
    draw: (c, x, gy, spin, rider) => drawCart(c, x, gy, spin, rider),
  },
  loco: {
    id: "loco", name: "steam locomotive", door: 48, stack: { x: 13, y: 47 },
    draw: (c, x, gy, spin, rider) => drawLoco(c, x, gy, spin, rider),
  },
  car: {
    id: "car", name: "motor car", door: 26, stack: { x: 4, y: 10 },
    draw: (c, x, gy, spin, rider) => drawCar(c, x, gy, spin, RED, rider),
  },
  clean: {
    id: "clean", name: "electric car", door: 26, stack: { x: 4, y: 10 },
    draw: (c, x, gy, spin, rider) => drawCar(c, x, gy, spin, GREEN, rider),
  },
  jet: {
    id: "jet", name: "airliner", door: 16, stack: { x: 33, y: 7 }, airborne: true,
    draw: (c, x, gy, spin, rider) => drawJet(c, x, gy, spin, rider),
  },
};
