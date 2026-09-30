import {
  EARLY, EARLY_STATS, HOTTEST, LATE, LATE_STATS, ratioAt, RECORD_FROM, RECORD_TO, SHIFT,
} from "./data";

/**
 * Every figure below is counted from the two arrays in `data.ts` at runtime, so a
 * data refresh cannot leave a caption stale. The only typed numbers are the
 * thresholds, which are this game's choice and are labelled as such on screen.
 */

/**
 * 28 °C is the game's threshold, not an official one. England's heat-health alerts
 * use regional thresholds in roughly this range, but the point here does not depend
 * on where the line sits: it depends on the line being out in the tail.
 */
export const THRESHOLD = 28;
/** A second, further-out threshold, quoted with its raw counts because they are small. */
export const FAR_THRESHOLD = 32;

const one = (n: number): string => n.toFixed(1);

export const TITLE_LINES = [
  "Every tile is one real summer day in central England.",
  "Its position is its temperature. Catch what you can; the hot ones get through.",
];

export function roundIntro(label: string): string[] {
  return [`${label}. Thirty summers, one tile per day.`, "Move the shade to cover the hot end."];
}

/** After the first round: the middle barely moved. */
export function afterEarly(through: number): string[][] {
  return [
    [`${EARLY.label} done. ${through} days got past you at ${THRESHOLD} °C or above.`],
    [
      `That period averaged ${one(EARLY_STATS.mean)} °C on a summer day,`,
      `and a summer day varied by about ${one(EARLY_STATS.sd)} °C either side of it.`,
    ],
    ["Now the same thirty summers, thirty-five years later.", "Watch the middle of the pile, not the edges."],
  ];
}

/** After the second round: the middle still barely moved, and the tail did not. */
export function afterLate(earlyThrough: number, lateThrough: number): string[][] {
  return [
    [`${LATE.label} done. ${lateThrough} got past you, against ${earlyThrough} before.`],
    [
      `The average summer day moved by ${one(SHIFT.degrees)} °C.`,
      `That is ${SHIFT.sds.toFixed(2)} of the spread you already had — a nudge.`,
    ],
    ["A nudge to the middle is not a nudge to the edge.", "Step back and look at both piles at once."],
  ];
}

export const REVEAL_LINES: string[][] = [
  ["Two thirty-year normals, on one axis.", "The whole curve slid right by about a degree."],
  [
    `Days at ${THRESHOLD} °C or above: ${one(EARLY_STATS.perSummer(THRESHOLD))} a summer then,`,
    `${one(LATE_STATS.perSummer(THRESHOLD))} now. About ${ratioAt(THRESHOLD).toFixed(1)} times as many.`,
  ],
  [
    `At ${FAR_THRESHOLD} °C it is ${EARLY_STATS.count(FAR_THRESHOLD)} days then against`,
    `${LATE_STATS.count(FAR_THRESHOLD)} now. Small counts, but the further out you look, the bigger the multiple.`,
  ],
  [
    "That is the whole thing. The middle moved a little; the tail moved a lot.",
    `The hottest day in the entire ${RECORD_FROM}–${RECORD_TO} record is ${HOTTEST.year}: ${one(HOTTEST.value)} °C.`,
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
