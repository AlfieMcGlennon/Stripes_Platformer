import type { StorySection } from "@stripes/engine";
import { emittedBetween, FIT, LAST_YEAR, START_YEAR, TOTAL_EMITTED, warmingAt, yearReaching } from "./data";

/**
 * The whole explainer as text, with the same figures as the drive, computed from the
 * same arrays. A reader who never touches the keyboard should still get the point.
 */
const gt = (v: number): string => `${Math.round(v)} Gt`;
const pct = (share: number): string => `${Math.round(share * 100)}%`;

export const STANDFIRST =
  "Why stopping emissions stops the warming getting worse, and does not undo it.";

export const SECTIONS: StorySection[] = [
  {
    heading: "A flow and a stock",
    paragraphs: [
      "Emissions are a flow: how much carbon dioxide we put into the air in a given year. Concentration is a stock: how much is up there in total. The two behave completely differently, and almost every confusion about climate policy comes from treating the second like the first.",
      `Warming tracks the stock. By ${LAST_YEAR} humanity had emitted about ${gt(TOTAL_EMITTED)} of CO₂ since ${START_YEAR}, and the world had warmed about ${warmingAt(LAST_YEAR).toFixed(1)} °C above its 1850–1900 average.`,
    ],
  },
  {
    heading: "Four ways of moving",
    paragraphs: [
      `Horse and cart, ${1850}–${1880}: about ${gt(emittedBetween(1850, 1880).gt)}, ${pct(emittedBetween(1850, 1880).share)} of everything ever emitted. Energy meant muscle, firewood and the first coal, and nobody alive could have noticed the difference it made.`,
      `Coal and steam, 1880–1910: ${gt(emittedBetween(1880, 1910).gt)}, ${pct(emittedBetween(1880, 1910).share)}. Annual emissions nearly doubled as coal moved from the hearth into the economy.`,
      `Oil and the motor car, 1910–1960: ${gt(emittedBetween(1910, 1960).gt)}, ${pct(emittedBetween(1910, 1960).share)}, through two wars and a depression. The smog of this era was visible, so it got cleaned up. The carbon dioxide was invisible, so it stayed.`,
      `The jet age, 1960–2024: ${gt(emittedBetween(1960, 2024).gt)} — ${pct(emittedBetween(1960, 2024).share)} of all of it, inside a single lifetime.`,
    ],
  },
  {
    heading: "The number that does the work",
    paragraphs: [
      `The first thousand gigatonnes took ${yearReaching(1000) - START_YEAR} years. The most recent thousand took ${LAST_YEAR - yearReaching(TOTAL_EMITTED - 1000)}.`,
      "That is the same quantity of carbon dioxide, delivered roughly five times faster.",
    ],
  },
  {
    heading: "Why stopping is not undoing",
    paragraphs: [
      "When emissions fall to zero, the flow stops. The stock does not fall with it: carbon dioxide already in the air stays there for a very long time, so the warming it has caused stays too.",
      "The IPCC's Sixth Assessment Report puts the further warming after emissions reach net zero as likely small — the zero-emissions commitment. Small is not negative. Net zero stops the warming getting worse; it does not reverse it.",
      "That is why the bar in the interactive plateaus rather than falling, and why the hazards stop increasing without going away.",
    ],
  },
  {
    heading: "Warming against the total",
    paragraphs: [
      `Plotting observed warming against observed cumulative emissions gives a near-straight line: about ${(FIT.slope * 1000).toFixed(2)} °C per thousand gigatonnes, with a correlation of ${FIT.r.toFixed(2)} across ${LAST_YEAR - START_YEAR + 1} years.`,
      "That figure is measured from these two series. It is deliberately not called TCRE, the IPCC's transient climate response to cumulative emissions, which isolates carbon-dioxide-only forcing; these observations also carry aerosols, methane and natural variability. The two happen to land close together, which is interesting, but they are not the same quantity.",
    ],
  },
  {
    heading: "What is real here and what is furniture",
    paragraphs: [
      "Emissions and cumulative emissions are the Global Carbon Budget via Our World in Data; temperature is HadCRUT5 from the Met Office Hadley Centre and CRU. Cumulative emissions accumulate from 1850, the first year of the series, not from 1750.",
      "The road, the vehicles, the hazards and the eras are illustration. The hazard rate rises with cumulative emissions because that is the argument being made, not because it came from a dose-response study. This episode is a prototype: its numbers are committed arrays rather than output from the series data pipeline.",
    ],
  },
];
