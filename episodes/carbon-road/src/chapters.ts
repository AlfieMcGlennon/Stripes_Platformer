import { cumulativeAt, emittedBetween, emissionsAt, GLOBAL_META as GLOBAL, signed, TOTAL_EMITTED, warmingAt, yearReaching } from "./data";
import type { VehicleArt } from "./art";

/**
 * The walkthrough script. Each chapter: board a vehicle, drive one energy era,
 * come to a stop, then work through the talking points. Every figure comes from
 * the data module, never typed by hand.
 */
export interface Chapter {
  id: string;
  from: number;
  to: number;
  vehicle: VehicleArt["id"];
  /** Era card shown while boarding. */
  title: string;
  subtitle: string;
  obstacles: number;
  /** Seconds of driving before the vehicle pulls up. */
  seconds: number;
  /** Said once, as the character gets in. */
  boarding: string;
  talk: string[];
}

const pct = (share: number): string => `${Math.round(share * 100)}%`;
const gt = (value: number): string => `${Math.round(value)} Gt`;

const FIRST_1000 = yearReaching(1000);
const LAST_1000 = yearReaching(TOTAL_EMITTED - 1000);

function build(
  id: string, from: number, to: number, vehicle: VehicleArt["id"], title: string, subtitle: string,
  obstacles: number, seconds: number, boarding: string, talk: (e: { gt: number; share: number }) => string[],
): Chapter {
  return { id, from, to, vehicle, title, subtitle, obstacles, seconds, boarding, talk: talk(emittedBetween(from, to)) };
}

export const CHAPTERS: Chapter[] = [
  build("cart", 1850, 1880, "cart", "1850", "MUSCLE, WOOD AND A LITTLE COAL", 2, 9,
    "Climb up. The horse does the work.", (e) => [
      "Energy means muscle, firewood and the first coal.",
      `Thirty years of it added ${gt(e.gt)} of CO₂ — ${pct(e.share)} of everything ever emitted.`,
      `The world had warmed ${signed(warmingAt(1880), 2)} °C. Nobody alive could have noticed.`,
      "The bar at the top is the only thing that remembers. Watch it, not the speedometer.",
    ]),
  build("loco", 1880, 1910, "loco", "1880", "COAL AND STEAM", 3, 11,
    "Up into the cab. Coal does the work now.", (e) => [
      "Mills, railways, furnaces. Coal moves from the hearth into the economy.",
      `${gt(e.gt)} in thirty years, ${pct(e.share)} of the total. Emissions per year have nearly doubled.`,
      "Look behind you. The chimneys are the story, not the locomotive.",
      "Nothing you can see from here is warming yet. The cause runs decades ahead of the effect.",
    ]),
  build("car", 1910, 1960, "car", "1910", "OIL AND THE MOTOR CAR", 4, 13,
    "Get in. This one is yours, and everyone else's.", (e) => [
      "Oil, mass production, roads. The city behind you stops being a town.",
      `1910 to 1960: ${gt(e.gt)}, ${pct(e.share)} of the total, through two wars and a depression.`,
      `Annual emissions: ${emissionsAt(1910).toFixed(1)} Gt in 1910, ${emissionsAt(1960).toFixed(1)} Gt by 1960.`,
      "The smog was visible, so it got cleaned up. The CO₂ was invisible, so it stayed.",
    ]),
  build("jet", 1960, 2024, "jet", "1960", "THE GREAT ACCELERATION", 5, 16,
    "Board. In a moment none of this is on the ground.", (e) => [
      "Jets, plastics, containers, concrete, fertiliser. Everything, everywhere, faster.",
      `1960 to 2024 emitted ${gt(e.gt)} — ${pct(e.share)} of all of it, inside one lifetime.`,
      `The first thousand gigatonnes took ${FIRST_1000 - 1850} years. The most recent thousand took ${2024 - LAST_1000}.`,
      `Warming now: ${signed(warmingAt(2024), 2)} °C. The bar reads ${gt(cumulativeAt(2024))}.`,
      "The hazards did not arrive because you sped up. They arrived because the bar got long.",
    ]),
];

/** The net-zero beat. */
export const CLEAN_TALK: string[][] = [
  [
    "You switch. Electric, wind, sun. The exhaust stops.",
    "Watch the bar, not the needle.",
  ],
  [
    `The bar stopped climbing. It did not fall. ${gt(cumulativeAt(2024))} is still up there.`,
    "Hazards stopped getting worse. They stopped nowhere near zero.",
  ],
  [
    "That is what net zero does: it stops the warming getting worse.",
    "IPCC AR6 WG1: the warming still to come after emissions reach net zero is likely small (the",
    "zero-emissions commitment). Small is not negative. It does not come back down.",
  ],
  [
    "Nothing in this drive could have taken CO₂ back out.",
    "Dodging well never moved the bar. Neither did driving badly.",
  ],
];

export const REVEAL_TALK: string[][] = [
  [
    "Every year, something burned.",
    "Spiky: wars, slumps, a pandemic, a recovery.",
  ],
  [
    "What stayed up there only ever went one way.",
    "Not one dip in the spiky line shows up in this one.",
  ],
  [
    "Now temperature, over the same years.",
    "It follows the smooth line, not the spiky one.",
  ],
  [
    "All 175 years, near enough a straight line.",
    "Warming tracks the total ever emitted. That is why stopping is not undoing.",
  ],
];

/**
 * Credits. Episode 1's rule applies here too: name every source, and name every
 * simplification, because a piece that teaches people to distrust cherry-picked
 * evidence has to be auditable itself.
 */
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
  "series, not from 1750. The road, vehicles, hazards and eras are",
  "illustration, not measurement. The slope on the last panel is",
  "measured from these two series and is NOT the IPCC's TCRE, which",
  "isolates CO2-only forcing. This episode is a prototype: its numbers",
  "are not yet built by the series data pipeline.",
];
