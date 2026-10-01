import type { StorySection } from "@stripes/engine";
import {
  BEST_SHIFT, EARLY, EARLY_STATS, HOTTEST, LATE, LATE_STATS, ratioAt, RECORD_FROM, RECORD_TO,
  SAMPLE_YEAR, SHIFT,
} from "./data";
import { FAR_THRESHOLD, PUSH_EXPLAINS, THRESHOLD } from "./script";

/**
 * The whole explainer as text. Everything the interaction argues is here in prose,
 * with the same numbers, counted from the same arrays — so this is a parallel route
 * to the point rather than a summary of it.
 */
const one = (n: number): string => n.toFixed(1);

export const STANDFIRST =
  "Why a degree of warming is not a slightly warmer version of the same weather.";

export const SECTIONS: StorySection[] = [
  {
    heading: "What you are looking at",
    paragraphs: [
      `Every day of thirty summers is in the ground you walk on: how high the land stands is how many days reached that temperature. The readings are daily maximum temperatures in central England, June to August, from the Met Office's HadCET record. It begins in ${RECORD_FROM} and is the longest daily instrumental series in the world.`,
      "Stacking the days up by temperature makes a distribution. That is not a trend and not a timeline: it throws time away and says only how often each temperature happened. A tall middle means most days were near there; thin ends mean those temperatures were rare.",
    ],
  },
  {
    heading: "The shape, named",
    paragraphs: [
      `Across ${EARLY.label}, the ordinary summer day in central England reached about ${one(EARLY_STATS.mean)} °C.`,
      `Days varied by roughly ${one(EARLY_STATS.sd)} °C either side of that, and about two in three fell inside that band. That band is what people mean by normal weather.`,
      `Out in the thin end, days reaching ${THRESHOLD} °C or more happened about ${one(EARLY_STATS.perSummer(THRESHOLD))} times a summer.`,
    ],
  },
  {
    heading: "What one degree does",
    paragraphs: [
      `Between those thirty summers and ${LATE.label}, the average summer day moved ${one(SHIFT.degrees)} °C. Set against the ${one(EARLY_STATS.sd)} °C of variation already there, that is ${SHIFT.sds.toFixed(2)} of a spread — a nudge, and the reason "one degree" sounds like nothing.`,
      `Days at ${THRESHOLD} °C or above went from ${one(EARLY_STATS.perSummer(THRESHOLD))} a summer to ${one(LATE_STATS.perSummer(THRESHOLD))}: about ${ratioAt(THRESHOLD).toFixed(1)} times as many. At ${FAR_THRESHOLD} °C it is ${EARLY_STATS.count(FAR_THRESHOLD)} days in thirty summers against ${LATE_STATS.count(FAR_THRESHOLD)}. Out in the thin end the counts are small and the multiples jump about — 2.0 times as many at 27 °C, 1.8 at 28, 1.3 at 31, 2.7 at 32. What does not jump about is the direction, and the fact that past 33 °C the earlier thirty summers hold no days at all, so there is no multiple left to quote.`,
      "A small change in the middle of a distribution is a large change at its edge. That is the whole argument, and it is arithmetic rather than opinion.",
    ],
  },
  {
    heading: "Checking it, rather than asserting it",
    paragraphs: [
      `In the interactive you push the earlier pile sideways, which warms every day by the same amount and changes nothing else. Searching for the push that best reproduces the measured ${LATE.label} distribution gives +${BEST_SHIFT.degrees.toFixed(1)} °C — close to the ${one(SHIFT.degrees)} °C the average actually moved. So "the distribution slid sideways by about a degree" is a fair description of what happened.`,
      `It is not the complete description. A plain sideways push accounts for about ${PUSH_EXPLAINS}% of the difference between the two periods; the shape changed a little as well. Saying so costs nothing and is the difference between an explanation and a slogan.`,
    ],
  },
  {
    heading: "About 1976",
    paragraphs: [
      `${SAMPLE_YEAR} is the summer people in England reach for to argue nothing has changed, and it was genuinely exceptional — hotter on average than a typical summer even now. It is also inside the earlier of the two periods here, which is why this explainer names it rather than avoiding it.`,
      `An exceptional summer in the past does not contradict a shifted distribution; it is one of the rare days in the thin end. The hottest day in the entire ${RECORD_FROM}–${RECORD_TO} record is ${HOTTEST.year}, at ${one(HOTTEST.value)} °C.`,
    ],
  },
  {
    heading: "What this does not say",
    paragraphs: [
      `${THRESHOLD} °C is this explainer's threshold, not an official one: England's heat-health alerts use regional thresholds, and nothing here depends on where the line sits — only on it being out in the tail — which you can check by walking to any other temperature and reading the corner.`,
      `The land is drawn with its height set to the square root of each day-count rather than the count itself. On a straight count the busy middle takes up the whole frame and the thin hot edge — where the entire argument lives — is a few pixels tall, so the drawing says the middle changed more than the edge, which is the opposite of the truth. The counts quoted in the corner and here are never scaled.`,
      `One number worth noting, because it is the strongest piece of evidence for describing this as a plain sideways shift: the spread barely moved. The standard deviation of daily maxima was ${EARLY_STATS.sd.toFixed(2)} °C in the earlier thirty summers and ${LATE_STATS.sd.toFixed(2)} °C in the later ones.`,
      "Counts are counted from the record, never fitted to a normal curve. This is one unusually well measured place, not the globe. And changed odds are not attribution: this says how often a hot day happens, not why any particular one did.",
    ],
  },
];
