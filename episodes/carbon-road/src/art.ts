import { BUST_ROWS, drawSprite, HERO, lookPalette, lookShirt, type Frame } from "@stripes/engine";

/**
 * Vehicles, roadside furniture and the rider, drawn with canvas primitives.
 *
 * Everything faces RIGHT, the direction of travel: the horse pulls from the front,
 * the locomotive leads with its smokebox and chimney, the car's bonnet and grille
 * are forward, and the airliner's nose is forward with its wings swept back. An
 * earlier version had the train and the aeroplane mirrored, which read as the
 * world's least convincing convoy.
 *
 * The rider is episode 1's hero sprite reading the same saved look, and each
 * vehicle draws them at the point in its own layering where they belong, which is
 * why `draw` takes a callback rather than the caller stamping a sprite on top.
 */
const OUTLINE = "#14182b";
const SPRITE_SCALE = 2;

/* ---------------- the hero ---------------- */

/**
 * The hero at an integer scale, optionally cropped to `rows`. This is the engine's
 * blitter with this episode's look applied -- an earlier version reimplemented the
 * loop here, which meant the engine's garment set had to be re-encoded too, and a
 * new garment character would have silently stopped being coloured.
 */
export function drawHero(
  ctx: CanvasRenderingContext2D, frame: Frame, x: number, y: number, scale = SPRITE_SCALE, rows?: number,
): void {
  drawSprite(ctx, frame, x, y, { palette: lookPalette(), shirt: lookShirt(), scale, rows });
}

export function drawHeroWalking(ctx: CanvasRenderingContext2D, x: number, groundY: number, phase: number): void {
  const frame = Math.floor(phase) % 2 === 0 ? HERO.runA : HERO.runB;
  drawHero(ctx, frame, x, groundY - HERO.stand.length * SPRITE_SCALE);
}

export function drawHeroStanding(ctx: CanvasRenderingContext2D, x: number, groundY: number): void {
  drawHero(ctx, HERO.stand, x, groundY - HERO.stand.length * SPRITE_SCALE);
}

export type Rider = (ctx: CanvasRenderingContext2D, x: number, seatY: number, scale: number) => void;

export const seatRider: Rider = (ctx, x, seatY, scale) =>
  drawHero(ctx, HERO.stand, x, seatY - BUST_ROWS * scale, scale, BUST_ROWS);

/* ---------------- shared bits ---------------- */

function shape(ctx: CanvasRenderingContext2D, path: () => void, fill: string, width = 1.4): void {
  ctx.beginPath();
  path();
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = width;
  ctx.stroke();
}

function spoked(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, spin: number, spokes = 10): void {
  ctx.fillStyle = OUTLINE;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#33384f";
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8b93ab";
  ctx.lineWidth = 1;
  for (let i = 0; i < spokes; i++) {
    const a = spin + (i * Math.PI * 2) / spokes;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * (r - 2.4), cy + Math.sin(a) * (r - 2.4));
    ctx.stroke();
  }
  ctx.fillStyle = "#a7afc4";
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(1.4, r * 0.24), 0, Math.PI * 2);
  ctx.fill();
}

function tyre(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, spin: number): void {
  ctx.fillStyle = "#15182a";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2b3147";
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ccd3e0";
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.46, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8b93ab";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const a = spin + (i * Math.PI * 2) / 5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r * 0.4, cy + Math.sin(a) * r * 0.4);
    ctx.stroke();
  }
}

function shadowUnder(ctx: CanvasRenderingContext2D, cx: number, groundY: number, rx: number): void {
  ctx.fillStyle = "rgba(5,6,13,0.36)";
  ctx.beginPath();
  ctx.ellipse(cx, groundY + 1, rx, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

/* ---------------- 1. horse and cart ---------------- */

/**
 * Cart behind, horse in front. The horse is built from real proportions: a deep
 * chest, a croup lower than the withers, a neck that rises forward, and fore and
 * hind legs that bend the opposite way to each other.
 */
function drawCart(ctx: CanvasRenderingContext2D, x: number, groundY: number, spin: number, rider?: Rider): void {
  shadowUnder(ctx, x + 52, groundY, 50);
  const step = Math.sin(spin * 2.2);
  const HIDE = "#7a4a28";
  const HIDE_DARK = "#5c3419";
  const MANE = "#2f1d10";

  // --- cart, at the back
  shape(ctx, () => {
    ctx.moveTo(x + 2, groundY - 16);
    ctx.lineTo(x + 40, groundY - 16);
    ctx.lineTo(x + 40, groundY - 30);
    ctx.lineTo(x + 6, groundY - 30);
  }, "#8a6136");
  ctx.fillStyle = "#61411f";
  for (let i = 0; i < 6; i++) ctx.fillRect(x + 8 + i * 5.5, groundY - 28, 1, 12);
  // coal in the bed
  ctx.fillStyle = "#2f3445";
  for (const [cx, cy, r] of [[14, 32, 5], [22, 33, 4], [29, 31, 3.4]] as [number, number, number][]) {
    ctx.beginPath();
    ctx.ellipse(x + cx, groundY - cy, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // shafts running forward to the harness
  ctx.strokeStyle = "#6a4826";
  ctx.lineWidth = 2.2;
  for (const dy of [0, 4]) {
    ctx.beginPath();
    ctx.moveTo(x + 40, groundY - 20 - dy);
    ctx.lineTo(x + 62, groundY - 24 - dy);
    ctx.stroke();
  }

  // --- horse, in front
  const hx = x + 58;
  // hind legs (bend backwards at the hock)
  ctx.strokeStyle = HIDE_DARK;
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  for (const [phase, ox] of [[1, 2], [-1, 6]] as [number, number][]) {
    const a = step * phase;
    ctx.beginPath();
    ctx.moveTo(hx + ox, groundY - 24);
    ctx.lineTo(hx + ox - 3 + a * 2, groundY - 13);
    ctx.lineTo(hx + ox + 1 + a * 5, groundY - 1);
    ctx.stroke();
  }
  // forelegs (straighter)
  for (const [phase, ox] of [[-1, 28], [1, 32]] as [number, number][]) {
    const a = step * phase;
    ctx.beginPath();
    ctx.moveTo(hx + ox, groundY - 25);
    ctx.lineTo(hx + ox + a * 3, groundY - 13);
    ctx.lineTo(hx + ox + a * 5, groundY - 1);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  // barrel: withers high at the front, croup lower at the back
  shape(ctx, () => {
    ctx.moveTo(hx - 2, groundY - 27);
    ctx.quadraticCurveTo(hx + 4, groundY - 36, hx + 16, groundY - 37);
    ctx.quadraticCurveTo(hx + 28, groundY - 38, hx + 33, groundY - 33);
    ctx.lineTo(hx + 34, groundY - 24);
    ctx.quadraticCurveTo(hx + 20, groundY - 20, hx + 2, groundY - 23);
  }, HIDE, 1.3);
  // chest shading
  ctx.fillStyle = HIDE_DARK;
  ctx.beginPath();
  ctx.ellipse(hx + 29, groundY - 28, 5, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // neck, rising forward
  shape(ctx, () => {
    ctx.moveTo(hx + 28, groundY - 36);
    ctx.quadraticCurveTo(hx + 38, groundY - 44, hx + 44, groundY - 52);
    ctx.lineTo(hx + 50, groundY - 50);
    ctx.quadraticCurveTo(hx + 44, groundY - 40, hx + 36, groundY - 31);
  }, HIDE, 1.3);

  // head: cheek then a tapering muzzle
  shape(ctx, () => {
    ctx.moveTo(hx + 43, groundY - 53);
    ctx.quadraticCurveTo(hx + 50, groundY - 57, hx + 55, groundY - 54);
    ctx.lineTo(hx + 60, groundY - 49);
    ctx.quadraticCurveTo(hx + 58, groundY - 45, hx + 53, groundY - 46);
    ctx.quadraticCurveTo(hx + 46, groundY - 47, hx + 44, groundY - 49);
  }, HIDE, 1.2);
  // ears
  ctx.fillStyle = HIDE;
  for (const [ex, ey] of [[46, 57], [50, 58]] as [number, number][]) {
    ctx.beginPath();
    ctx.moveTo(hx + ex, groundY - ey);
    ctx.lineTo(hx + ex + 1.4, groundY - ey - 5);
    ctx.lineTo(hx + ex + 3, groundY - ey + 0.5);
    ctx.closePath();
    ctx.fill();
  }
  // eye, nostril
  ctx.fillStyle = OUTLINE;
  ctx.beginPath();
  ctx.arc(hx + 49, groundY - 52, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(hx + 58, groundY - 48.5, 0.9, 0, Math.PI * 2);
  ctx.fill();
  // mane down the neck, and a forelock
  ctx.fillStyle = MANE;
  ctx.beginPath();
  ctx.moveTo(hx + 30, groundY - 37);
  ctx.quadraticCurveTo(hx + 40, groundY - 47, hx + 46, groundY - 55);
  ctx.lineTo(hx + 43, groundY - 55);
  ctx.quadraticCurveTo(hx + 36, groundY - 45, hx + 27, groundY - 36);
  ctx.closePath();
  ctx.fill();
  // tail
  ctx.strokeStyle = MANE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(hx - 1, groundY - 30);
  ctx.quadraticCurveTo(hx - 8, groundY - 24, hx - 7, groundY - 12);
  ctx.stroke();
  // harness
  ctx.strokeStyle = "#3a2a1c";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(hx + 24, groundY - 38);
  ctx.lineTo(hx + 26, groundY - 22);
  ctx.stroke();

  // --- rider on the bench, then the board in front of their knees
  rider?.(ctx, x + 22, groundY - 30, SPRITE_SCALE);
  shape(ctx, () => {
    ctx.moveTo(x + 30, groundY - 16);
    ctx.lineTo(x + 42, groundY - 16);
    ctx.lineTo(x + 42, groundY - 25);
    ctx.lineTo(x + 30, groundY - 25);
  }, "#b08a56");

  spoked(ctx, x + 12, groundY - 10, 10, spin, 10);
  spoked(ctx, x + 36, groundY - 8, 8, spin * 1.25, 8);
}

/* ---------------- 2. steam locomotive ---------------- */

/** Smokebox and chimney lead; cab and bunker trail. */
function drawLoco(ctx: CanvasRenderingContext2D, x: number, groundY: number, spin: number, rider?: Rider): void {
  shadowUnder(ctx, x + 52, groundY, 54);
  const IRON = "#5b6280";
  const IRON_DARK = "#3c4259";
  const BRASS = "#d9b25e";

  // frame and running plate
  ctx.fillStyle = IRON_DARK;
  ctx.fillRect(x + 4, groundY - 17, 96, 6);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x + 4, groundY - 17, 96, 6);

  // bunker at the rear
  shape(ctx, () => {
    ctx.moveTo(x + 4, groundY - 19);
    ctx.lineTo(x + 22, groundY - 19);
    ctx.lineTo(x + 22, groundY - 38);
    ctx.lineTo(x + 4, groundY - 38);
  }, IRON_DARK);
  ctx.fillStyle = "#2f3445";
  for (const [cx, cy, r] of [[10, 40, 4], [17, 41, 3.4]] as [number, number, number][]) {
    ctx.beginPath();
    ctx.ellipse(x + cx, groundY - cy, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // cab, with the rider inside
  shape(ctx, () => {
    ctx.moveTo(x + 22, groundY - 19);
    ctx.lineTo(x + 50, groundY - 19);
    ctx.lineTo(x + 50, groundY - 50);
    ctx.lineTo(x + 20, groundY - 50);
  }, IRON);
  ctx.fillStyle = "#141828";
  ctx.fillRect(x + 26, groundY - 46, 22, 21);
  rider?.(ctx, x + 28, groundY - 25, SPRITE_SCALE);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.4;
  ctx.strokeRect(x + 26, groundY - 46, 22, 21);
  ctx.fillStyle = IRON;
  ctx.fillRect(x + 36, groundY - 46, 2, 21);
  // cab roof, overhanging
  shape(ctx, () => {
    ctx.moveTo(x + 17, groundY - 50);
    ctx.lineTo(x + 53, groundY - 50);
    ctx.lineTo(x + 53, groundY - 54);
    ctx.lineTo(x + 17, groundY - 54);
  }, IRON_DARK);

  // boiler, running forward from the cab
  shape(ctx, () => {
    ctx.moveTo(x + 50, groundY - 20);
    ctx.lineTo(x + 92, groundY - 20);
    ctx.lineTo(x + 92, groundY - 40);
    ctx.lineTo(x + 50, groundY - 40);
  }, IRON);
  ctx.strokeStyle = IRON_DARK;
  ctx.lineWidth = 1.2;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 50 + i * 8, groundY - 40);
    ctx.lineTo(x + 50 + i * 8, groundY - 20);
    ctx.stroke();
  }
  // steam dome and safety valve
  shape(ctx, () => ctx.arc(x + 64, groundY - 40, 6, Math.PI, 0), BRASS);
  ctx.fillStyle = BRASS;
  ctx.fillRect(x + 76, groundY - 44, 3, 4);

  // smokebox at the front, with its door
  shape(ctx, () => {
    ctx.moveTo(x + 92, groundY - 18);
    ctx.lineTo(x + 100, groundY - 18);
    ctx.lineTo(x + 100, groundY - 42);
    ctx.lineTo(x + 92, groundY - 42);
  }, IRON_DARK);
  shape(ctx, () => ctx.arc(x + 99, groundY - 30, 8, -Math.PI / 2, Math.PI / 2), IRON);
  ctx.fillStyle = BRASS;
  ctx.beginPath();
  ctx.arc(x + 100, groundY - 30, 2.4, 0, Math.PI * 2);
  ctx.fill();

  // chimney, on the smokebox
  shape(ctx, () => {
    ctx.moveTo(x + 90, groundY - 42);
    ctx.lineTo(x + 100, groundY - 42);
    ctx.lineTo(x + 99, groundY - 56);
    ctx.lineTo(x + 103, groundY - 59);
    ctx.lineTo(x + 87, groundY - 59);
    ctx.lineTo(x + 91, groundY - 56);
  }, IRON_DARK);

  // lamp and buffer beam at the front
  ctx.fillStyle = "#ffe9a8";
  ctx.fillRect(x + 101, groundY - 24, 4, 4);
  ctx.fillStyle = "#b8392f";
  ctx.fillRect(x + 100, groundY - 19, 6, 9);

  spoked(ctx, x + 30, groundY - 11, 9, spin * 0.8, 10);
  spoked(ctx, x + 58, groundY - 12, 12, spin * 0.62, 12);
  spoked(ctx, x + 82, groundY - 10, 8, spin, 8);
  // coupling rod between the driven wheels
  ctx.strokeStyle = BRASS;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x + 58 + Math.cos(spin * 0.62) * 8, groundY - 12 + Math.sin(spin * 0.62) * 8);
  ctx.lineTo(x + 30 + Math.cos(spin * 0.8) * 6, groundY - 11 + Math.sin(spin * 0.8) * 6);
  ctx.stroke();
}

/* ---------------- 3. motor car ---------------- */

function drawCar(
  ctx: CanvasRenderingContext2D, x: number, groundY: number, spin: number, paint: string, trim: string, rider?: Rider,
): void {
  shadowUnder(ctx, x + 36, groundY, 36);
  const dark = paint === "#3fae74" ? "#27794f" : "#7d2119";

  // body: boot at the rear, long bonnet forward
  shape(ctx, () => {
    ctx.moveTo(x + 2, groundY - 12);
    ctx.lineTo(x + 3, groundY - 21);
    ctx.lineTo(x + 16, groundY - 23);
    ctx.lineTo(x + 50, groundY - 23);
    ctx.quadraticCurveTo(x + 66, groundY - 22, x + 70, groundY - 16);
    ctx.lineTo(x + 70, groundY - 10);
    ctx.lineTo(x + 60, groundY - 9);
    ctx.lineTo(x + 10, groundY - 9);
  }, paint);

  // cabin, set back from the bonnet
  shape(ctx, () => {
    ctx.moveTo(x + 14, groundY - 23);
    ctx.quadraticCurveTo(x + 20, groundY - 41, x + 34, groundY - 41);
    ctx.quadraticCurveTo(x + 48, groundY - 41, x + 52, groundY - 23);
  }, paint);
  ctx.fillStyle = "#141828";
  ctx.fillRect(x + 18, groundY - 38, 30, 17);
  rider?.(ctx, x + 21, groundY - 21, SPRITE_SCALE);
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#a9dcef";
  ctx.fillRect(x + 18, groundY - 38, 30, 17);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x + 18, groundY - 38, 30, 17);
  ctx.fillStyle = paint;
  ctx.fillRect(x + 32, groundY - 38, 2.4, 17);

  // grille, lamp, bumper, wing mirror
  ctx.fillStyle = trim;
  ctx.fillRect(x + 64, groundY - 20, 5, 8);
  for (let i = 0; i < 3; i++) ctx.fillRect(x + 63, groundY - 19 + i * 3, 7, 1);
  ctx.fillStyle = "#ffe9a8";
  ctx.beginPath();
  ctx.arc(x + 62, groundY - 22, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = trim;
  ctx.fillRect(x + 60, groundY - 11, 12, 2.4);
  ctx.fillRect(x + 1, groundY - 14, 8, 2.4);
  ctx.fillStyle = dark;
  ctx.fillRect(x + 14, groundY - 16, 40, 1.4);
  ctx.fillStyle = trim;
  ctx.fillRect(x + 50, groundY - 32, 4, 1.6);

  tyre(ctx, x + 20, groundY - 8, 8, spin);
  tyre(ctx, x + 56, groundY - 8, 8, spin);
}

/* ---------------- 4. airliner ---------------- */

/** Nose forward at the right, wings swept back to the left. `y` is the centreline. */
function drawJet(ctx: CanvasRenderingContext2D, x: number, y: number, spin: number, rider?: Rider): void {
  const SKIN = "#ccd3e0";
  const SHADE = "#98a1b6";
  const TRIM = "#6f778f";

  // far wing, swept back
  shape(ctx, () => {
    ctx.moveTo(x + 62, y + 1);
    ctx.lineTo(x + 34, y + 15);
    ctx.lineTo(x + 46, y + 15);
    ctx.lineTo(x + 74, y + 2);
  }, SHADE, 1);

  // tail fin at the rear
  shape(ctx, () => {
    ctx.moveTo(x + 10, y - 6);
    ctx.lineTo(x + 6, y - 28);
    ctx.lineTo(x + 14, y - 28);
    ctx.lineTo(x + 26, y - 7);
  }, SKIN);
  ctx.fillStyle = "#d1495b";
  ctx.beginPath();
  ctx.moveTo(x + 11, y - 14);
  ctx.lineTo(x + 8, y - 27);
  ctx.lineTo(x + 13.5, y - 27);
  ctx.lineTo(x + 16, y - 14);
  ctx.closePath();
  ctx.fill();
  // tailplane
  shape(ctx, () => {
    ctx.moveTo(x + 12, y - 6);
    ctx.lineTo(x + 2, y - 11);
    ctx.lineTo(x + 12, y - 11);
    ctx.lineTo(x + 24, y - 6);
  }, SHADE, 0.9);

  // fuselage: blunt tail on the left, tapering nose on the right
  shape(ctx, () => {
    ctx.moveTo(x + 10, y - 6);
    ctx.lineTo(x + 84, y - 6);
    ctx.quadraticCurveTo(x + 100, y - 5, x + 106, y);
    ctx.quadraticCurveTo(x + 100, y + 5, x + 84, y + 6);
    ctx.lineTo(x + 12, y + 6);
    ctx.quadraticCurveTo(x + 8, y + 2, x + 10, y - 6);
  }, SKIN);

  ctx.fillStyle = TRIM;
  ctx.fillRect(x + 12, y + 1.8, 88, 1.6);
  ctx.fillStyle = "#7fc6e0";
  for (let i = 0; i < 13; i++) ctx.fillRect(x + 22 + i * 5, y - 3.5, 2.4, 2.4);

  // cockpit at the nose, with the rider behind the glass
  ctx.fillStyle = "#141828";
  ctx.beginPath();
  ctx.moveTo(x + 92, y - 4.5);
  ctx.lineTo(x + 101, y - 1);
  ctx.lineTo(x + 92, y - 1);
  ctx.closePath();
  ctx.fill();
  rider?.(ctx, x + 92, y + 1, 1);
  ctx.globalAlpha = 0.36;
  ctx.fillStyle = "#7fc6e0";
  ctx.beginPath();
  ctx.moveTo(x + 92, y - 4.5);
  ctx.lineTo(x + 101, y - 1);
  ctx.lineTo(x + 92, y - 1);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // near wing and engines
  shape(ctx, () => {
    ctx.moveTo(x + 58, y + 3);
    ctx.lineTo(x + 28, y + 20);
    ctx.lineTo(x + 42, y + 20);
    ctx.lineTo(x + 72, y + 4);
  }, SKIN, 1.2);
  for (const [ex, ey] of [[46, 13], [58, 7]] as [number, number][]) {
    shape(ctx, () => ctx.ellipse(x + ex, y + ey, 7, 3.6, -0.18, 0, Math.PI * 2), TRIM, 1);
    ctx.fillStyle = "#2a2f45";
    ctx.beginPath();
    ctx.ellipse(x + ex + 6, y + ey - 0.6, 1.6, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.32 + 0.24 * Math.sin(spin * 6 + ex);
    ctx.fillStyle = "#ffbe6b";
    ctx.fillRect(x + ex - 12, y + ey - 1.2, 6, 2.4);
    ctx.globalAlpha = 1;
  }
}

/* ---------------- roadside furniture ---------------- */

/** A milepost carrying the year. Text is drawn by the caller, in view space. */
export function drawMilepost(ctx: CanvasRenderingContext2D, x: number, groundY: number): void {
  ctx.fillStyle = "#6a6f85";
  ctx.fillRect(x + 3, groundY - 14, 3, 14);
  shape(ctx, () => {
    ctx.moveTo(x - 6, groundY - 26);
    ctx.lineTo(x + 15, groundY - 26);
    ctx.lineTo(x + 15, groundY - 14);
    ctx.lineTo(x - 6, groundY - 14);
  }, "#e8e4d6", 1.2);
}

/** A billboard for whatever is new this decade. */
export function drawBillboard(ctx: CanvasRenderingContext2D, x: number, groundY: number): void {
  ctx.fillStyle = "#4a4130";
  ctx.fillRect(x + 6, groundY - 22, 4, 22);
  ctx.fillRect(x + 34, groundY - 22, 4, 22);
  shape(ctx, () => {
    ctx.moveTo(x, groundY - 46);
    ctx.lineTo(x + 44, groundY - 46);
    ctx.lineTo(x + 44, groundY - 22);
    ctx.lineTo(x, groundY - 22);
  }, "#1d2438", 1.4);
  ctx.fillStyle = "#2a3358";
  ctx.fillRect(x + 2, groundY - 44, 40, 20);
}

export function drawTelegraphPole(ctx: CanvasRenderingContext2D, x: number, groundY: number): void {
  ctx.fillStyle = "#4a3b2a";
  ctx.fillRect(x + 4, groundY - 54, 4, 54);
  ctx.fillRect(x - 3, groundY - 50, 18, 3);
  ctx.fillRect(x - 1, groundY - 44, 14, 2.4);
  ctx.strokeStyle = "rgba(20,24,43,0.6)";
  ctx.lineWidth = 1;
  for (const wy of [51, 45]) {
    ctx.beginPath();
    ctx.moveTo(x - 40, groundY - wy + 3);
    ctx.quadraticCurveTo(x + 6, groundY - wy - 1, x + 52, groundY - wy + 3);
    ctx.stroke();
  }
}

export function drawStreetlight(ctx: CanvasRenderingContext2D, x: number, groundY: number): void {
  ctx.fillStyle = "#565d75";
  ctx.fillRect(x + 4, groundY - 52, 3.4, 52);
  ctx.beginPath();
  ctx.moveTo(x + 4, groundY - 52);
  ctx.quadraticCurveTo(x + 5, groundY - 60, x + 18, groundY - 59);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#565d75";
  ctx.stroke();
  ctx.fillStyle = "#ffe9a8";
  ctx.beginPath();
  ctx.ellipse(x + 18, groundY - 57, 4, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.14;
  ctx.beginPath();
  ctx.moveTo(x + 18, groundY - 55);
  ctx.lineTo(x + 30, groundY);
  ctx.lineTo(x + 6, groundY);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawFence(ctx: CanvasRenderingContext2D, x: number, groundY: number): void {
  ctx.fillStyle = "#6a5233";
  for (let i = 0; i < 4; i++) ctx.fillRect(x + i * 13, groundY - 14, 2.6, 14);
  ctx.fillRect(x, groundY - 12, 42, 2);
  ctx.fillRect(x, groundY - 6, 42, 2);
}

/** The stop: a depot shed with a board showing where you have got to. */
export function drawDepot(ctx: CanvasRenderingContext2D, x: number, groundY: number): void {
  shape(ctx, () => {
    ctx.moveTo(x, groundY);
    ctx.lineTo(x, groundY - 40);
    ctx.lineTo(x + 78, groundY - 40);
    ctx.lineTo(x + 78, groundY);
  }, "#3a4260");
  // roof
  shape(ctx, () => {
    ctx.moveTo(x - 6, groundY - 40);
    ctx.lineTo(x + 39, groundY - 56);
    ctx.lineTo(x + 84, groundY - 40);
  }, "#2b3149");
  // doorway and windows
  ctx.fillStyle = "#141828";
  ctx.fillRect(x + 8, groundY - 26, 16, 26);
  ctx.fillStyle = "rgba(255,214,120,0.5)";
  for (let i = 0; i < 3; i++) ctx.fillRect(x + 34 + i * 13, groundY - 30, 9, 9);
  // name board, filled by the caller
  shape(ctx, () => {
    ctx.moveTo(x + 10, groundY - 50);
    ctx.lineTo(x + 68, groundY - 50);
    ctx.lineTo(x + 68, groundY - 38);
    ctx.lineTo(x + 10, groundY - 38);
  }, "#e8e4d6", 1.2);
}

/* ---------------- registry ---------------- */

export interface VehicleArt {
  id: "cart" | "loco" | "car" | "jet" | "clean";
  name: string;
  /** Overall width, for parking two vehicles side by side at a stop. */
  width: number;
  /** Where the character stands to board, from the left edge. */
  door: number;
  /** Exhaust origin, from the left edge and above the ground line. */
  stack: { x: number; y: number };
  draw: (ctx: CanvasRenderingContext2D, x: number, groundY: number, spin: number, rider?: Rider) => void;
  airborne?: boolean;
}

export const ART: Record<VehicleArt["id"], VehicleArt> = {
  cart: {
    id: "cart", name: "horse and cart", width: 108, door: 26, stack: { x: 24, y: 34 },
    draw: (c, x, gy, spin, rider) => drawCart(c, x, gy, spin, rider),
  },
  loco: {
    id: "loco", name: "steam locomotive", width: 108, door: 32, stack: { x: 95, y: 59 },
    draw: (c, x, gy, spin, rider) => drawLoco(c, x, gy, spin, rider),
  },
  car: {
    id: "car", name: "motor car", width: 72, door: 30, stack: { x: 4, y: 12 },
    draw: (c, x, gy, spin, rider) => drawCar(c, x, gy, spin, "#b8392f", "#e2c98f", rider),
  },
  clean: {
    id: "clean", name: "electric car", width: 72, door: 30, stack: { x: 4, y: 12 },
    draw: (c, x, gy, spin, rider) => drawCar(c, x, gy, spin, "#3fae74", "#cfe9d8", rider),
  },
  jet: {
    id: "jet", name: "airliner", width: 108, door: 88, stack: { x: 46, y: 13 }, airborne: true,
    draw: (c, x, gy, spin, rider) => drawJet(c, x, gy, spin, rider),
  },
};
