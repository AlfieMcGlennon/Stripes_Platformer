import { screenX, type Walk } from "@stripes/engine";
import { ART, type VehicleArt } from "./art";
import { LANES, ROAD_Y } from "./backdrop";
import { LAST_YEAR, START_YEAR } from "./data";
import { COLORS, VIEW_W, type Renderer } from "./render";
import { PANEL_COUNT, PANEL_STEP } from "./reveal";

/**
 * The road as a timeline you walk. Where you are standing is which year it is, so
 * walking back is going back — the bar at the top is always "total emitted by this
 * year", and it falls if you retreat because you are looking at an earlier moment.
 *
 * There is nothing to dodge and nothing to fail. The hazards that used to be
 * obstacles are scenery whose density follows the total ever emitted, which is the
 * point being made rather than a thing to be good at.
 */
export const TRIP_FROM = 120;
/** 11 world pixels a year: 1850 to 2024 is a long road, at a walking pace. */
export const PER_YEAR = 11;
export const TRIP_TO = TRIP_FROM + (LAST_YEAR - START_YEAR) * PER_YEAR;
/** After 2024: the stretch where emissions have stopped. */
export const ZERO_FROM = TRIP_TO + 90;
export const ZERO_TO = ZERO_FROM + 420;
/** The gallery at the end: four panels hung along the roadside, one per PANEL_STEP. */
export const GALLERY_FROM = ZERO_TO + 140;
export const GALLERY_TO = GALLERY_FROM + PANEL_STEP * PANEL_COUNT + 60;
export const ROAD_END = GALLERY_TO + 160;

export function yearAt(worldX: number): number {
  if (worldX <= TRIP_FROM) return START_YEAR;
  if (worldX >= TRIP_TO) return LAST_YEAR;
  return START_YEAR + (worldX - TRIP_FROM) / PER_YEAR;
}

export function xForYear(year: number): number {
  return TRIP_FROM + (year - START_YEAR) * PER_YEAR;
}

/** True once the walker is past 2024 and into the stretch with no exhaust. */
export function isNetZero(worldX: number): boolean {
  return worldX > ZERO_FROM - 30;
}

/**
 * Which vehicle you are in is a function of when you are. Walk back and the jet
 * becomes a car again, which is consistent rather than a continuity error: the
 * road is a timeline, not a journey you took.
 */
export const ERAS: { from: number; vehicle: VehicleArt["id"]; title: string }[] = [
  { from: 1850, vehicle: "cart", title: "muscle, wood and a little coal" },
  { from: 1880, vehicle: "loco", title: "coal and steam" },
  { from: 1910, vehicle: "car", title: "oil and the motor car" },
  { from: 1960, vehicle: "jet", title: "the great acceleration" },
];

export function eraAt(year: number): { from: number; vehicle: VehicleArt["id"]; title: string } {
  let found = ERAS[0];
  for (const era of ERAS) if (year >= era.from) found = era;
  return found;
}

export function vehicleAt(worldX: number): VehicleArt["id"] {
  return isNetZero(worldX) ? "clean" : eraAt(yearAt(worldX)).vehicle;
}

/** A depot stands where one era hands over to the next. */
export function depotYears(): number[] {
  return ERAS.slice(1).map((e) => e.from);
}

/** Milepost-style year markers along the road, every decade. */
export function drawYearPosts(r: Renderer, w: Walk): void {
  for (let year = 1850; year <= LAST_YEAR; year += 10) {
    const x = Math.round(screenX(w, xForYear(year), VIEW_W));
    if (x < -20 || x > VIEW_W + 20) continue;
    const major = year % 50 === 0;
    r.rect(x, ROAD_Y - (major ? 14 : 7), 1, major ? 14 : 7, major ? COLORS.dim : COLORS.plateEdge);
    if (major) r.text(String(year), x, ROAD_Y + 10, { size: 7, color: COLORS.dim, align: "center" });
  }
}

/** The depot shed, drawn at a year rather than at a moment in a script. */
export function drawDepotAt(r: Renderer, w: Walk, year: number): void {
  const x = Math.round(screenX(w, xForYear(year) - 40, VIEW_W));
  if (x < -120 || x > VIEW_W + 120) return;
  const base = ROAD_Y + 2;
  r.rect(x, base - 40, 78, 40, "#3a4260");
  r.px.beginPath();
  r.px.moveTo(x - 6, base - 40);
  r.px.lineTo(x + 39, base - 56);
  r.px.lineTo(x + 84, base - 40);
  r.px.closePath();
  r.px.fillStyle = "#2b3149";
  r.px.fill();
  r.rect(x + 8, base - 26, 16, 26, "#141828");
  for (let i = 0; i < 3; i++) r.rect(x + 34 + i * 13, base - 30, 9, 9, "rgba(255,214,120,0.5)");
  r.rect(x + 10, base - 50, 58, 12, "#e8e4d6");
  r.text(String(year), x + 39, base - 48, { size: 8, color: "#2a3358", align: "center" });
}

/** The walker's feet: on the near lane, or aloft once the vehicle flies. */
export function groundFor(worldX: number): number {
  return ART[vehicleAt(worldX)].airborne ? ROAD_Y - 54 : LANES[1];
}
