import {
  BEST_SHIFT, BIN_HI, countAbove, EARLY, EARLY_STATS, HOTTEST, LATE, LATE_STATS, matchError,
  ratioAt, SAMPLE_SUMMER, SAMPLE_YEAR, shiftedDays,
} from "./data";

/**
 * Captions hung on temperatures, because in this episode the ground you are
 * standing on *is* a temperature: horizontal position is the reading, and the
 * height of the land is how many days landed on it. Walking from the cold end to
 * the hot end is reading the distribution left to right, at your own pace.
 *
 * Every figure is counted from the two committed arrays at runtime.
 */
export const THRESHOLD = 28;
/** Where the sample summer actually peaked, so "right here" is right here. */
export const SAMPLE_PEAK = Math.max(...SAMPLE_SUMMER.map((d) => d.v)) / 10;
export const FAR_THRESHOLD = 32;
/** Where the ground runs out at the hot end. */
export const EDGE = BIN_HI - 0.5;

const one = (n: number): string => n.toFixed(1);
const two = (n: number): string => n.toFixed(2);

/** How much of the real change a plain sideways push accounts for. */
export const PUSH_EXPLAINS = Math.round((1 - BEST_SHIFT.error / matchError(0)) * 100);

export const TITLE = {
  name: "LOADED DICE",
  tagline: "a degree on the average, and a summer that behaves differently",
};

/** A place on the ground, and what is worth saying when you reach it. */
export interface Mark {
  at: number;
  lines: string[];
}

/*
 * Spacing is deliberate. The walk holds still for as long as a caption takes to read,
 * so two marks a degree apart would mean stop, walk for a second, stop again. The
 * tightest pair here is about 1.1 °C, which at 46 px a degree and 54 px a second is
 * very nearly a second of walking; `land.test.ts` holds the floor.
 */
export const MARKS: Mark[] = [
  { at: 11.5, lines: ["Hold » to walk. You can stop, read, and walk back whenever you like."] },
  {
    at: 13.5,
    lines: [
      `This ground is ${EARLY.label}: thirty summers of daily highs in central England.`,
      "Where you stand is a temperature. How high the land is, is how many days landed on it.",
    ],
  },
  {
    at: 15.5,
    lines: [
      "So this thin ground is a cold summer day. They happen, and not often.",
      "Walk on. It gets busier, and the climb is the only reason it does.",
    ],
  },
  {
    at: EARLY_STATS.mode,
    lines: [
      `The summit, ${one(EARLY_STATS.mode)} °C. No other single degree catches as many summer days.`,
      "Height is the square root of the count, so the thin edges stay walkable. Counts: corner.",
    ],
  },
  {
    at: EARLY_STATS.mean,
    lines: [
      `The average is warmer than the summit: ${one(EARLY_STATS.mean)} °C, because the warm side`,
      "has the longer tail and it drags the average up. The average is the number that moves.",
    ],
  },
  {
    at: EARLY_STATS.mean + EARLY_STATS.sd,
    lines: [
      `The fence behind you holds about two days in three — ${one(EARLY_STATS.sd)} °C either side of the average.`,
      "That band is what people mean by normal weather.",
    ],
  },
  {
    at: 25.5,
    lines: [
      "A properly warm English day, and the ground is thinning under you.",
      "Check the corner: that is how often it happened, then and now.",
    ],
  },
  {
    at: THRESHOLD,
    lines: [
      `${THRESHOLD} °C. This episode calls that a hot day; it is our line, not an official one.`,
      `Back then: ${one(EARLY_STATS.perSummer(THRESHOLD))} days a summer. The ground here is already thin.`,
    ],
  },
  {
    at: THRESHOLD + 1.5,
    lines: [
      "Now the thing worth doing: every day warms by the same amount, nothing else changes.",
      "Hold UP to push. Gold is ground added; the dotted line is the real later landscape.",
    ],
  },
  {
    at: FAR_THRESHOLD,
    lines: [
      `${FAR_THRESHOLD} °C: ${EARLY_STATS.count(FAR_THRESHOLD)} days in thirty summers, back then.`,
      "Small numbers out here, so the multiples are rough. The direction is not.",
    ],
  },
  {
    at: SAMPLE_PEAK,
    lines: [
      `Right here is where ${SAMPLE_YEAR} peaked — the summer people cite to argue nothing changed.`,
      "It was exceptional. It is also inside the earlier landscape, not the later one.",
    ],
  },
  {
    at: 35.5,
    lines: [
      `The post ahead is ${HOTTEST.year}: ${one(HOTTEST.value)} °C, the hottest day in the whole record.`,
      "There was no ground here at all when these thirty summers were measured.",
    ],
  },
  {
    at: EDGE - 0.4,
    lines: [
      "The middle moved about a degree. The edge you have just walked moved far more.",
      "Walk on for where the numbers came from.",
    ],
  },
];

/** The corner readout: how often the temperature underfoot is reached, then and now. */
export function walkReadout(celsius: number): { label: string; value: string; notable: boolean } {
  const then = EARLY_STATS.perSummer(celsius);
  const now = LATE_STATS.perSummer(celsius);
  const ratio = ratioAt(celsius);
  const small = EARLY_STATS.count(celsius) <= 20;
  return {
    label: `${EARLY.label} » ${LATE.label}, days a summer`,
    value: small
      ? `${EARLY_STATS.count(celsius)} » ${LATE_STATS.count(celsius)} in thirty summers`
      : `${one(then)} » ${one(now)}   ${Number.isFinite(ratio) ? `${ratio.toFixed(1)}×` : "—"}`,
    notable: Number.isFinite(ratio) && ratio >= 1.4,
  };
}

/** How often this temperature is reached once the land has been pushed. */
export function pushedReadout(celsius: number, degrees: number): string {
  const n = countAbove(shiftedDays(degrees), celsius) / EARLY_STATS.years;
  return `${one(n)} a summer once pushed`;
}

export const CREDITS: string[] = [
  "LOADED DICE",
  "",
  "DATA",
  "Daily maximum temperature, central England (HadCET),",
  "Met Office Hadley Centre, Open Government Licence v3.",
  "Parker, Legg and Folland (1992), Int. J. Climatol.",
  `June to August only. ${EARLY.label} against ${LATE.label}:`,
  "two thirty-year normals, so the comparison is like-for-like.",
  "",
  "HOW TO READ THE GROUND",
  "Where you stand is a temperature; the height of the land is how",
  "many days reached it, counted from the record and not fitted to",
  "a curve. Height is the square root of that count, so the thin",
  "edges where this episode's argument lives are visible at all;",
  "the counts in the corner are never scaled.",
  "Pushing moves every day by the same amount, which is a",
  `real operation on real days. The push that best reproduces the`,
  `measured later landscape is +${two(BEST_SHIFT.degrees)} °C, and the average`,
  `really moved ${one(LATE_STATS.mean - EARLY_STATS.mean)} °C.`,
  `The spread barely moved: the standard deviation was ${two(EARLY_STATS.sd)} °C`,
  `then and ${two(LATE_STATS.sd)} °C now, which is why a plain sideways`,
  "shift is a fair description of what happened.",
  "Height is the square root of each day-count, so the thin edges are",
  "visible at all. The counts themselves are never scaled.",
  "",
  "WHAT IT DOES NOT SAY",
  `${THRESHOLD} °C is this episode's line, not an official one.`,
  `A sideways push accounts for about ${PUSH_EXPLAINS}% of the change, not all:`,
  "the shape altered a little as well.",
  "One well-measured place, not the globe. And changed odds are not",
  "attribution: this says how often, never why any single day.",
];
