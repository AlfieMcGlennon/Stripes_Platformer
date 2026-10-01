import {
  EARLY, EARLY_STATS, HOTTEST, LATE, LATE_STATS, ratioAt, RECORD_FROM, RECORD_TO, SAMPLE_SUMMER,
  SAMPLE_YEAR, SHIFT,
} from "./data";

/**
 * Every figure below is counted from the arrays in `data.ts` at runtime, so a data
 * refresh cannot leave a caption stale. The only typed numbers are the thresholds,
 * which are this game's choice and say so on screen.
 *
 * Pacing is the point of this script. The first version of the episode put 394
 * tiles on screen in 39 seconds and taught nothing; this one spends its first three
 * phases on ten days, because a day has to be legible before a thousand of them
 * mean anything.
 */

/**
 * 28 °C is the game's threshold, not an official one. England's heat-health alerts
 * use regional thresholds in roughly this range, but nothing here depends on where
 * the line sits — only on it being out in the tail, which the player can check for
 * themselves by dragging it.
 */
export const THRESHOLD = 28;
export const FAR_THRESHOLD = 32;

const one = (n: number): string => n.toFixed(1);

const sampleMean = SAMPLE_SUMMER.reduce((a, d) => a + d.v, 0) / SAMPLE_SUMMER.length / 10;
const sampleHottest = Math.max(...SAMPLE_SUMMER.map((d) => d.v)) / 10;

export const TITLE = {
  name: "LOADED DICE",
  tagline: "one degree on the average, and a summer that behaves differently",
  caption: ["Every tile is one real summer day in central England.", "We will start with one of them."],
};

export const PLACE_ONE = [
  "Slide this day to its temperature on the axis. ← → to move, SPACE to drop it.",
];

export const AFTER_ONE = [
  ["That is where that day belongs.", "On its own it tells you nothing, which is the point."],
];

export const TEN = ["Nine more from the same summer. SPACE drops each one."];

export const AFTER_TEN = [
  ["Ten days. Still no shape worth the name."],
];

export const SUMMER = [
  "Hold SPACE to pour the rest of that summer. Let go whenever you like.",
];

export const AFTER_SUMMER = [
  [
    `${SAMPLE_SUMMER.length} days: one English summer, ${SAMPLE_YEAR}.`,
    `It averaged ${one(sampleMean)} °C and reached ${one(sampleHottest)} °C.`,
  ],
  [
    `${SAMPLE_YEAR} is the summer people still bring up to argue nothing has changed.`,
    "So it is worth saying that it sits inside the earlier of the two periods here.",
  ],
];

export const THIRTY = [`Now thirty summers, ${EARLY.label}. Hold SPACE.`];

export const AFTER_THIRTY = [
  [
    `Thirty summers. ${EARLY_STATS.years * 92} days.`,
    "Now there is a shape: a crowded middle and two thin edges.",
  ],
  [
    `The average summer day was ${one(EARLY_STATS.mean)} °C,`,
    `varying about ${one(EARLY_STATS.sd)} °C either side of that.`,
  ],
];

export const SECOND = [
  [
    `Here is ${LATE.label} on the same axis. Thirty summers again, counted the same way.`,
  ],
  [
    `The middle moved ${one(SHIFT.degrees)} °C.`,
    `That is ${SHIFT.sds.toFixed(2)} of the spread it already had — a nudge.`,
  ],
  [
    "A nudge to the middle is the bit people hear as 'barely noticeable'.",
    "So go and look at the edge instead.",
  ],
];

export const TAIL = [
  [
    "Drag the red line with ← →.",
    "It counts how often each period reached that temperature.",
  ],
  [
    "Push it further out, into the thin part.",
    "Watch what happens to the multiple as you go.",
  ],
  [
    "The middle moved a little. The edge moved a lot.",
    "Same degree of warming, a completely different summer.",
  ],
];

/** The live readout under the player's hand while they drag. */
export function readout(threshold: number): string {
  const then = EARLY_STATS.perSummer(threshold);
  const now = LATE_STATS.perSummer(threshold);
  const ratio = ratioAt(threshold);
  const times = Number.isFinite(ratio) ? `${ratio.toFixed(1)}×` : "—";
  return `${one(then)} → ${one(now)} days a summer   ${times}`;
}

/** Shown when the counts get small enough that the ratio is noisy. */
export function smallCounts(threshold: number): string | null {
  const then = EARLY_STATS.count(threshold);
  const now = LATE_STATS.count(threshold);
  if (then > 20) return null;
  return `only ${then} days then and ${now} now, in thirty summers each — small numbers`;
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
  "Counts are counted from the record, not fitted to a normal curve.",
  "One place, not the globe: central England is unusually well measured,",
  "which is why its daily record goes back furthest.",
  "Changed odds are not attribution: this says how often, not why any one day.",
];
