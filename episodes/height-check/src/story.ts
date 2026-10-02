import { allRisingFromYears, DERIVED, GLOBAL, PALEO, rankPhrase, signed } from "./data";

/**
 * A parallel text version of the game.
 *
 * A `<canvas>` is opaque to assistive technology, so the teaching content has to
 * exist as real text as well. This doubles as the fallback when the game cannot
 * start at all (locked-down browser, no canvas, a thrown error during boot) and
 * as a transcript a teacher can print.
 *
 * Every number comes from the data pipeline, the same as the captions do.
 */
export const STANDFIRST =
  "Why a single day, or a single year, tells you nothing about a climate trend.";

export interface StorySection {
  heading: string;
  paragraphs: string[];
}

export function storySections(): StorySection[] {
  const first = GLOBAL.annual.start;
  const last = DERIVED.lastYear;
  const c = DERIVED.cherry;
  const years = last - first;
  const slow = (DERIVED.deglacialRatePerCentury * years) / 100;
  const fast = (DERIVED.deglacialRateFastPerCentury * years) / 100;
  const ratioLow = Math.round(DERIVED.lastYearAnomaly / fast);
  const ratioHigh = Math.round(DERIVED.lastYearAnomaly / slow);
  const pct = Math.round(c.coolingWindowShare * 100);
  const rising = allRisingFromYears(c.searchedFrom);
  const lgm = Math.abs(PALEO.lgmDelta).toFixed(1);

  return [
    {
      heading: "The point of the game",
      paragraphs: [
        "A trend is a property of the long view, not of any one day or year. Everything in the game is built to make that one idea physical: you walk on ground whose height is the temperature record, so a noisy stretch is rough terrain and a trend is a hill.",
      ],
    },
    {
      heading: "Level 0 — a ruler",
      paragraphs: [
        "You measure your own height once a day for a week. The numbers wobble. These particular numbers are made up, and the game says so on screen; they are the only invented numbers in it.",
        "Hold the zoom key and you buy more measurements. More record length, clearer signal: that is the whole game in one action.",
      ],
    },
    {
      heading: "Level 1 — months",
      paragraphs: [
        `Now the ground is real data: monthly global temperature from ${GLOBAL.meta.dataset}, month after month. It is rough going. The biggest single month-to-month step in the stretch you walk is about 0.36 °C, and the dip after 1991 is the Pinatubo eruption.`,
        "Then the months average into years, and the ground flattens under your feet. Nothing was removed; the noise was just never the point.",
      ],
    },
    {
      heading: "Level 2 — cherry-picking",
      paragraphs: [
        `A claim people really make online: "the planet has been cooling since ${c.start}." You walk ${c.start} to ${c.end} and the trend really does slope down, at ${c.trendPerDecade.toFixed(2)} °C per decade.`,
        `Then you take one more step, into ${c.end + 1}, and it flips to +${c.trendPlusOneYear.toFixed(2)} °C per decade. Nothing had been established, so nothing really "flipped": seven years of data cannot tell cooling from warming at all. The error bar on that trend is wide enough to cover cooling, no change, and the real warming rate at the same time.`,
        `Since ${c.start} the world has in fact warmed at +${c.trendToLatest.toFixed(2)} °C per decade, faster than its long-run rate of +${c.longTrendPerDecade.toFixed(2)}. Of the seven-year windows since ${c.searchedFrom}, ${pct}% slope downwards. Of the ${rising}-year windows, not one does. Short windows disagree with each other; long ones agree.`,
      ],
    },
    {
      heading: "Level 3 — the stripes",
      paragraphs: [
        `One step per year, ${first} to ${last}: ${years + 1} steps, climbed one at a time. No single step looks like anything much. From the 1940s to the 1970s the climb stalls, partly because sulphur pollution shaded the surface; from the 1970s onwards it is steady.`,
        `At the top you step back and the staircase becomes the warming stripes. ${last} was about ${signed(DERIVED.lastYearAnomaly, 1)} against the ${GLOBAL.meta.baseline} average. The ten warmest years on record are all since ${DERIVED.warmestTen[0]}; ${last} itself is ${rankPhrase(DERIVED.lastYearRank)}.`,
      ],
    },
    {
      heading: "Level 4 — the slide",
      paragraphs: [
        `You sled backwards through 21,000 years, so the steepness of the ground is the rate of change. The last ice age was roughly ${lgm} °C colder than the last few thousand years (Tierney et al. 2020, measured against the late Holocene rather than against 1850-1900).`,
        `Held side by side over the same ${years} years, the ice age's thaw delivered about +${slow.toFixed(2)} to +${fast.toFixed(2)} °C, and the measured modern warming is ${signed(DERIVED.lastYearAnomaly, 1)} — roughly ${ratioLow} to ${ratioHigh} times faster. The range is a range because the length of the thaw is uncertain.`,
        "The IPCC's own statement is narrower and better evidenced than any deep-time ratio: the world has warmed faster since 1970 than in any other 50-year period for at least 2,000 years (AR6 WG1 SPM A.2.2, high confidence).",
        "The ice age ended because orbital shifts warmed the planet, and the oceans then released carbon dioxide and ice melted, amplifying it. Today the trigger is us: greenhouse gases, mostly carbon dioxide from fossil fuels.",
      ],
    },
    {
      heading: "Your stripes",
      paragraphs: [
        `Finally you pick a birth year and see your own lifetime as stripes. If your lifetime is shorter than ${30} years the game refuses to quote a trend for it, and says so — climate is measured over thirty years, and a game about the long view should not make an exception for you.`,
      ],
    },
    {
      heading: "Data and simplifications",
      paragraphs: [
        `Temperature: ${GLOBAL.meta.dataset} (Morice et al. 2021, ${GLOBAL.meta.licence}), anomalies against ${GLOBAL.meta.baseline}. Ice age: Tierney et al. 2020. Warming rate: IPCC AR6 WG1 SPM A.2.2. Stripes concept: Ed Hawkins, showyourstripes.info (CC BY 4.0); colours from ColorBrewer RdBu.`,
        "Simplifications, all of them visible in the game's credits: level 0's heights are invented; the end of the ice age is drawn as a straight line at its average pace, so faster bursts within it are lost; the Holocene is drawn flat; the deep-time colours extend the stripes scale with darker blues, because the stripes scale itself saturates below -0.1 °C and above +1.15 °C; and before 1850 the zero is the late Holocene rather than 1850-1900.",
      ],
    },
  ];
}
