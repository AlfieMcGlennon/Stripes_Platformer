/**
 * Real data for the walkthrough. Emissions and cumulative emissions are the
 * Global Carbon Budget via OWID (`owid/co2-data`, `co2_including_luc` and
 * `cumulative_co2_including_luc`), converted from million tonnes to Gt.
 * Temperature is HadCRUT.5.1.0.0 annual anomaly against 1850-1900, the same
 * series episode 1 ships. Retrieved 2026-09-30.
 *
 * Note on the cumulative column: it accumulates from 1850, the first year of the
 * series, not from 1750. Captions must say "since 1850".
 */
/** Dataset metadata, quoted verbatim on the credits screen. */
export const GLOBAL_META = {
  meta: {
    dataset: "HadCRUT.5.1.0.0",
    baseline: "1850-1900",
    licence: "Open Government Licence v3",
  },
};

export const START_YEAR = 1850;

/** Gt CO2 emitted in each year. */
export const EMISSIONS: number[] = [2.91, 3.02, 3.12, 3.15, 3.23, 3.29, 3.32, 3.37, 3.4, 3.46, 3.23, 3.12, 3.05, 3.04, 3.1, 3.04, 3.07, 3.06, 3.06, 3.08, 3.45, 3.57, 3.79, 3.88, 3.94, 4.01, 4.08, 4.18, 4.24, 4.35, 4.48, 4.49, 4.62, 4.74, 4.76, 4.77, 4.78, 4.89, 5.0, 5.04, 5.42, 5.58, 5.56, 5.58, 5.72, 5.79, 5.85, 5.99, 6.1, 6.29, 6.42, 6.61, 6.7, 6.93, 7.06, 7.24, 7.42, 7.78, 7.71, 7.91, 7.85, 7.86, 7.92, 8.15, 7.82, 7.7, 7.94, 8.02, 7.92, 7.43, 8.32, 8.1, 8.32, 8.87, 8.83, 8.99, 8.94, 9.28, 9.32, 9.67, 9.4, 9.06, 8.76, 8.88, 9.23, 9.35, 9.85, 10.12, 9.9, 10.11, 10.63, 10.89, 10.89, 10.97, 10.99, 10.15, 10.44, 10.94, 11.17, 10.89, 12.58, 13.58, 13.72, 14.03, 14.6, 15.44, 15.99, 16.47, 16.63, 17.55, 17.0, 17.05, 16.89, 17.22, 17.48, 17.7, 17.78, 18.49, 19.23, 20.7, 21.59, 21.64, 22.66, 23.33, 23.31, 23.11, 23.92, 24.98, 25.59, 25.36, 25.41, 24.72, 24.26, 24.74, 25.88, 26.93, 27.38, 27.6, 28.08, 28.18, 28.56, 28.93, 28.49, 28.48, 29.64, 29.79, 30.78, 32.4, 31.09, 31.4, 31.66, 31.15, 32.36, 34.97, 35.05, 35.53, 36.63, 37.09, 38.0, 38.05, 39.84, 40.87, 41.64, 41.6, 41.88, 41.92, 40.77, 41.28, 41.62, 41.97, 39.67, 41.52, 42.31, 42.84, 43.18];

/** Gt CO2 emitted in total since 1850, to the end of each year. */
export const CUMULATIVE: number[] = [2.9, 5.9, 9.1, 12.2, 15.4, 18.7, 22.0, 25.4, 28.8, 32.3, 35.5, 38.6, 41.7, 44.7, 47.8, 50.9, 53.9, 57.0, 60.0, 63.1, 66.6, 70.1, 73.9, 77.8, 81.7, 85.8, 89.8, 94.0, 98.3, 102.6, 107.1, 111.6, 116.2, 120.9, 125.7, 130.5, 135.3, 140.1, 145.1, 150.2, 155.6, 161.2, 166.7, 172.3, 178.0, 183.8, 189.7, 195.7, 201.8, 208.1, 214.5, 221.1, 227.8, 234.7, 241.8, 249.0, 256.5, 264.2, 271.9, 279.9, 287.7, 295.6, 303.5, 311.6, 319.5, 327.2, 335.1, 343.1, 351.0, 358.5, 366.8, 374.9, 383.2, 392.1, 400.9, 409.9, 418.8, 428.1, 437.5, 447.1, 456.5, 465.6, 474.3, 483.2, 492.5, 501.8, 511.7, 521.8, 531.7, 541.8, 552.4, 563.3, 574.2, 585.2, 596.1, 606.3, 616.7, 627.7, 638.8, 649.7, 662.3, 675.9, 689.6, 703.7, 718.2, 733.7, 749.7, 766.1, 782.8, 800.3, 817.3, 834.4, 851.2, 868.5, 886.0, 903.6, 921.4, 939.9, 959.1, 979.8, 1001.4, 1023.1, 1045.7, 1069.1, 1092.4, 1115.5, 1139.4, 1164.4, 1190.0, 1215.4, 1240.8, 1265.5, 1289.7, 1314.5, 1340.4, 1367.3, 1394.7, 1422.3, 1450.4, 1478.5, 1507.1, 1536.0, 1564.5, 1593.0, 1622.6, 1652.4, 1683.2, 1715.6, 1746.7, 1778.1, 1809.8, 1840.9, 1873.3, 1908.2, 1943.3, 1978.8, 2015.5, 2052.5, 2090.5, 2128.6, 2168.4, 2209.3, 2250.9, 2292.5, 2334.4, 2376.3, 2417.1, 2458.4, 2500.0, 2542.0, 2581.6, 2623.2, 2665.5, 2708.3, 2751.5];

/** Warming vs 1850-1900, degrees C. */
export const WARMING: number[] = [-0.069, 0.094, 0.133, 0.095, 0.064, 0.066, 0.029, -0.108, -0.039, 0.065, -0.05, -0.106, -0.197, -0.025, -0.137, -0.035, -0.043, -0.042, -0.006, 0.039, 0.03, -0.016, 0.048, 0.036, -0.008, -0.009, -0.053, 0.275, 0.368, 0.069, 0.054, 0.144, 0.085, 0.03, -0.117, -0.101, -0.051, -0.131, -0.015, 0.107, -0.143, -0.04, -0.149, -0.138, -0.121, -0.084, 0.079, 0.103, -0.117, 0.013, 0.127, 0.07, -0.08, -0.178, -0.24, -0.049, 0.042, -0.142, -0.149, -0.175, -0.165, -0.182, -0.119, -0.106, 0.098, 0.167, -0.063, -0.186, -0.069, 0.025, 0.053, 0.116, 0.019, 0.043, 0.049, 0.078, 0.235, 0.132, 0.149, -0.033, 0.188, 0.252, 0.207, 0.029, 0.18, 0.144, 0.186, 0.341, 0.344, 0.316, 0.431, 0.392, 0.357, 0.364, 0.502, 0.4, 0.235, 0.261, 0.228, 0.203, 0.118, 0.285, 0.368, 0.434, 0.24, 0.159, 0.092, 0.323, 0.341, 0.311, 0.244, 0.343, 0.299, 0.326, 0.055, 0.155, 0.212, 0.242, 0.193, 0.33, 0.273, 0.153, 0.267, 0.41, 0.189, 0.251, 0.147, 0.463, 0.363, 0.446, 0.549, 0.604, 0.388, 0.578, 0.403, 0.403, 0.45, 0.596, 0.635, 0.532, 0.712, 0.691, 0.477, 0.518, 0.585, 0.729, 0.628, 0.772, 0.929, 0.675, 0.683, 0.841, 0.895, 0.896, 0.82, 0.96, 0.924, 0.943, 0.817, 0.947, 1.031, 0.89, 0.929, 0.976, 1.025, 1.175, 1.282, 1.194, 1.111, 1.245, 1.274, 1.125, 1.159, 1.467, 1.526];

export const LAST_INDEX = EMISSIONS.length - 1;
export const LAST_YEAR = START_YEAR + LAST_INDEX;
export const MAX_EMISSIONS = Math.max(...EMISSIONS);
export const TOTAL_EMITTED = CUMULATIVE[LAST_INDEX];

function clampIndex(year: number): number {
  return Math.max(0, Math.min(LAST_INDEX, Math.round(year) - START_YEAR));
}

export function emissionsAt(year: number): number {
  return EMISSIONS[clampIndex(year)];
}

export function cumulativeAt(year: number): number {
  return CUMULATIVE[clampIndex(year)];
}

export function warmingAt(year: number): number {
  return WARMING[clampIndex(year)];
}

/** Gt emitted across [from, to] inclusive, and its share of everything ever emitted. */
export function emittedBetween(from: number, to: number): { gt: number; share: number } {
  const before = from <= START_YEAR ? 0 : cumulativeAt(from - 1);
  const gt = cumulativeAt(to) - before;
  return { gt, share: gt / TOTAL_EMITTED };
}

/**
 * Gt emitted across [from, until), and its share of everything ever emitted.
 *
 * Half-open on purpose. The era captions are a partition of the whole record, so
 * the year an era begins belongs to that era and to nothing else. Reaching for the
 * inclusive `emittedBetween` for all four spans double-counted 1880, 1910 and 1960
 * and printed four shares that summed to 101% of everything ever emitted.
 */
export function emittedDuring(from: number, until: number): { gt: number; share: number } {
  return emittedBetween(from, until - 1);
}

/** First year by which `gt` had been emitted in total. */
export function yearReaching(gt: number): number {
  const i = CUMULATIVE.findIndex((v) => v >= gt);
  return START_YEAR + (i < 0 ? LAST_INDEX : i);
}

/**
 * Least squares of warming on cumulative emissions, measured from the two series
 * above. This is NOT the IPCC's TCRE: that isolates CO2-only forcing, while these
 * observations also carry aerosols, methane and natural variability. No caption
 * may call it TCRE.
 */
export const FIT = (() => {
  const n = LAST_INDEX + 1;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += CUMULATIVE[i];
    sy += WARMING[i];
  }
  const mx = sx / n;
  const my = sy / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (CUMULATIVE[i] - mx) * (WARMING[i] - my);
    sxx += (CUMULATIVE[i] - mx) ** 2;
    syy += (WARMING[i] - my) ** 2;
  }
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx, r: sxy / Math.sqrt(sxx * syy) };
})();

/** "+1.5" style, always signed so a fall reads as a fall. */
export function signed(value: number, digits = 1): string {
  return `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(digits)}`;
}
