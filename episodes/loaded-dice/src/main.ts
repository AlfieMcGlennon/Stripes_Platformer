import "@fontsource/pixelify-sans/400.css";
import "@fontsource/silkscreen/400.css";
import { reduceMotion } from "@stripes/engine";
import {
  drawAnatomy, drawAxis, drawBars, drawBigDay, drawOutline, drawPushGauge, drawShifted,
  drawThresholdHandle, shadeTail,
} from "./curve";
import {
  BEST_SHIFT, BIN_HI, BIN_LO, EARLY, EARLY_DAYS, EARLY_STATS, histogram, LATE, LATE_DAYS,
  SAMPLE_SUMMER,
} from "./data";
import {
  AFTER_BUILD, ANATOMY, BUILD, CLOSING, CREDITS, MATCH, MATCHED_HINT, PUSH, pushReadout,
  smallCounts, TAIL, tailReadout, TITLE,
} from "./script";
import { celsiusAt, COLORS, createRenderer, FLOOR, PLOT, VIEW_H, VIEW_W } from "./view";

const STEP = 1 / 60;
/** Days per second while pouring: the player holds the key, so they set the pace. */
const POUR_RATE = 320;
/** How close to the real shift counts as finding it. */
const MATCH_TOLERANCE = 0.2;

type Phase = "title" | "build" | "anatomy" | "push" | "match" | "tail" | "credits";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const renderer = createRenderer(canvas);

const BINS = BIN_HI - BIN_LO;
const EARLY_BINS = histogram(EARLY_DAYS, BIN_LO, BIN_HI);
const LATE_BINS = histogram(LATE_DAYS, BIN_LO, BIN_HI);
const PEAK = Math.max(...EARLY_BINS, ...LATE_BINS);

const s = {
  phase: "title" as Phase,
  time: 0,
  poured: 0,
  landed: new Array(BINS).fill(0) as number[],
  peak: 4,
  /** How far the player has pushed the early pile, in degrees. */
  push: 0,
  threshold: 24,
  steering: false,
  talk: null as string[][] | null,
  talkLine: 0,
  afterTalk: "title" as Phase,
};

/* ---------- input ---------- */
const held = new Set<string>();
let advance = false;
let pointerAt: number | null = null;

const LEFT = ["ArrowLeft", "KeyA"];
const RIGHT = ["ArrowRight", "KeyD"];
const pressing = (keys: string[]): boolean => keys.some((k) => held.has(k));

addEventListener("keydown", (e) => {
  if ([...LEFT, ...RIGHT, "Space", "Enter"].includes(e.code)) e.preventDefault();
  if (!held.has(e.code) && (e.code === "Space" || e.code === "Enter")) advance = true;
  held.add(e.code);
});
addEventListener("keyup", (e) => held.delete(e.code));

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  const p = renderer.clientToView(e.clientX, e.clientY);
  const steerable = s.phase === "push" || s.phase === "tail";
  if (steerable && !s.talk && p.y > PLOT.y - 20 && p.y < FLOOR + 12) {
    pointerAt = p.x;
    s.steering = true;
  } else advance = true;
});
canvas.addEventListener("pointermove", (e) => {
  if (pointerAt !== null) pointerAt = renderer.clientToView(e.clientX, e.clientY).x;
});
addEventListener("pointerup", () => {
  pointerAt = null;
  s.steering = false;
});

const pouring = (): boolean => held.has("Space") || held.has("Enter") || pointerAt !== null;

/* ---------- helpers ---------- */
function land(celsius: number): void {
  const bin = Math.floor(celsius) - BIN_LO;
  if (bin < 0 || bin >= BINS) return;
  s.landed[bin]++;
  s.peak = Math.max(s.peak, s.landed[bin]);
}

function beginTalk(block: string[][], after: Phase): void {
  s.talk = block;
  s.talkLine = 0;
  s.afterTalk = after;
}

function reset(): void {
  s.poured = 0;
  s.landed = new Array(BINS).fill(0);
  s.peak = 4;
  s.push = 0;
  s.threshold = 24;
}

const matched = (): boolean => Math.abs(s.push - BEST_SHIFT.degrees) <= MATCH_TOLERANCE;

/* ---------- update ---------- */
function update(dt: number): void {
  s.time += dt;
  const go = advance;
  advance = false;

  // A caption block suspends the phase beneath it: nothing to do but read.
  if (s.talk) {
    if (!go) return;
    s.talkLine++;
    if (s.talkLine < s.talk.length) return;
    s.talk = null;
    s.phase = s.afterTalk;
    return;
  }

  switch (s.phase) {
    case "title":
      if (go) {
        reset();
        s.phase = "build";
      }
      return;

    case "build":
      if (pouring() && s.poured < EARLY_DAYS.length) {
        const n = Math.min(EARLY_DAYS.length - s.poured, Math.max(1, Math.round(POUR_RATE * dt)));
        for (let i = 0; i < n; i++) land(EARLY_DAYS[s.poured + i] / 10);
        s.poured += n;
        if (s.poured >= EARLY_DAYS.length) beginTalk(AFTER_BUILD, "anatomy");
      }
      return;

    case "anatomy":
      if (go) beginTalk(ANATOMY, "push");
      return;

    case "push": {
      const step = 0.55 * dt;
      if (pressing(RIGHT)) s.push += step;
      if (pressing(LEFT)) s.push -= step;
      if (pointerAt !== null) {
        // Dragging right of where the pile started pushes it that far.
        s.push = Math.max(0, celsiusAt(pointerAt) - EARLY_STATS.mean);
      }
      s.push = Math.max(0, Math.min(2.5, s.push));
      if (go && s.push > 0.05) beginTalk(MATCH, "tail");
      return;
    }

    case "match":
      if (go) beginTalk(TAIL, "tail");
      return;

    case "tail": {
      const step = 7 * dt;
      if (pressing(LEFT)) s.threshold -= step;
      if (pressing(RIGHT)) s.threshold += step;
      if (pointerAt !== null) s.threshold = celsiusAt(pointerAt);
      s.threshold = Math.max(BIN_LO + 2, Math.min(BIN_HI - 2, s.threshold));
      if (go) beginTalk(CLOSING, "credits");
      return;
    }

    case "credits":
      if (go) {
        reset();
        s.phase = "title";
      }
      return;
  }
}

/* ---------- draw ---------- */
function hud(left: string, right?: string, rightColour: string = COLORS.dim): void {
  renderer.rect(0, 0, VIEW_W, 22, "rgba(5,6,13,0.78)");
  renderer.text(left, 8, 5, { size: 9, color: COLORS.gold, title: true });
  if (right) renderer.text(right, VIEW_W - 8, 6, { size: 8, color: rightColour, align: "right" });
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
      title: line === "LOADED DICE",
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

  drawAxis(renderer);
  const steering = s.steering || pressing(LEFT) || pressing(RIGHT);

  switch (s.phase) {
    case "title":
      drawBars(renderer, EARLY_BINS, PEAK, 0.3);
      renderer.rect(0, 48, VIEW_W, 34, "rgba(5,6,13,0.84)");
      renderer.text(TITLE.name, VIEW_W / 2, 54, { size: 16, color: COLORS.gold, align: "center", title: true });
      renderer.text(TITLE.tagline, VIEW_W / 2, 72, { size: 8, color: COLORS.ink, align: "center" });
      drawBigDay(renderer, SAMPLE_SUMMER[0].v / 10, SAMPLE_SUMMER[0].l, PLOT.x + 22, PLOT.y + 4);
      break;

    case "build":
      hud(EARLY.label, `${s.poured} of ${EARLY_DAYS.length} days`);
      drawBars(renderer, s.landed, s.peak);
      break;

    case "anatomy": {
      hud("what this shape is");
      drawBars(renderer, EARLY_BINS, PEAK);
      const step = s.talk ? s.talkLine : 0;
      drawAnatomy(renderer, EARLY_STATS, {
        middle: true,
        spread: step >= 1,
        tails: step >= 2,
      });
      break;
    }

    case "push":
    case "match": {
      const showMeasured = s.phase === "match" || s.talk !== null;
      hud("push it", pushReadout(s.push), matched() ? COLORS.gold : COLORS.ink);
      drawOutline(renderer, EARLY_BINS, PEAK, COLORS.cold, true);
      drawShifted(renderer, s.push, PEAK);
      if (showMeasured) drawOutline(renderer, LATE_BINS, PEAK, COLORS.hot, false);
      drawPushGauge(renderer, s.push, BEST_SHIFT.degrees, matched());
      renderer.text(EARLY.label, PLOT.x + 2, PLOT.y - 11, { size: 7, color: COLORS.cold });
      if (showMeasured) renderer.text(`${LATE.label} measured`, PLOT.x + 60, PLOT.y - 11, { size: 7, color: COLORS.hot });
      if (!s.talk && matched()) {
        renderer.text(MATCHED_HINT, VIEW_W / 2, FLOOR + 14, { size: 7, color: COLORS.gold, align: "center" });
      }
      break;
    }

    case "tail": {
      hud("how often?", tailReadout(s.threshold), COLORS.ink);
      drawBars(renderer, EARLY_BINS, PEAK, 0.45);
      drawOutline(renderer, EARLY_BINS, PEAK, COLORS.cold, true);
      shadeTail(renderer, LATE_BINS, PEAK, s.threshold, "rgba(209,73,91,0.5)");
      drawOutline(renderer, LATE_BINS, PEAK, COLORS.hot, false);
      drawThresholdHandle(renderer, s.threshold, steering);
      renderer.text(EARLY.label, PLOT.x + 2, PLOT.y - 11, { size: 7, color: COLORS.cold });
      renderer.text(LATE.label, PLOT.x + 60, PLOT.y - 11, { size: 7, color: COLORS.hot });
      const note = smallCounts(s.threshold);
      if (note) renderer.text(note, VIEW_W / 2, FLOOR + 14, { size: 7, color: COLORS.dim, align: "center" });
      break;
    }
  }

  if (s.talk) renderer.caption(s.talk[s.talkLine], "SPACE", s.time);
  else {
    const prompts: Partial<Record<Phase, string[]>> = {
      title: TITLE.caption,
      build: BUILD,
      anatomy: ["Three things worth naming before we move it. SPACE."],
      push: PUSH[s.push > 0.4 ? 1 : 0],
      tail: TAIL[0],
    };
    const lines = prompts[s.phase];
    if (lines) renderer.caption(lines, s.phase === "push" || s.phase === "tail" ? false : "SPACE", s.time);
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

void fontsReady().then(() => requestAnimationFrame(frame));
