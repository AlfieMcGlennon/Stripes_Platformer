import "@fontsource/pixelify-sans/400.css";
import "@fontsource/silkscreen/400.css";
import { reduceMotion } from "@stripes/engine";
import {
  drawAxis, drawComparison, drawFalling, drawLanded, drawShade, type Falling,
} from "./curve";
import {
  BIN_HI, BIN_LO, EARLY, EARLY_DAYS, LATE, LATE_DAYS, histogram,
} from "./data";
import {
  afterEarly, afterLate, CREDITS, FAR_THRESHOLD, REVEAL_LINES, roundIntro, THRESHOLD, TITLE_LINES,
} from "./script";
import { celsiusAt, COLORS, createRenderer, FLOOR, PLOT, VIEW_H, VIEW_W } from "./view";

const STEP = 1 / 60;
/** How wide the shade is, in degrees: a fixed capacity to deal with heat. */
const SHADE_WIDTH = 5;
/** Every seventh day, so thirty summers stream past in about forty seconds. */
const SAMPLE = 7;
const FALL_SPEED = 92;

type Phase = "title" | "playing" | "talk" | "reveal" | "credits";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const renderer = createRenderer(canvas);

/** The two rounds, in order. */
const ROUNDS = [
  { days: EARLY_DAYS, label: EARLY.label },
  { days: LATE_DAYS, label: LATE.label },
];

const s = {
  phase: "title" as Phase,
  round: 0,
  time: 0,
  /** Index into the sampled stream of the current round. */
  next: 0,
  spawnTimer: 0,
  falling: [] as Falling[],
  landed: new Array(BIN_HI - BIN_LO).fill(0) as number[],
  peak: 6,
  /** Hot days that reached the ground unshaded, per round. */
  through: [0, 0],
  shade: 24,
  flash: 0,
  talkLine: 0,
  talkBlock: [] as string[][],
  revealStep: 0,
  revealGrow: 0,
};

/* ---------- input ---------- */
const held = new Set<string>();
let advance = false;
let pointerX: number | null = null;

addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "Space", "Enter"].includes(e.code)) e.preventDefault();
  if (!held.has(e.code) && (e.code === "Space" || e.code === "Enter")) advance = true;
  held.add(e.code);
});
addEventListener("keyup", (e) => held.delete(e.code));

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  const p = renderer.clientToView(e.clientX, e.clientY);
  // Tapping low steers the shade; tapping anywhere else advances.
  if (p.y > PLOT.y && s.phase === "playing") pointerX = p.x;
  else advance = true;
});
canvas.addEventListener("pointermove", (e) => {
  if (pointerX === null) return;
  pointerX = renderer.clientToView(e.clientX, e.clientY).x;
});
addEventListener("pointerup", () => (pointerX = null));

/* ---------- rounds ---------- */
function sampled(days: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < days.length; i += SAMPLE) out.push(days[i] / 10);
  return out;
}
const STREAMS = ROUNDS.map((r) => sampled(r.days));

function startRound(i: number): void {
  s.round = i;
  s.phase = "playing";
  s.next = 0;
  s.spawnTimer = 0;
  s.falling = [];
  s.landed = new Array(BIN_HI - BIN_LO).fill(0);
  s.peak = 6;
  s.time = 0;
}

function beginTalk(block: string[][]): void {
  s.phase = "talk";
  s.talkBlock = block;
  s.talkLine = 0;
}

/* ---------- update ---------- */
function update(dt: number): void {
  s.time += dt;
  s.flash = Math.max(0, s.flash - dt * 4);
  const go = advance;
  advance = false;

  if (s.phase !== "playing") {
    if (!go) {
      if (s.phase === "reveal") s.revealGrow = Math.min(1, s.revealGrow + dt * 1.2);
      return;
    }
    if (s.phase === "title") startRound(0);
    else if (s.phase === "talk") {
      s.talkLine++;
      if (s.talkLine >= s.talkBlock.length) {
        if (s.round === 0) startRound(1);
        else {
          s.phase = "reveal";
          s.revealStep = 0;
          s.revealGrow = 0;
        }
      }
    } else if (s.phase === "reveal") {
      if (s.revealGrow < 1) s.revealGrow = 1;
      else if (s.revealStep < REVEAL_LINES.length - 1) {
        s.revealStep++;
      } else s.phase = "credits";
    } else if (s.phase === "credits") {
      s.phase = "title";
      s.through = [0, 0];
    }
    return;
  }

  // steer the shade
  const speed = 26;
  if (held.has("ArrowLeft") || held.has("KeyA")) s.shade -= dt * speed;
  if (held.has("ArrowRight") || held.has("KeyD")) s.shade += dt * speed;
  if (pointerX !== null) s.shade = celsiusAt(pointerX);
  s.shade = Math.max(BIN_LO + SHADE_WIDTH / 2, Math.min(BIN_HI - SHADE_WIDTH / 2, s.shade));

  const stream = STREAMS[s.round];
  s.spawnTimer -= dt;
  if (s.spawnTimer <= 0 && s.next < stream.length) {
    s.spawnTimer = 0.1;
    s.falling.push({ celsius: stream[s.next], y: PLOT.y, done: false, shaded: false });
    s.next++;
  }

  for (const d of s.falling) {
    if (d.done) continue;
    d.y += dt * FALL_SPEED;
    if (d.y < FLOOR - 8) continue;
    d.done = true;
    const hot = d.celsius >= THRESHOLD;
    const covered = Math.abs(d.celsius - s.shade) <= SHADE_WIDTH / 2;
    if (hot && covered) {
      d.shaded = true;
      s.flash = 1;
    } else if (hot) {
      s.through[s.round]++;
    }
    const bin = Math.floor(d.celsius) - BIN_LO;
    if (bin >= 0 && bin < s.landed.length) {
      s.landed[bin]++;
      s.peak = Math.max(s.peak, s.landed[bin]);
    }
  }
  s.falling = s.falling.filter((d) => !d.done || d.y < FLOOR + 4);

  if (s.next >= stream.length && s.falling.length === 0) {
    beginTalk(s.round === 0 ? afterEarly(s.through[0]) : afterLate(s.through[0], s.through[1]));
  }
}

/* ---------- draw ---------- */
function drawHud(): void {
  const r = ROUNDS[s.round];
  renderer.rect(0, 0, VIEW_W, 26, "rgba(5,6,13,0.8)");
  renderer.text(r.label, 8, 4, { size: 10, color: COLORS.gold, title: true });
  const done = Math.min(1, s.next / STREAMS[s.round].length);
  renderer.rect(96, 8, 128, 5, COLORS.shadow);
  renderer.rect(97, 9, Math.round(126 * done), 3, COLORS.cold);
  renderer.text("thirty summers", 96, 15, { size: 7, color: COLORS.dim });
  renderer.text(`${s.through[s.round]} hot days through`, VIEW_W - 8, 6,
    { size: 8, color: s.through[s.round] ? COLORS.hot : COLORS.dim, align: "right" });
}

function draw(): void {
  renderer.clear(COLORS.ground);

  if (s.phase === "credits") {
    let y = 12;
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
      renderer.text("SPACE to play again", VIEW_W / 2, VIEW_H - 14, { size: 8, color: COLORS.gold, align: "center" });
    }
    renderer.present();
    return;
  }

  if (s.phase === "reveal") {
    drawAxis(renderer, THRESHOLD, `${THRESHOLD} °C`);
    drawComparison(renderer, EARLY_DAYS, LATE_DAYS, THRESHOLD, reduceMotion() ? 1 : s.revealGrow);
    renderer.caption(REVEAL_LINES[s.revealStep], "SPACE", s.time);
    renderer.present();
    return;
  }

  drawAxis(renderer, THRESHOLD, `${THRESHOLD} °C and above`);
  drawLanded(renderer, s.landed, s.peak);
  drawFalling(renderer, s.falling, THRESHOLD);
  if (s.phase === "playing") drawShade(renderer, s.shade, SHADE_WIDTH, s.flash);
  drawHud();

  if (s.phase === "title") {
    renderer.rect(0, 58, VIEW_W, 34, "rgba(5,6,13,0.82)");
    renderer.text("LOADED DICE", VIEW_W / 2, 64, { size: 16, color: COLORS.gold, align: "center", title: true });
    renderer.text("a small shift in the average, a much fatter tail", VIEW_W / 2, 82,
      { size: 8, color: COLORS.ink, align: "center" });
    renderer.caption(TITLE_LINES, "SPACE to begin", s.time);
  } else if (s.phase === "playing" && s.next < 6) {
    renderer.caption(roundIntro(ROUNDS[s.round].label), false, s.time);
  } else if (s.phase === "talk") {
    renderer.caption(s.talkBlock[s.talkLine], "SPACE", s.time);
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

// Referenced so the far threshold stays honest if the script stops quoting it.
void FAR_THRESHOLD;
void histogram;

void fontsReady().then(() => requestAnimationFrame(frame));
