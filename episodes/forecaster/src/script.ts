import { bestSkill, bestWeights, CLIMATE, horizon, PERIOD, SITES, skillOf } from "./data";

/**
 * Every figure is computed from the covariances in `data.ts` at runtime. The only
 * typed numbers are the lead times the captions happen to point at.
 */
const USEFUL = 0.05;
export const HORIZON = horizon(USEFUL);

const pct = (v: number): string => `${Math.round(v * 100)}%`;
const two = (v: number): string => v.toFixed(2);

/** Naive persistence: tomorrow will be exactly like today, here. */
export const PERSISTENCE = [1, 0, 0, 0];
const persistenceAt = (lead: number): number => skillOf(PERSISTENCE, lead);

export const TITLE = {
  name: "FORECASTER",
  tagline: "how far ahead can anyone see?",
  caption: [
    "Build a weather forecast out of four thermometers, then push it into the future.",
    "Nothing here is a simulation: it is fitted to every day from 1960 to 2025.",
  ],
};

export const WEIGHTS = [
  [
    "Four places measured this morning. How much should each one count?",
    "↑ ↓ pick a place, ← → change its weight. Watch the equation and the score.",
  ],
  [
    `Zero means "ignore it". One means "copy it exactly".`,
    `The score is how much better than guessing "an ordinary day for the time of year".`,
  ],
];

export const PERSISTENCE_BEAT = [
  [
    "Try putting central England on 1.00 and everything else on zero.",
    `That is "tomorrow will be like today". It scores ${two(persistenceAt(1))} at one day.`,
  ],
  [
    `Now ask for three days: the same rule scores ${two(persistenceAt(3))}.`,
    "A negative score means you would do better saying nothing at all.",
  ],
  [
    "So copying today is not it. Press SPACE and the fit will choose for you.",
  ],
];

export function bestBeat(lead: number): string[][] {
  const w = bestWeights(lead);
  const named = SITES.map((s, i) => `${s.name.split(",")[0]} ${two(w[i])}`).join(", ");
  return [
    [`The best weights for +${lead}d: ${named}.`, `Score ${two(bestSkill(lead))}.`],
    [
      `They add up to ${two(w.reduce((a, b) => a + b, 0))}, not 1.`,
      "Leaning less than fully on what you know pulls the answer toward normal. That is deliberate.",
    ],
    [
      `Scotland counts for ${two(bestWeights(2)[3])} at two days, more than central England's ${two(bestWeights(2)[0])}.`,
      "Weather arrives from somewhere. Your own thermometer is not always the best witness.",
    ],
  ];
}

export const LEAD = [
  [
    "Now push the forecast further out. ← → changes how many days ahead.",
    "Your weights stay as they are. Watch the score.",
  ],
  [
    "And here is the best anyone could do at every lead, refitted each time.",
    "Not your weights. The best weights. It makes almost no difference past a week.",
  ],
  [
    `Useful skill runs out at about +${HORIZON} days.`,
    "No combination of thermometers gets past that. There is nothing left to use.",
  ],
];

export const GIVES_UP = [
  [
    "Look at what the fit does to its own numbers as the lead grows.",
    "Every weight shrinks toward zero.",
  ],
  [
    "It is not giving up out of modesty. It is saying the honest thing:",
    `as information runs out, the best guess is "an ordinary day for the time of year".`,
  ],
];

export const DIFFERENT = [
  [
    "So weather is unpredictable past a week or so. Here is the trap:",
    "people conclude from that that nothing about future climate can be known.",
  ],
  [
    "Same record, different question. Not what Tuesday will be like —",
    "what the average of the next thirty years will be, against the last thirty.",
  ],
];

export function streakBeats(): string[][] {
  const [year, decade, thirty, since1970] = CLIMATE;
  return [
    [
      `Next year warmer than last? Right ${year.hits} times out of ${year.total}: ${pct(year.hits / year.total)}.`,
      "A coin flip. One year is weather wearing a longer coat.",
    ],
    [
      `Next decade warmer than the last? ${decade.hits} of ${decade.total}, ${pct(decade.hits / decade.total)}.`,
      `Next thirty years warmer than the last thirty? ${thirty.hits} of ${thirty.total}, ${pct(thirty.hits / thirty.total)}.`,
    ],
    [
      `And since ${since1970.since}: ${since1970.hits} out of ${since1970.total}.`,
      "Every single time.",
    ],
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
  "Weights are fitted by least squares on the covariances, which is",
  "all this episode ships — 450 numbers, not 80,000 measurements.",
  "",
  "WHAT IT IS NOT",
  "Not a weather model: real forecasting uses physics on a grid,",
  "not four thermometers, and reaches further than this does.",
  "The point is the horizon, which no amount of skill removes.",
  "One region, one variable, and skill measured on the same days",
  "it was fitted to — so these scores are generous, not conservative.",
];
