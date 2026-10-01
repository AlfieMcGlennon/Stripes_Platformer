import "@fontsource/pixelify-sans/400.css";
import "@fontsource/silkscreen/400.css";
import {
  mountPanel, newWalk, reduceMotion, screenX, showBootFailure, stepWalk, type Marker,
} from "@stripes/engine";
import { bestSkill, bestWeights, CLIMATE, SAMPLE, SITES } from "./data";
import {
  BENCH, climateLines, CORRIDOR, CREDITS, HORIZON, OPENING, STATION_LINES, TITLE,
} from "./script";
import { SECTIONS, STANDFIRST } from "./story";
import { COLORS, createRenderer, GROUND_Y, VIEW_H, VIEW_W } from "./view";
import {
  drawBench, drawClimate, drawCorridor, drawGround, drawSky, drawStation, drawWalker, leadAt,
  PLACES, xForLead,
} from "./world";

const STEP = 1 / 60;

const canvas = document.getElementById("game") as HTMLCanvasElement;
const renderer = createRenderer(canvas);

const s = {
  walk: newWalk({ x: PLACES.start, cy: GROUND_Y - VIEW_H / 2 + 40 }),
  time: 0,
  /** How many stations have been reached; the HUD grows as they do. */
  collected: 0,
  /** Set once the bench is reached, so the equation exists only after it is earned. */
  fitted: false,
  climateShown: 0,
  day: 0,
  atEnd: false,
};

/* ---------- input ---------- */
const held = new Set<string>();
let nextPressed = false;
let touchDir = 0;

const LEFT = ["ArrowLeft", "KeyA"];
const RIGHT = ["ArrowRight", "KeyD"];

addEventListener("keydown", (e) => {
  if ([...LEFT, ...RIGHT, "Space", "Enter"].includes(e.code)) e.preventDefault();
  if (!held.has(e.code) && (e.code === "Space" || e.code === "Enter")) nextPressed = true;
  held.add(e.code);
});
addEventListener("keyup", (e) => held.delete(e.code));

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  const p = renderer.clientToView(e.clientX, e.clientY);
  // The bottom strip is "I have read that"; the sides walk.
  if (p.y > VIEW_H - 62) nextPressed = true;
  else touchDir = p.x < VIEW_W / 2 ? -1 : 1;
});
canvas.addEventListener("pointermove", (e) => {
  if (touchDir === 0) return;
  touchDir = renderer.clientToView(e.clientX, e.clientY).x < VIEW_W / 2 ? -1 : 1;
});
addEventListener("pointerup", () => (touchDir = 0));

const pressing = (keys: string[]): boolean => keys.some((k) => held.has(k));

/* ---------- the road ---------- */
const anomalies = (): number[] => SAMPLE[s.day % SAMPLE.length].x;

/**
 * Everything that happens is hung on a place. Arriving somewhere is what produces a
 * caption, so the reader sets the pace and can walk back to re-read the road.
 */
const markers: Marker[] = [
  { x: PLACES.start + 26, lines: OPENING[0] },
  { x: PLACES.start + 96, lines: OPENING[1] },
];

PLACES.stations.forEach((x, i) => {
  STATION_LINES[i].forEach((lines, beat) => {
    markers.push({
      x: x + beat * 36,
      lines,
      onReach: beat === 0 ? () => (s.collected = Math.max(s.collected, i + 1)) : undefined,
    });
  });
});

BENCH.forEach((lines, i) => {
  markers.push({
    x: PLACES.bench - 50 + i * 32,
    lines,
    onReach: i === 0 ? () => (s.fitted = true) : undefined,
  });
});

for (const stop of CORRIDOR) markers.push({ x: xForLead(stop.lead), lines: stop.lines });

climateLines().forEach((lines, i) => {
  markers.push({
    x: PLACES.climate - 180 + i * 46,
    lines,
    onReach: () => (s.climateShown = Math.max(s.climateShown, i)),
  });
});

markers.push({
  x: PLACES.end - 80,
  lines: ["That is the whole road. Keep going for where the numbers came from."],
});
markers.push({ x: PLACES.end - 2, lines: [], onReach: () => (s.atEnd = true) });
markers.sort((a, b) => a.x - b.x);

/* ---------- update ---------- */
function update(dt: number): void {
  s.time += dt;
  const next = nextPressed;
  nextPressed = false;

  if (s.atEnd) {
    if (next) {
      s.atEnd = false;
      s.walk = newWalk({ x: PLACES.start, cy: GROUND_Y - VIEW_H / 2 + 40 });
      s.collected = 0;
      s.fitted = false;
      s.climateShown = 0;
      for (const m of markers) m.fired = false;
    }
    return;
  }

  // A new morning every few seconds, so the readings are not one lucky day.
  if (!reduceMotion() && Math.floor(s.time / 4) !== Math.floor((s.time - dt) / 4)) s.day++;

  stepWalk(
    s.walk,
    { left: pressing(LEFT) || touchDir < 0, right: pressing(RIGHT) || touchDir > 0, next },
    dt,
    markers,
    { min: PLACES.start, max: PLACES.end },
  );
}

/* ---------- draw ---------- */
function hud(): void {
  if (s.collected === 0) return;
  renderer.rect(0, 0, VIEW_W, 22, "rgba(5,6,13,0.78)");
  SITES.slice(0, s.collected).forEach((site, i) => {
    const x = 8 + i * 82;
    const reading = anomalies()[i] / 10;
    renderer.text(site.name.split(",")[0], x, 3, { size: 7, color: COLORS.dim });
    renderer.text(`${reading >= 0 ? "+" : "−"}${Math.abs(reading).toFixed(1)}`, x, 11, {
      size: 8, color: reading >= 0 ? COLORS.hot : COLORS.cold,
    });
  });
  if (!s.fitted) return;
  const lead = Math.round(leadAt(s.walk.x));
  const skill = bestSkill(lead);
  renderer.text(`+${lead}d`, VIEW_W - 98, 4, { size: 10, color: COLORS.gold, title: true });
  renderer.text("best possible", VIEW_W - 8, 3, { size: 7, color: COLORS.dim, align: "right" });
  renderer.text(skill.toFixed(2), VIEW_W - 8, 10, {
    size: 9, color: skill > 0.3 ? COLORS.gold : skill > 0.05 ? COLORS.ink : COLORS.hot, align: "right",
  });
}

function drawCredits(): void {
  renderer.clear(COLORS.ground);
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
    renderer.text("SPACE to walk it again", VIEW_W / 2, VIEW_H - 12, {
      size: 8, color: COLORS.gold, align: "center",
    });
  }
}

function draw(): void {
  if (s.atEnd) {
    drawCredits();
    renderer.present();
    return;
  }

  drawSky(renderer, s.walk, s.time);
  drawGround(renderer, s.walk);
  drawCorridor(renderer, s.walk, HORIZON);
  PLACES.stations.forEach((_, i) => drawStation(renderer, s.walk, i, i < s.collected, anomalies()[i]));
  drawBench(renderer, s.walk, bestWeights(1), s.fitted);
  drawClimate(renderer, s.walk, CLIMATE, s.climateShown + 1);
  drawWalker(renderer, s.walk);
  hud();

  // The title stands in the world at the start, so there is no screen to get past.
  const titleX = Math.round(screenX(s.walk, PLACES.start - 6, VIEW_W));
  if (titleX > -200 && titleX < VIEW_W + 40) {
    renderer.text(TITLE.name, titleX, GROUND_Y - 98, { size: 16, color: COLORS.gold, title: true });
    renderer.text(TITLE.tagline, titleX, GROUND_Y - 78, { size: 8, color: COLORS.ink });
  }

  // A nudge onward, only while standing still with nothing left to read.
  const idle = !pressing(RIGHT) && !pressing(LEFT) && touchDir === 0;
  if (idle && !s.walk.pending.length && s.walk.captionAge > 1.5) {
    renderer.text("→", VIEW_W - 16, GROUND_Y - 28, {
      size: 12, color: Math.floor(s.time * 2) % 2 ? COLORS.gold : COLORS.dim, align: "center",
    });
  }

  renderer.caption(s.walk.caption, s.walk.pending.length ? "SPACE" : false, s.time);
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
