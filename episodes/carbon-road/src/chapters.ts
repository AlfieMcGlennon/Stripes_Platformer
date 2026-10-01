import {
  cumulativeAt, emissionsAt, emittedBetween, FIT, GLOBAL_META as GLOBAL, LAST_YEAR, signed,
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
  tagline: "everything you burn stays up there",
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
  { atX: 70, lines: ["Hold → to walk. You can stop, read, and walk back whenever you like."] },
  {
    atYear: 1850,
    lines: [
      "This road is a timeline. Where you stand is the year, and the bar at the top is",
      "all the carbon dioxide put into the air up to that year. It only ever goes one way.",
    ],
  },
  {
    atYear: 1856,
    lines: [
      "1850. Energy means muscle, firewood and the first coal.",
      `The world is ${signed(warmingAt(1850), 2)} °C against its 1850–1900 average, and nobody could tell.`,
    ],
  },
  {
    atYear: 1872,
    lines: [
      `Walking a decade takes a moment. ${emissionsAt(1872).toFixed(1)} Gt a year is going up.`,
      "Look behind you: the bar has barely moved.",
    ],
  },
  {
    atYear: 1880,
    lines: [
      "A depot. From here the work is done by coal, and you are riding it.",
      `1850 to 1880 added ${gt(emittedBetween(1850, 1880).gt)} — ${pct(emittedBetween(1850, 1880).share)} of everything ever emitted.`,
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
      `Coal and steam, 1880 to 1910: ${gt(emittedBetween(1880, 1910).gt)}, ${pct(emittedBetween(1880, 1910).share)}.`,
    ],
  },
  {
    atYear: 1935,
    lines: [
      "Smog you could see, in cities you could not breathe in. It got cleaned up.",
      "The carbon dioxide was invisible, so it stayed. That is the whole difference.",
    ],
  },
  {
    atYear: 1960,
    lines: [
      "Last depot. From here it is jets, plastics, containers, concrete, fertiliser.",
      `The motor age, 1910 to 1960: ${gt(emittedBetween(1910, 1960).gt)}, ${pct(emittedBetween(1910, 1960).share)}, through two wars and a slump.`,
    ],
  },
  {
    atYear: 1985,
    lines: [
      "Check the bar. It is climbing faster than you are walking.",
      `${FIRST_1000}: the first thousand gigatonnes, ${FIRST_1000 - START_YEAR} years after you set off.`,
    ],
  },
  {
    atYear: 2005,
    lines: [
      `The most recent thousand took ${LAST_YEAR - LAST_1000} years.`,
      "Same amount of carbon dioxide, delivered about five times faster.",
    ],
  },
  {
    atYear: 2022,
    lines: [
      `1960 to 2024: ${gt(emittedBetween(1960, 2024).gt)} — ${pct(emittedBetween(1960, 2024).share)} of all of it, inside one lifetime.`,
      `Warming now: ${signed(warmingAt(LAST_YEAR), 2)} °C. The bar reads ${gt(cumulativeAt(LAST_YEAR))}.`,
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
      "Emissions: zero. No exhaust behind you.",
      "Now watch the bar. Not the needle — the bar.",
    ],
  },
  {
    atX: ZERO_FROM + 200,
    lines: [
      `It stopped climbing. It did not fall. ${gt(cumulativeAt(LAST_YEAR))} is still up there.`,
      "Carbon dioxide already in the air stays for a very long time, and so does its warming.",
    ],
  },
  {
    atX: ZERO_FROM + 330,
    lines: [
      "IPCC AR6: the warming still to come after net zero is likely small.",
      "Small is not negative. Stopping stops it getting worse. It does not undo it.",
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
    "What stayed up there. Not one dip in the spiky line shows up here.",
    "This is the stock, and it is the one that counts.",
  ],
  [
    "And the temperature, on the same years. It follows the smooth line, not the spiky one.",
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
