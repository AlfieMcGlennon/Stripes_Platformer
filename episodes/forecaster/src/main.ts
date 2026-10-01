import "@fontsource/pixelify-sans/400.css";
import "@fontsource/silkscreen/400.css";
import { mountPanel, reduceMotion, showBootFailure } from "@stripes/engine";
import { bestWeights, CLIMATE, LEADS, SAMPLE, SITES, skillOf } from "./data";
import { drawCurve, drawEquation, drawMap, drawSliders, drawStreaks } from "./plot";
import {
  bestBeat, CREDITS, DIFFERENT, GIVES_UP, HORIZON, LEAD, PERSISTENCE_BEAT, streakBeats, TITLE,
  WEIGHTS,
} from "./script";
import { SECTIONS, STANDFIRST } from "./story";
import { COLORS, createRenderer, CURVE, VIEW_H, VIEW_W } from "./view";

const STEP = 1 / 60;
const MAX_LEAD = LEADS[LEADS.length - 1].lead;

type Phase = "title" | "weights" | "lead" | "givesup" | "climate" | "credits";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const renderer = createRenderer(canvas);

const s = {
  phase: "title" as Phase,
  time: 0,
  weights: [0.5, 0, 0, 0] as number[],
  selected: 0,
  lead: 1,
  /** Which real day's readings are on the panel. */
  day: 0,
  showBest: false,
  /** Lead times used to show the fit shrinking its own coefficients. */
  shrinkStep: 0,
  streaksShown: 0,
  talk: null as string[][] | null,
  talkLine: 0,
  afterTalk: "title" as Phase,
};

/* ---------- input ---------- */
const held = new Set<string>();
let advance = false;
let switchRow = 0;

const LEFT = ["ArrowLeft", "KeyA"];
const RIGHT = ["ArrowRight", "KeyD"];
const UP = ["ArrowUp", "KeyW"];
const DOWN = ["ArrowDown", "KeyS"];

addEventListener("keydown", (e) => {
  if ([...LEFT, ...RIGHT, ...UP, ...DOWN, "Space", "Enter"].includes(e.code)) e.preventDefault();
  if (!held.has(e.code)) {
    if (e.code === "Space" || e.code === "Enter") advance = true;
    if (UP.includes(e.code)) switchRow = -1;
    if (DOWN.includes(e.code)) switchRow = 1;
  }
  held.add(e.code);
});
addEventListener("keyup", (e) => held.delete(e.code));

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  const p = renderer.clientToView(e.clientX, e.clientY);
  // Tapping a slider row selects it; tapping its bar sets the weight; else continue.
  if (s.phase === "weights" && p.x > 140 && p.y > 30 && p.y < 110) {
    const row = Math.max(0, Math.min(3, Math.floor((p.y - 34) / 18)));
    s.selected = row;
    if (p.x > 252) s.weights[row] = Math.max(-0.2, Math.min(1, ((p.x - 252) / 180) * 1.2 - 0.2));
  } else if (s.phase === "lead" && p.y > CURVE.y - 6 && p.y < CURVE.y + CURVE.h + 10) {
    s.lead = Math.max(1, Math.min(MAX_LEAD, 1 + ((p.x - CURVE.x) / CURVE.w) * (MAX_LEAD - 1)));
  } else advance = true;
});

const pressing = (keys: string[]): boolean => keys.some((k) => held.has(k));

/* ---------- helpers ---------- */
const anomalies = (): number[] => SAMPLE[s.day % SAMPLE.length].x;
const today = (): string => SAMPLE[s.day % SAMPLE.length].d;

function beginTalk(block: string[][], after: Phase): void {
  s.talk = block;
  s.talkLine = 0;
  s.afterTalk = after;
}

/* ---------- update ---------- */
function update(dt: number): void {
  s.time += dt;
  const go = advance;
  const row = switchRow;
  advance = false;
  switchRow = 0;

  if (s.talk) {
    if (!go) return;
    s.talkLine++;
    // The two staged phases reveal themselves as the talk advances, so there is
    // exactly one thing new on screen per press.
    if (s.phase === "givesup") s.shrinkStep = Math.min(2, s.talkLine);
    if (s.phase === "climate") s.streaksShown = Math.max(0, Math.min(CLIMATE.length, s.talkLine - DIFFERENT.length + 1));
    if (s.talkLine < s.talk.length) return;
    s.talk = null;
    s.phase = s.afterTalk;
    if (s.phase === "climate") {
      s.streaksShown = 0;
      beginTalk([...DIFFERENT, ...streakBeats()], "credits");
    }
    return;
  }

  switch (s.phase) {
    case "title":
      if (go) beginTalk(WEIGHTS, "weights");
      return;

    case "weights": {
      if (row) s.selected = (s.selected + row + SITES.length) % SITES.length;
      const step = 0.5 * dt;
      if (pressing(RIGHT)) s.weights[s.selected] = Math.min(1, s.weights[s.selected] + step);
      if (pressing(LEFT)) s.weights[s.selected] = Math.max(-0.2, s.weights[s.selected] - step);
      // Cycle the day being shown, so the readings are not a single lucky morning.
      if (!reduceMotion() && Math.floor(s.time * 0.5) !== Math.floor((s.time - dt) * 0.5)) s.day++;
      if (go) {
        const naive = Math.abs(s.weights[0] - 1) < 0.08 && s.weights.slice(1).every((w) => Math.abs(w) < 0.08);
        beginTalk(naive ? bestBeat(1) : PERSISTENCE_BEAT, "weights");
        if (naive) s.weights = bestWeights(1);
        return;
      }
      return;
    }

    case "lead": {
      const step = 9 * dt;
      if (pressing(RIGHT)) s.lead = Math.min(MAX_LEAD, s.lead + step);
      if (pressing(LEFT)) s.lead = Math.max(1, s.lead - step);
      if (go) {
        if (!s.showBest) {
          s.showBest = true;
          beginTalk([LEAD[1]], "lead");
        } else {
          s.lead = HORIZON;
          s.phase = "givesup";
          s.shrinkStep = 0;
          beginTalk([LEAD[2], ...GIVES_UP], "climate");
        }
      }
      return;
    }

    // Both of these are driven entirely by their caption blocks, set when entered.
    case "givesup":
    case "climate":
      return;

    case "credits":
      if (go) {
        s.phase = "title";
        s.weights = [0.5, 0, 0, 0];
        s.lead = 1;
        s.showBest = false;
        s.shrinkStep = 0;
        s.streaksShown = 0;
      }
      return;
  }
}

/* ---------- draw ---------- */
function hud(): void {
  renderer.rect(0, 0, VIEW_W, 26, "rgba(5,6,13,0.8)");
  renderer.text("FORECASTER", 8, 5, { size: 10, color: COLORS.gold, title: true });
  const score = skillOf(s.weights, s.lead);
  renderer.text(`${today()}  ·  +${Math.round(s.lead)} day${Math.round(s.lead) === 1 ? "" : "s"} ahead`, 110, 7,
    { size: 8, color: COLORS.dim });
  renderer.text(`score ${score.toFixed(2)}`, VIEW_W - 8, 6, {
    size: 9, color: score > 0.3 ? COLORS.gold : score > 0 ? COLORS.ink : COLORS.hot, align: "right",
  });
}

function drawShrinking(): void {
  const leads = [1, 7, 14];
  renderer.text("what the fit chooses, as you ask for more", 40, 40, { size: 8, color: COLORS.ink });
  leads.slice(0, s.shrinkStep + 1).forEach((lead, row) => {
    const y = 60 + row * 40;
    const w = bestWeights(lead);
    renderer.text(`+${lead} day${lead === 1 ? "" : "s"}`, 40, y, { size: 9, color: COLORS.gold, title: true });
    SITES.forEach((site, i) => {
      const x = 118 + i * 88;
      renderer.text(site.name.split(",")[0], x, y, { size: 7, color: COLORS.dim });
      renderer.rect(x, y + 10, 72, 6, COLORS.plate);
      renderer.rect(x, y + 10, Math.max(1, Math.round(72 * Math.max(0, w[i]))), 6, COLORS.cold);
      renderer.text(w[i].toFixed(2), x, y + 18, { size: 7, color: COLORS.ink });
    });
  });
}

function drawCredits(): void {
  let y = 8;
  for (const line of CREDITS) {
    if (!line) {
      y += 4;
      continue;
    }
    const heading = line === line.toUpperCase();
    renderer.text(line, VIEW_W / 2, y, {
      size: heading ? 8 : 7,
      color: heading ? COLORS.gold : COLORS.ink,
      align: "center",
      title: line === "FORECASTER",
    });
    y += heading ? 11 : 9;
  }
  if (reduceMotion() || Math.floor(s.time * 2) % 2 === 0) {
    renderer.text("SPACE to run it again", VIEW_W / 2, VIEW_H - 12, { size: 8, color: COLORS.gold, align: "center" });
  }
}

function draw(): void {
  renderer.clear(COLORS.ground);

  if (s.phase === "credits") {
    drawCredits();
    renderer.present();
    return;
  }

  if (s.phase === "climate") {
    hud();
    renderer.text("a different question", VIEW_W / 2, 30, { size: 10, color: COLORS.gold, align: "center", title: true });
    drawStreaks(renderer, CLIMATE, s.streaksShown);
  } else if (s.phase === "givesup") {
    hud();
    drawShrinking();
  } else {
    hud();
    drawMap(renderer, s.weights, s.selected, anomalies());
    drawSliders(renderer, s.weights, s.selected, anomalies());
    drawEquation(renderer, s.weights, anomalies(), Math.round(s.lead));
    drawCurve(renderer, s.weights, s.lead, s.showBest, HORIZON);

    if (s.phase === "title") {
      renderer.rect(0, 86, VIEW_W, 40, "rgba(5,6,13,0.88)");
      renderer.text(TITLE.name, VIEW_W / 2, 92, { size: 18, color: COLORS.gold, align: "center", title: true });
      renderer.text(TITLE.tagline, VIEW_W / 2, 112, { size: 9, color: COLORS.ink, align: "center" });
    }
  }

  if (s.talk) renderer.caption(s.talk[s.talkLine], "SPACE", s.time);
  else {
    const prompts: Partial<Record<Phase, string[]>> = {
      title: TITLE.caption,
      weights: WEIGHTS[0],
      lead: LEAD[0],
    };
    const lines = prompts[s.phase];
    if (lines) renderer.caption(lines, s.phase === "weights" || s.phase === "lead" ? false : "SPACE", s.time);
  }
  renderer.present();
}

/* ---------- loop ---------- */
let accumulator = 0;
let last = performance.now();

function frame(now: number): void {
  requestAnimationFrame(frame);
  accumulator += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (accumulator >= STEP) {
    update(STEP);
    accumulator -= STEP;
  }
  draw();
}

async function fontsReady(timeoutMs = 1500): Promise<void> {
  const load = Promise.all([
    document.fonts.load('16px "Pixelify Sans"'),
    document.fonts.load("16px Silkscreen"),
  ]);
  await Promise.race([load, new Promise((resolve) => setTimeout(resolve, timeoutMs))]).catch(() => undefined);
}

try {
  mountPanel({ title: "Forecaster", standfirst: STANDFIRST, sections: SECTIONS, renderer });
  void fontsReady()
    .then(() => requestAnimationFrame(frame))
    .catch(showBootFailure);
} catch (err) {
  showBootFailure(err);
}
