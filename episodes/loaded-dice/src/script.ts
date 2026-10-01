import {
  BEST_SHIFT, countAbove, EARLY, EARLY_STATS, HOTTEST, LATE, LATE_STATS, matchError, ratioAt,
  RECORD_FROM, RECORD_TO, SAMPLE_SUMMER, SAMPLE_YEAR, shiftedDays, SHIFT,
} from "./data";

/**
 * Every figure is counted from the arrays in `data.ts` at runtime, so a data refresh
 * cannot leave a caption stale. The only typed numbers are the thresholds, which are
 * this game's choice and say so on screen.
 *
 * The script's job here is as much explanation as narration. A reader who has never
 * been shown what a distribution is cannot be expected to care that its tail moved,
 * so three beats are spent naming the parts of the shape before anything is claimed
 * about it.
 */

export const THRESHOLD = 28;
export const FAR_THRESHOLD = 32;

const one = (n: number): string => n.toFixed(1);
const two = (n: number): string => n.toFixed(2);

const sampleMean = SAMPLE_SUMMER.reduce((a, d) => a + d.v, 0) / SAMPLE_SUMMER.length / 10;
const sampleHottest = Math.max(...SAMPLE_SUMMER.map((d) => d.v)) / 10;

/** How much of the real change a plain sideways push accounts for. */
export const PUSH_EXPLAINS = Math.round((1 - BEST_SHIFT.error / matchError(0)) * 100);

export const TITLE = {
  name: "LOADED DICE",
  tagline: "one degree on the average, and a summer that behaves differently",
  caption: [
    "Every tile is one real summer day in central England, since 1878.",
    "We will build a picture out of them, then push it.",
  ],
};

/** Phase: pour thirty summers, narrated as it fills. */
export const BUILD = [
  "Hold SPACE to pour thirty summers of days. Let go whenever you like.",
];

export const AFTER_BUILD = [
  [
    `${EARLY_STATS.years} summers, ${EARLY_STATS.years * 92} days, ${EARLY.label}.`,
    "Each day sat down at its own temperature, and they stacked up.",
  ],
  [
    "This is a distribution: not a trend, not a timeline.",
    "It says how often each temperature happened, with time thrown away.",
  ],
];

/** Phase: name the parts of the shape. */
export const ANATOMY = [
  [
    `The tall middle is the ordinary summer day: about ${one(EARLY_STATS.mean)} °C.`,
    "Most days are near it, which is why the pile is tall there.",
  ],
  [
    `The shaded band is one spread either side — about ${one(EARLY_STATS.sd)} °C.`,
    "Roughly two days in three land inside it. That is what 'normal weather' means.",
  ],
  [
    "The thin ends are the extremes. Few days, but they are the ones that hurt.",
    `Days of ${THRESHOLD} °C or more: ${one(EARLY_STATS.perSummer(THRESHOLD))} a summer, back then.`,
  ],
];

/** Phase: the player pushes the whole curve. */
export const PUSH = [
  [
    "Now push the whole pile to the right with ← →.",
    "Every day gets warmer by the same amount. Nothing else changes.",
  ],
  [
    "Keep going. Watch the counter, not the middle.",
    "The middle is barely moving. Ask yourself what the counter is doing.",
  ],
];

/** Live readout while pushing. */
export function pushReadout(degrees: number): string {
  const now = countAbove(shiftedDays(degrees), THRESHOLD) / EARLY_STATS.years;
  const times = now / EARLY_STATS.perSummer(THRESHOLD);
  return `${THRESHOLD} °C days: ${one(now)} a summer   ${times.toFixed(2)}×`;
}

/** Shown once the player's push is close to the shift that really happened. */
export const MATCHED_HINT = "that is about where the record actually sits — SPACE";

export const MATCH = [
  [
    `You pushed it ${two(BEST_SHIFT.degrees)} °C. Here is ${LATE.label}, measured, on top.`,
    "Thirty real summers, thirty-five years later. It is where you just put it.",
  ],
  [
    `The average summer day really did move ${one(SHIFT.degrees)} °C —`,
    `${two(SHIFT.sds)} of the spread it already had. A nudge.`,
  ],
  [
    `A plain sideways push accounts for about ${PUSH_EXPLAINS}% of the change.`,
    "Not all of it: the shape shifted a little too. But mostly, it just slid.",
  ],
];

/** Phase: drag the threshold out into the tail. */
export const TAIL = [
  [
    "Last thing. Drag the red line with ← →.",
    "It counts how often each period reached that temperature.",
  ],
  [
    "Push it further out, into the thin part.",
    "Watch what the multiple does as you go.",
  ],
];

export function tailReadout(threshold: number): string {
  const then = EARLY_STATS.perSummer(threshold);
  const now = LATE_STATS.perSummer(threshold);
  const ratio = ratioAt(threshold);
  return `${one(then)} → ${one(now)} days a summer   ${Number.isFinite(ratio) ? `${ratio.toFixed(1)}×` : "—"}`;
}

export function smallCounts(threshold: number): string | null {
  const then = EARLY_STATS.count(threshold);
  if (then > 20) return null;
  return `only ${then} days then and ${LATE_STATS.count(threshold)} now, in thirty summers each — small numbers`;
}

export const CLOSING = [
  [
    `At ${THRESHOLD} °C: ${one(EARLY_STATS.perSummer(THRESHOLD))} days a summer then,`,
    `${one(LATE_STATS.perSummer(THRESHOLD))} now. About ${ratioAt(THRESHOLD).toFixed(1)} times as many.`,
  ],
  [
    `At ${FAR_THRESHOLD} °C it is ${EARLY_STATS.count(FAR_THRESHOLD)} days against ${LATE_STATS.count(FAR_THRESHOLD)}.`,
    "Small counts — but the further out you look, the bigger the multiple.",
  ],
  [
    "The middle moved a little. The edge moved a lot.",
    "That is what one degree does to a summer.",
  ],
  [
    `${SAMPLE_YEAR} is the summer people cite to argue nothing has changed.`,
    `It averaged ${one(sampleMean)} °C and peaked at ${one(sampleHottest)} °C — and it is inside the earlier pile.`,
  ],
  [
    `The hottest day in the whole ${RECORD_FROM}–${RECORD_TO} record is ${HOTTEST.year}: ${one(HOTTEST.value)} °C.`,
    `It beat ${SAMPLE_YEAR} by ${one(HOTTEST.value - sampleHottest)} °C.`,
  ],
];

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
  "SIMPLIFICATIONS",
  `${THRESHOLD} °C is this game's threshold, not an official one.`,
  "Counts are counted from the record, never fitted to a normal curve.",
  "Pushing the pile moves every day by the same amount: a real operation on",
  `real days, and it accounts for about ${PUSH_EXPLAINS}% of the measured change.`,
  "One place, not the globe: central England is unusually well measured,",
  "which is why its daily record goes back furthest.",
  "Changed odds are not attribution: this says how often, not why any one day.",
];
