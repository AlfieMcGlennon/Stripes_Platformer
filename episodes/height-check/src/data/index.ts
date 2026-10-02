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
  deglacialRateFastPerCentury: number;
  deglaciationYearsRange: number[];
  rateRatioLow: number;
  rateRatioHigh: number;
  cherry: {
    start: number;
    end: number;
    searchedFrom: number;
    trendPerDecade: number;
    trendPlusOneYear: number;
    trendToLatest: number;
    coolingWindowShare: number;
    windowsSearched: number;
    longTrendPerDecade: number;
  };
  warmestTen: number[];
  /** 1 = warmest year on record. */
  lastYearRank: number;
}

/** Ordinary least-squares slope of values against their index. */
export function olsSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((v, i) => {
    num += (i - meanX) * (v - meanY);
    den += (i - meanX) ** 2;
  });
  return num / den;
}

/**
 * Standard error of the OLS slope, inflated for lag-1 autocorrelation via the
 * usual effective-sample-size correction. Annual temperatures are not
 * independent draws, so a plain OLS error understates how little a short window
 * pins down. Negative autocorrelation is clamped away rather than allowed to
 * shrink the error, which keeps the number conservative.
 */
export function olsStdErr(values: number[]): number {
  const n = values.length;
  if (n < 4) return 0;
  const slope = olsSlope(values);
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  const intercept = meanY - slope * meanX;
  const resid = values.map((v, i) => v - (intercept + slope * i));
  let sse = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sse += resid[i] ** 2;
    sxx += (i - meanX) ** 2;
  }
  let lag = 0;
  for (let i = 1; i < n; i++) lag += resid[i] * resid[i - 1];
  const r1 = sse > 0 ? Math.max(0, Math.min(0.99, lag / sse)) : 0;
  const nEff = Math.max(3, (n * (1 - r1)) / (1 + r1));
  return Math.sqrt(Math.max(0, sse / (nEff - 2) / sxx));
}

/**
 * Shortest window length, in years, such that every window of that length from
 * `fromYear` onwards has a rising trend. This is the asymmetry the cherry-pick
 * level exists to teach: short windows disagree with each other, long ones do
 * not. Computed here rather than typed, so it stays true when the data updates.
 */
export function allRisingFromYears(fromYear: number, data: GlobalData = GLOBAL): number {
  const from = fromYear - data.annual.start;
  const series = data.annual.values.slice(from);
  for (let len = 5; len <= series.length; len++) {
    let allUp = true;
    for (let start = 0; start + len <= series.length && allUp; start++) {
      if (olsSlope(series.slice(start, start + len)) <= 0) allUp = false;
    }
    if (allUp) return len;
  }
  return series.length;
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
/**
 * "the warmest", "2nd warmest", "11th warmest".
 *
 * Rank one takes the definite article rather than "1st", which is how anyone would
 * say it, and the teens are special-cased because 11th, 12th and 13th do not follow
 * the pattern the single digits set.
 */
export function rankPhrase(n: number): string {
  if (n === 1) return "the warmest";
  const tens = n % 100;
  const suffix =
    tens >= 11 && tens <= 13
      ? "th"
      : n % 10 === 1
        ? "st"
        : n % 10 === 2
          ? "nd"
          : n % 10 === 3
            ? "rd"
            : "th";
  return `${n}${suffix} warmest`;
}

export function signed(value: number, digits = 2): string {
  if (Math.abs(value) < 0.5 * Math.pow(10, -digits)) return `±${(0).toFixed(digits)} °C`;
  return `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(digits)} °C`;
}
