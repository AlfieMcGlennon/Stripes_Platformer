import "@fontsource/pixelify-sans/400.css";
import "@fontsource/silkscreen/400.css";
import { reduceMotion } from "@stripes/engine";
import {
  drawAxis, drawBars, drawBigDay, drawFlights, drawOutline, drawThresholdHandle, shadeTail,
  type Flight,
} from "./curve";
import {
  BIN_HI, BIN_LO, EARLY, EARLY_DAYS, histogram, LATE, LATE_DAYS, SAMPLE_SUMMER,
} from "./data";
import {
  AFTER_ONE, AFTER_SUMMER, AFTER_TEN, AFTER_THIRTY, CLOSING, CREDITS, PLACE_ONE, readout,
  SECOND, smallCounts, SUMMER, TAIL, THIRTY, THRESHOLD, TEN, TITLE,
} from "./script";
import { celsiusAt, COLORS, createRenderer, FLOOR, PLOT, VIEW_H, VIEW_W, xFor } from "./view";

const STEP = 1 / 60;
/** Days placed by hand before the player is allowed to pour. Ten is enough to see nothing. */
const BY_HAND = 10;
/** Days per second while pouring. The player holds the key, so they set the pace. */
const SUMMER_RATE = 26;
const THIRTY_RATE = 320;

type Phase = "title" | "one" | "ten" | "summer" | "thirty" | "second" | "tail" | "credits";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const renderer = createRenderer(canvas);

const BINS = BIN_HI - BIN_LO;
const EARLY_BINS = histogram(EARLY_DAYS, BIN_LO, BIN_HI);
const LATE_BINS = histogram(LATE_DAYS, BIN_LO, BIN_HI);
const BOTH_PEAK = Math.max(...EARLY_BINS, ...LATE_BINS);

const s = {
  phase: "title" as Phase,
  time: 0,
  /** The day in the player's hand, in phase "one". */
  heldAt: 22,
  /** How many of SAMPLE_SUMMER have been used. */
  used: 0,
  /** How many of EARLY_DAYS have been poured. */
  poured: 0,
  landed: new Array(BINS).fill(0) as number[],
  peak: 4,
  flights: [] as Flight[],
  threshold: 24,
  grabbed: false,
  /** A block of caption beats overlaid on whatever phase is showing. */
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

addEventListener("keydown", (e) => {
  if ([...LEFT, ...RIGHT, "Space", "Enter"].includes(e.code)) e.preventDefault();
  if (!held.has(e.code) && (e.code === "Space" || e.code === "Enter")) advance = true;
  held.add(e.code);
});
addEventListener("keyup", (e) => held.delete(e.code));

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  const p = renderer.clientToView(e.clientX, e.clientY);
  // Touching the plot steers; touching anywhere else is "continue".
  if (p.y > PLOT.y - 16 && p.y < FLOOR + 10 && (s.phase === "one" || s.phase === "tail")) {
    pointerAt = p.x;
    s.grabbed = true;
  } else advance = true;
});
canvas.addEventListener("pointermove", (e) => {
  if (pointerAt === null) return;
  pointerAt = renderer.clientToView(e.clientX, e.clientY).x;
});
addEventListener("pointerup", () => {
  if (pointerAt !== null && s.phase === "one") advance = true;
  pointerAt = null;
  s.grabbed = false;
});

const pouring = (): boolean => held.has("Space") || held.has("Enter") || pointerAt !== null;

/* ---------- helpers ---------- */
function place(celsius: number, from: { x: number; y: number } | null): void {
  if (from && !reduceMotion()) s.flights.push({ celsius, from, t: 0 });
  else land(celsius);
}

function land(celsius: number): void {
  const bin = Math.floor(celsius) - BIN_LO;
  if (bin < 0 || bin >= BINS) return;
  s.landed[bin]++;
  s.peak = Math.max(s.peak, s.landed[bin]);
}

function sampleDay(i: number): number {
  return SAMPLE_SUMMER[i].v / 10;
}

function beginTalk(block: string[][], after: Phase): void {
  s.talk = block;
  s.talkLine = 0;
  s.afterTalk = after;
}

function clearPile(): void {
  s.landed = new Array(BINS).fill(0);
  s.peak = 4;
  s.flights = [];
}

/* ---------- update ---------- */
function update(dt: number): void {
  s.time += dt;
  const go = advance;
  advance = false;

  for (const f of s.flights) {
    f.t += dt * 2.6;
    if (f.t >= 1) land(f.celsius);
  }
  s.flights = s.flights.filter((f) => f.t < 1);

  // A caption block suspends the phase beneath it: nothing to do but read.
  if (s.talk) {
    if (!go) return;
    s.talkLine++;
    if (s.talkLine < s.talk.length) return;
    s.talk = null;
    s.phase = s.afterTalk;
    if (s.phase === "thirty") clearPile();
    return;
  }

  switch (s.phase) {
    case "title":
      if (go) {
        s.phase = "one";
        s.used = 0;
        clearPile();
      }
      return;

    case "one": {
      const step = 9 * dt;
      if (LEFT.some((k) => held.has(k))) s.heldAt -= step;
      if (RIGHT.some((k) => held.has(k))) s.heldAt += step;
      if (pointerAt !== null) s.heldAt = celsiusAt(pointerAt);
      s.heldAt = Math.max(BIN_LO, Math.min(BIN_HI - 1, s.heldAt));
      if (go) {
        // It lands at its real temperature wherever they aimed: the axis is the truth.
        place(sampleDay(0), { x: xFor(s.heldAt), y: PLOT.y - 2 });
        s.used = 1;
        beginTalk(AFTER_ONE, "ten");
      }
      return;
    }

    case "ten":
      if (go && s.used < BY_HAND) {
        place(sampleDay(s.used), { x: VIEW_W / 2, y: PLOT.y - 2 });
        s.used++;
        if (s.used >= BY_HAND) beginTalk(AFTER_TEN, "summer");
      }
      return;

    case "summer":
      if (pouring() && s.used < SAMPLE_SUMMER.length) {
        const n = Math.min(SAMPLE_SUMMER.length - s.used, Math.max(1, Math.round(SUMMER_RATE * dt)));
        for (let i = 0; i < n; i++) land(sampleDay(s.used + i));
        s.used += n;
        if (s.used >= SAMPLE_SUMMER.length) beginTalk(AFTER_SUMMER, "thirty");
      }
      return;

    case "thirty":
      if (pouring() && s.poured < EARLY_DAYS.length) {
        const n = Math.min(EARLY_DAYS.length - s.poured, Math.max(1, Math.round(THIRTY_RATE * dt)));
        for (let i = 0; i < n; i++) land(EARLY_DAYS[s.poured + i] / 10);
        s.poured += n;
        if (s.poured >= EARLY_DAYS.length) beginTalk(AFTER_THIRTY, "second");
      }
      return;

    case "second":
      if (go) beginTalk(SECOND, "tail");
      return;

    case "tail": {
      const step = 7 * dt;
      if (LEFT.some((k) => held.has(k))) s.threshold -= step;
      if (RIGHT.some((k) => held.has(k))) s.threshold += step;
      if (pointerAt !== null) s.threshold = celsiusAt(pointerAt);
      s.threshold = Math.max(BIN_LO + 2, Math.min(BIN_HI - 2, s.threshold));
      if (go) beginTalk([...TAIL.slice(1), ...CLOSING], "credits");
      return;
    }

    case "credits":
      if (go) {
        s.phase = "title";
        s.used = 0;
        s.poured = 0;
        s.threshold = 24;
        clearPile();
      }
      return;
  }
}

/* ---------- draw ---------- */
function hud(left: string, right?: string): void {
  renderer.rect(0, 0, VIEW_W, 22, "rgba(5,6,13,0.78)");
  renderer.text(left, 8, 5, { size: 9, color: COLORS.gold, title: true });
  if (right) renderer.text(right, VIEW_W - 8, 6, { size: 8, color: COLORS.dim, align: "right" });
}

function drawCredits(): void {
  let y = 10;
  for (const line of CREDITS) {
    if (!line) {
      y += 5;
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
    renderer.text("SPACE to run it again", VIEW_W / 2, VIEW_H - 13, { size: 8, color: COLORS.gold, align: "center" });
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

  const comparing = s.phase === "second" || s.phase === "tail";
  if (comparing) {
    drawBars(renderer, EARLY_BINS, BOTH_PEAK, 0.5);
    drawOutline(renderer, EARLY_DAYS, BOTH_PEAK, COLORS.cold, true);
    if (s.phase === "tail") shadeTail(renderer, LATE_DAYS, BOTH_PEAK, s.threshold, "rgba(209,73,91,0.5)");
    drawOutline(renderer, LATE_DAYS, BOTH_PEAK, COLORS.hot, false);
    renderer.text(EARLY.label, PLOT.x + 2, PLOT.y - 11, { size: 7, color: COLORS.cold });
    renderer.text(LATE.label, PLOT.x + 58, PLOT.y - 11, { size: 7, color: COLORS.hot });
  } else {
    drawBars(renderer, s.landed, s.peak);
    drawFlights(renderer, s.flights);
  }

  switch (s.phase) {
    case "title":
      renderer.rect(0, 50, VIEW_W, 34, "rgba(5,6,13,0.84)");
      renderer.text(TITLE.name, VIEW_W / 2, 56, { size: 16, color: COLORS.gold, align: "center", title: true });
      renderer.text(TITLE.tagline, VIEW_W / 2, 74, { size: 8, color: COLORS.ink, align: "center" });
      break;

    case "one":
      hud("one day");
      drawBigDay(renderer, sampleDay(0), SAMPLE_SUMMER[0].l, xFor(s.heldAt), PLOT.y - 34);
      renderer.rect(Math.round(xFor(s.heldAt)), PLOT.y - 16, 1, PLOT.h + 16, COLORS.plateEdge);
      break;

    case "ten":
      hud("ten days", `${s.used} of ${BY_HAND}`);
      break;

    case "summer":
      hud("one summer", `${s.used} of ${SAMPLE_SUMMER.length} days`);
      break;

    case "thirty":
      hud(EARLY.label, `${s.poured} of ${EARLY_DAYS.length} days`);
      break;

    case "second":
      hud("two periods");
      break;

    case "tail": {
      hud("how often?", readout(s.threshold));
      drawThresholdHandle(renderer, s.threshold, s.grabbed || LEFT.concat(RIGHT).some((k) => held.has(k)));
      const note = smallCounts(s.threshold);
      if (note) renderer.text(note, VIEW_W / 2, 24, { size: 7, color: COLORS.dim, align: "center" });
      break;
    }
  }

  if (s.talk) renderer.caption(s.talk[s.talkLine], "SPACE", s.time);
  else {
    const prompts: Partial<Record<Phase, string[]>> = {
      title: TITLE.caption,
      one: PLACE_ONE,
      ten: TEN,
      summer: SUMMER,
      thirty: THIRTY,
      second: [`Two thirty-year periods, same axis. ${THRESHOLD} °C is where we will look.`],
      tail: TAIL[0],
    };
    const lines = prompts[s.phase];
    if (lines) renderer.caption(lines, s.phase === "one" || s.phase === "tail" ? false : "SPACE", s.time);
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
