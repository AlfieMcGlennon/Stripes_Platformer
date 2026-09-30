/**
 * Typed access to the JSON built by scripts/build_data.py. Nothing in the game
 * hard-codes a climate number; it all comes through here.
 */
import globalJson from "./global.json";
import paleoJson from "./paleo.json";
import derivedJson from "./derived.json";

export interface GlobalData {
  meta: { dataset: string; units: string; baseline: string; citation: string; licence: string };
  annual: { start: number; values: number[] };
  /** First month as "YYYY-MM". */
  monthly: { start: string; values: number[] };
  stripes: { reference: string; centre: number; halfRange: number };
}

export interface PaleoData {
  meta: { dataset: string; citation: string; method: string };
  lgmDelta: number;
  lgmGridErrorMean: number;
  lgmAgeYearsBP: number;
  deglaciationYearsAssumed: number;
}

export interface DerivedData {
  firstYear: number;
  lastYear: number;
  firstYearAnomaly: number;
  lastYearAnomaly: number;
  latestDecadeMean: number;
  recentTrendPerCentury: number;
  recentTrendYears: number;
  deglacialRatePerCentury: number;
  rateRatio: number;
}

export const GLOBAL: GlobalData = globalJson;
export const PALEO: PaleoData = paleoJson;
export const DERIVED: DerivedData = derivedJson;

export function annualFor(year: number, data: GlobalData = GLOBAL): number {
  return data.annual.values[year - data.annual.start];
}

/** Monthly values for whole calendar years [fromYear, toYear]. */
export function monthlyWindow(fromYear: number, toYear: number, data: GlobalData = GLOBAL): number[] {
  const startYear = Number(data.monthly.start.slice(0, 4));
  const from = (fromYear - startYear) * 12;
  return data.monthly.values.slice(from, from + (toYear - fromYear + 1) * 12);
}

/** "+1.23 °C" style label; always signed so a drop reads as a drop. */
export function signed(value: number, digits = 2): string {
  return `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(digits)} °C`;
}
