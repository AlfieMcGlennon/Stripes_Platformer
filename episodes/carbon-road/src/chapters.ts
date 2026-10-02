import {
  cumulativeAt, emissionsAt, emittedBetween, emittedDuring, FIT, GLOBAL_META as GLOBAL,
  LAST_YEAR, signed,
  START_YEAR, TOTAL_EMITTED, warmingAt, yearReaching,
} from "./data";
import { ZERO_FROM } from "./road";

/**
 * Captions hung on years, because on this road where you stand is when it is.
 * Walking back goes back, so nothing here can assume you have only ever moved
 * forward. Every figure is computed from the committed series at runtime.
 */
const gt = (v: number): string => `${Math.round(v)} Gt`;
const pct = (share: number): string => `${Math.round(share * 100)}%`;

export const TITLE = {
  name: "CARBON ROAD",
  tagline: "everything you burn counts, for ever",
};

export interface Mark {
  /** Hung on a year, or on a raw world position for the stretches after 2024. */
  atYear?: number;
  atX?: number;
  lines: string[];
}

const FIRST_1000 = yearReaching(1000);
const LAST_1000 = yearReaching(TOTAL_EMITTED - 1000);

export const MARKS: Mark[] = [
  // On the spot the reader starts, so how to move is the first thing they are told.
  { atX: 52, lines: ["Hold » to walk. You can stop, read, and walk back whenever you like."] },
  {
    atYear: 1850,
    lines: [
      "This road is a timeline: where you stand is the year, and the bar at the top is all",
      "the CO₂ emitted by that year. Walk back and the bar falls, because you are earlier.",
    ],
  },
  {
    atYear: 1862,
    lines: [
      "The 1850s. Energy means muscle, firewood and the first coal, and nobody alive",
      "could have noticed the difference it was making.",
    ],
  },
  {
    atYear: 1872,
    lines: [
      `Walking a decade takes a moment. The world is burning ${emissionsAt(1872).toFixed(1)} billion tonnes of CO₂ a year.`,
      "That is the flow. Look behind you: the bar, which is the total, has barely moved.",
    ],
  },
  {
    atYear: 1880,
    lines: [
      "A depot. From here the work is done by coal, and you are riding it.",
      `The thirty years to 1880 added ${gt(emittedDuring(1850, 1880).gt)} — ${pct(emittedDuring(1850, 1880).share)} of everything ever emitted.`,
    ],
  },
  {
    atYear: 1900,
    lines: [
      "Mills, railways, furnaces. The chimneys behind you are the story, not the train.",
      `Annual emissions have gone from ${emissionsAt(1850).toFixed(1)} to ${emissionsAt(1900).toFixed(1)} Gt.`,
    ],
  },
  {
    atYear: 1910,
    lines: [
      "Another depot, and a motor car. Oil, mass production, roads.",
      `Coal and steam, the thirty years to 1910: ${gt(emittedDuring(1880, 1910).gt)}, ${pct(emittedDuring(1880, 1910).share)}.`,
    ],
  },
  {
    atYear: 1935,
    lines: [
      "Smog you could see, in cities you could not breathe in. That got cleaned up.",
      "The haze still thickening here stands for the invisible total. Nobody cleaned that up.",
    ],
  },
  {
    atYear: 1945,
    lines: [
      "Two gauges, and from here they climb together: the total emitted, and the warming.",
      `${gt(cumulativeAt(1945))} emitted so far, and the world is ${signed(warmingAt(1945), 2)} °C against 1850–1900.`,
    ],
  },
  {
    atYear: 1960,
    lines: [
      "Last depot. From here it is jets, plastics, containers, concrete, fertiliser.",
      `The motor age, the fifty years to 1960: ${gt(emittedDuring(1910, 1960).gt)}, ${pct(emittedDuring(1910, 1960).share)}, through two wars and a slump.`,
    ],
  },
  {
    atYear: 1985,
    lines: [
      "Check the bar. It is climbing faster than you are walking.",
      `The first thousand gigatonnes took until ${FIRST_1000} — ${FIRST_1000 - START_YEAR} years after you set off.`,
    ],
  },
  {
    atYear: 2005,
    lines: [
      `The most recent thousand will take ${LAST_YEAR - LAST_1000} years, ${LAST_1000} to ${LAST_YEAR}.`,
      "Same amount of carbon dioxide, delivered about five times faster.",
    ],
  },
  {
    atYear: 2022,
    lines: [
      `1960 onwards: ${gt(emittedBetween(1960, LAST_YEAR).gt)} — ${pct(emittedBetween(1960, LAST_YEAR).share)} of all of it, inside one lifetime.`,
      "Keep walking to the end of the record. The bar and the year always agree.",
    ],
  },
  {
    atX: ZERO_FROM - 20,
    lines: [
      "The road runs out of record here. Walk on into what happens next.",
      "You have switched to something that burns nothing.",
    ],
  },
  {
    atX: ZERO_FROM + 70,
    lines: [
      "Emissions: zero. No exhaust behind you, and the yearly figure reads 0 Gt/yr.",
      "Now watch the bar underneath it.",
    ],
  },
  {
    atX: ZERO_FROM + 200,
    lines: [
      `It stopped climbing, and it did not fall. All ${gt(cumulativeAt(LAST_YEAR))} has been emitted,`,
      "and cannot be un-emitted. It lasts a very long time up there, and so does the warming.",
    ],
  },
  {
    atX: ZERO_FROM + 330,
    lines: [
      "IPCC AR6: the warming still to come after net zero is likely small, and could fall",
      "either side of zero. Either way, stopping stops it getting worse. It does not undo it.",
    ],
  },
];

/** Three panels hung along the roadside at the end, walked past rather than shown. */
export const GALLERY_TALK: string[][] = [
  [
    "Every year, something burned. Spiky: wars, slumps, a pandemic, a recovery.",
    "This is the flow.",
  ],
  [
    "The running total. Not one dip in the spiky line shows up here.",
    "This is the stock, and it is the one warming tracks.",
  ],
  [
    "And the temperature, on the same years. It follows the smooth line, not the spiky one.",
    "Every dip in the flow is missing from this one too.",
  ],
  [
    "The last panel plots the two against each other: one dot per year, 1850 bottom left.",
    `Observed warming per thousand gigatonnes: ${(FIT.slope * 1000).toFixed(2)} °C, correlation ${FIT.r.toFixed(2)}.`,
  ],
];

export const CREDITS: string[] = [
  "CARBON ROAD",
  "",
  "DATA",
  "Emissions and cumulative emissions: Global Carbon Budget",
  "via Our World in Data (owid/co2-data), CC BY 4.0.",
  `Temperature: ${GLOBAL.meta.dataset}, Met Office Hadley Centre / CRU`,
  `(Morice et al. 2021, ${GLOBAL.meta.licence}), vs ${GLOBAL.meta.baseline}.`,
  "Net-zero framing: IPCC AR6 WG1, zero-emissions commitment.",
  "",
  "SIMPLIFICATIONS",
  "Cumulative emissions accumulate from 1850, the first year of the",
  "series, not from 1750. The road, the vehicles and the roadside are",
  "illustration. The slope on the last panel is measured from these two",
  "series and is NOT the IPCC's TCRE, which isolates CO2-only forcing.",
  "This episode's numbers are committed arrays rather than output from",
  "the series data pipeline.",
];
