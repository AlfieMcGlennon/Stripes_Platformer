import type { StorySection } from "@stripes/engine";
import { bestSkill, bestWeights, CLIMATE, LEADS, PERIOD, SITES, skillOf } from "./data";
import { HORIZON, PERSISTENCE } from "./script";

/** The whole explainer as text, with the same computed figures as the panel. */
const two = (v: number): string => v.toFixed(2);
const pct = (v: number): string => `${Math.round(v * 100)}%`;

export const STANDFIRST =
  "Why “they can’t forecast next week” is not an argument about the next thirty years.";

export const SECTIONS: StorySection[] = [
  {
    heading: "What a forecast is, mechanically",
    paragraphs: [
      `A forecast here is a weighted sum. Take today's temperature anomaly — the departure from a smoothed day-of-year average — at ${SITES.length} places, multiply each by a weight, add them up, and that is your prediction for some number of days ahead.`,
      `The weights are fitted by least squares against every day from ${PERIOD.from} to ${PERIOD.to}: ${LEADS[0].n.toLocaleString("en-GB")} days. Skill is scored as one minus error over variance, so predicting "an ordinary day for the time of year" scores zero and a perfect forecast scores one.`,
    ],
  },
  {
    heading: "Copying today does not work for long",
    paragraphs: [
      `The simplest possible rule is "tomorrow will be like today": put all the weight on your own thermometer. It scores ${two(skillOf(PERSISTENCE, 1))} one day out, which is respectable.`,
      `Three days out the same rule scores ${two(skillOf(PERSISTENCE, 3))}. A negative score means it is worse than saying nothing — you would do better guessing the seasonal average than repeating today's weather.`,
    ],
  },
  {
    heading: "What the fit chooses, and why it holds back",
    paragraphs: [
      `At one day ahead the best weights are ${SITES.map((site, i) => `${site.name.split(",")[0]} ${two(bestWeights(1)[i])}`).join(", ")}, scoring ${two(bestSkill(1))}.`,
      `They sum to ${two(bestWeights(1).reduce((a, b) => a + b, 0))} rather than one. That is not a rounding error: leaning less than fully on what you know pulls the answer back toward normal, which is the right thing to do when your information is imperfect. As the lead time grows every weight shrinks further, until by two weeks they are all close to zero.`,
      `A detail worth noticing: at two days ahead, Balmoral in Scotland carries a weight of ${two(bestWeights(2)[3])} against central England's own ${two(bestWeights(2)[0])}. Weather arrives from somewhere, so your own thermometer is not always the best witness to your own tomorrow.`,
    ],
  },
  {
    heading: "The horizon",
    paragraphs: [
      `Refitting the weights at every lead time — giving the method every advantage — skill falls from ${two(bestSkill(1))} at one day to ${two(bestSkill(3))} at three, ${two(bestSkill(7))} at seven and ${two(bestSkill(14))} at fourteen.`,
      `Useful skill runs out around +${HORIZON} days. No combination of these thermometers gets past it, because there is no information left in them about that day. Real operational forecasting does far better than four thermometers — it solves physics on a grid and reaches further — but it meets the same kind of wall, for the same reason.`,
    ],
  },
  {
    heading: "A different question",
    paragraphs: [
      "Here is the trap. From \"weather is unpredictable past a week\" people conclude that nothing about future climate can be known. But those are different questions, and the record answers them differently.",
      `Was next year warmer than last? Right ${CLIMATE[0].hits} times out of ${CLIMATE[0].total} — ${pct(CLIMATE[0].hits / CLIMATE[0].total)}, a coin flip. A single year is weather wearing a longer coat.`,
      `Were the next thirty years warmer than the previous thirty? ${CLIMATE[2].hits} out of ${CLIMATE[2].total} across the whole record, and ${CLIMATE[3].hits} out of ${CLIMATE[3].total} since ${CLIMATE[3].since}. Every single time.`,
      "Nobody can tell you the temperature three weeks from Tuesday. That is not the same as nobody knowing which way the next thirty years go.",
    ],
  },
  {
    heading: "What this is not",
    paragraphs: [
      "Not a weather model. Real forecasts integrate physics on a three-dimensional grid with millions of observations; this is four daily thermometers and a straight line. The point is not the score, it is that the horizon exists and no amount of skill removes it.",
      "One region, one variable, and the skill is measured on the same days the weights were fitted to — so these scores flatter the method rather than being conservative. The collapse with lead time would be at least as steep on data the fit had never seen.",
    ],
  },
];
