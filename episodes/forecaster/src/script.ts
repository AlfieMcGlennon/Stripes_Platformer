import { bestSkill, bestWeights, CLIMATE, horizon, PERIOD, SITES, skillOf } from "./data";

/**
 * Captions, hung on places rather than on a timeline. Every figure is computed from
 * the covariances at runtime; the only typed numbers are the lead times a caption
 * happens to point at.
 *
 * Each one is short on purpose. The reader is standing somewhere and can stay as
 * long as they like, so nothing needs to be said twice or at length.
 */
const USEFUL = 0.05;
export const HORIZON = horizon(USEFUL);
export const PERSISTENCE = [1, 0, 0, 0];

const two = (v: number): string => v.toFixed(2);
const pct = (v: number): string => `${Math.round(v * 100)}%`;
const place = (i: number): string => SITES[i].name.split(",")[0];

export const TITLE = {
  name: "FORECASTER",
  tagline: "how far ahead can anyone see?",
};

export const OPENING = [
  ["Hold → to walk. You can stop, read, and walk back whenever you like."],
  [
    "There are four weather stations along this road.",
    "Collect them, and we will build a forecast out of what they measured this morning.",
  ],
];

/** One per station, in the order they are met. */
export const STATION_LINES: string[][][] = [
  [
    [`${place(0)}. Your own thermometer: today's reading, against a normal day for the date.`],
    [
      `Guess that tomorrow is the same as today, and you score ${two(skillOf(PERSISTENCE, 1))}.`,
      `Zero would mean no better than saying "an ordinary day for the time of year".`,
    ],
  ],
  [
    [`${place(1)}, out west on the Atlantic. Weather tends to arrive from there.`],
    [
      `On its own it predicts central England's tomorrow at ${two(skillOf([0, 1, 0, 0], 1))}.`,
      "Worse than your own thermometer — but it knows something yours does not.",
    ],
  ],
  [
    [`${place(2)}, east, in the Netherlands. Usually downwind of us.`],
    ["Downwind is a poor witness to what is coming. Collect it anyway; the fit can decide."],
  ],
  [
    [`${place(3)}, north, in the Scottish Highlands.`],
    [
      `Alone it scores ${two(skillOf([0, 0, 0, 1], 2))} two days out — better than your own ${two(skillOf(PERSISTENCE, 2))}.`,
      "Hold that thought. It comes back.",
    ],
  ],
];

export const BENCH = [
  ["All four. Now let least squares weigh them, against every day from " +
    `${PERIOD.from} to ${PERIOD.to}.`],
  [
    `For tomorrow: ${SITES.map((_, i) => `${place(i)} ${two(bestWeights(1)[i])}`).join(", ")}.`,
    `Score ${two(bestSkill(1))}.`,
  ],
  [
    `${place(3)} is weighted ${two(bestWeights(2)[3])} at two days — above ${place(0)}'s ${two(bestWeights(2)[0])}.`,
    "Weather arrives from somewhere. Your own thermometer is not always the best witness.",
  ],
  [
    `The weights add to ${two(bestWeights(1).reduce((a, b) => a + b, 0))}, not 1.`,
    "Holding back pulls the answer toward normal. With imperfect information, that is correct.",
  ],
  ["Now keep walking. From here, how far right you are is how many days ahead you are asking about."],
];

/*
 * Fired at lead times along the corridor, where how far right you are is how many
 * days ahead you are asking about. Stops stay at least two lead days apart: the
 * walk holds still while a caption is read, and a stop one day from the last is
 * half a second of walking rather than a stretch of road. There was a stop at a
 * week, scoring 0.06 against the horizon post's 0.04 one day later -- a tenth of
 * the same statement, so its one useful line moved back to five days.
 */
export const CORRIDOR: { lead: number; lines: string[] }[] = [
  { lead: 2, lines: [`Two days out. Best possible: ${two(bestSkill(2))}.`] },
  {
    lead: 3,
    lines: [
      `Three days: ${two(bestSkill(3))}. And "tomorrow is like today" now scores ${two(skillOf(PERSISTENCE, 3))}.`,
      "Negative. Worse than saying nothing at all.",
    ],
  },
  {
    lead: 5,
    lines: [
      `Five days: ${two(bestSkill(5))}. The fog is the score, not the weather.`,
      "Every weight the fit chooses has shrunk towards zero. It is not being modest.",
    ],
  },
  {
    lead: HORIZON,
    lines: [
      `This post is +${HORIZON} days, where useful skill runs out.`,
      "No combination of these four gets past it. There is nothing left in them to use.",
    ],
  },
  {
    lead: 14,
    lines: [
      `A fortnight: ${two(bestSkill(14))}. You can keep walking. You just cannot see.`,
      "Real forecasts do better than four thermometers, and still meet a wall like this one.",
    ],
  },
  {
    lead: 26,
    lines: [
      "People stop here and conclude that nothing about the future climate can be known.",
      "That is the mistake. Keep going.",
    ],
  },
];

export function climateLines(): string[][] {
  const [year, decade, thirty, since1970] = CLIMATE;
  return [
    [
      "Same record. A question with a different shape:",
      "not what next Tuesday will be, but how one stretch of years compares with the last.",
    ],
    [
      `Next year warmer than last? Right ${year.hits} times out of ${year.total} — ${pct(year.hits / year.total)}.`,
      "A coin flip. One year is weather wearing a longer coat.",
    ],
    [
      `Next decade warmer than the last? ${decade.hits} of ${decade.total}.`,
      `Next thirty years? ${thirty.hits} of ${thirty.total}.`,
    ],
    [`And since ${since1970.since}: ${since1970.hits} out of ${since1970.total}. Every time.`],
    [
      "Nobody can tell you the temperature three weeks from Tuesday.",
      "That is not the same as nobody knowing which way the next thirty years go.",
    ],
  ];
}

export const CREDITS: string[] = [
  "FORECASTER",
  "",
  "DATA",
  "Daily maximum temperature. Central England: HadCET,",
  "Met Office Hadley Centre, Open Government Licence v3.",
  "Valentia, De Bilt and Balmoral: GHCN-Daily, NOAA NCEI,",
  "Menne et al. (2012), J. Atmos. Oceanic Technol.",
  `Fitted over every day from ${PERIOD.from} to ${PERIOD.to}.`,
  "",
  "HOW IT WORKS",
  "Anomalies are departures from a smoothed day-of-year average,",
  "so nothing scores well merely by knowing it is July.",
  "Skill is 1 − error ÷ variance: zero means no better than normal.",
  "Weights come from least squares on the covariances, which is all",
  "this episode ships — 450 numbers, not 80,000 measurements.",
  "",
  "WHAT IT IS NOT",
  "Not a weather model: real forecasting solves physics on a grid,",
  "not four thermometers, and reaches further than this does.",
  "The point is the horizon, which no amount of skill removes.",
  "One region, one variable, and skill measured on the same days",
  "it was fitted to — so these scores flatter the method.",
];
