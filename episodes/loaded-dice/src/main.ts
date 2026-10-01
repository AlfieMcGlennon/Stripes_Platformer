import "@fontsource/pixelify-sans/400.css";
import "@fontsource/silkscreen/400.css";
import {
  mountPanel, newWalk, reduceMotion, screenX, showBootFailure, stepWalk, type Marker, type Walk,
} from "@stripes/engine";
import { BEST_SHIFT, EARLY_DAYS, EARLY_STATS, HOTTEST, LATE_DAYS, SAMPLE_YEAR } from "./data";
import {
  BASE_Y, drawGround, drawPost, drawSky, drawSpread, drawWalker, groundFor, MAX_H, pushedGround,
  tempAtX, WORLD, xForTemp,
} from "./land";
import {
  CREDITS, EDGE, FAR_THRESHOLD, MARKS, pushedReadout, SAMPLE_PEAK, THRESHOLD, TITLE,
  walkReadout,
} from "./script";
import { SECTIONS, STANDFIRST } from "./story";
import { COLORS, createRenderer, VIEW_H, VIEW_W } from "./view";

const STEP = 1 / 60;
/** Where the push unlocks: on the mark whose caption explains it, and not before. */
const PUSH_AT = THRESHOLD + 1.5;

const canvas = document.getElementById("game") as HTMLCanvasElement;
const renderer = createRenderer(canvas);

const EARLY_GROUND = groundFor(EARLY_DAYS);
/** The measured later landscape, drawn as the target once pushing is possible. */
const LATE_GROUND = groundFor(LATE_DAYS);

const s = {
  walk: newWalk({ x: xForTemp(11), cy: BASE_Y - VIEW_H / 2 + 46, speed: 54, lookAhead: 40 }) as Walk,
  time: 0,
  /** How far the land has been pushed, in degrees. */
  push: 0,
  /** True once the player has reached the place where pushing is possible. */
  canPush: false,
  measured: false,
  atEnd: false,
};

/* ---------- input ---------- */
const held = new Set<string>();
let nextPressed = false;
let touchDir = 0;

const LEFT = ["ArrowLeft", "KeyA"];
const RIGHT = ["ArrowRight", "KeyD"];
// SPACE is never a push key: it always means "I have read that", so the caption
// prompt tells the truth even after pushing unlocks.
const PUSH = ["ArrowUp", "KeyW"];

addEventListener("keydown", (e) => {
  if ([...LEFT, ...RIGHT, ...PUSH, "Enter"].includes(e.code)) e.preventDefault();
  if (!held.has(e.code) && (e.code === "Enter" || e.code === "Space")) nextPressed = true;
  held.add(e.code);
});
addEventListener("keyup", (e) => held.delete(e.code));

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  const p = renderer.clientToView(e.clientX, e.clientY);
  if (p.y > VIEW_H - 62) nextPressed = true;
  else touchDir = p.x < VIEW_W / 2 ? -1 : 1;
});
canvas.addEventListener("pointermove", (e) => {
  if (touchDir === 0) return;
  touchDir = renderer.clientToView(e.clientX, e.clientY).x < VIEW_W / 2 ? -1 : 1;
});
addEventListener("pointerup", () => (touchDir = 0));

const pressing = (keys: string[]): boolean => keys.some((k) => held.has(k));

/* ---------- the ground, as places ---------- */
const ground = (): ReturnType<typeof groundFor> =>
  s.push > 0.01 ? pushedGround(s.push) : EARLY_GROUND;

const markers: Marker[] = MARKS.map((m) => ({
  x: xForTemp(m.at),
  lines: m.lines,
  onReach: m.at >= PUSH_AT ? () => (s.canPush = true) : undefined,
}));
markers.push({ x: xForTemp(EDGE), lines: [], onReach: () => (s.atEnd = true) });
markers.sort((a, b) => a.x - b.x);

/* ---------- update ---------- */
function update(dt: number): void {
  s.time += dt;
  const next = nextPressed;
  nextPressed = false;

  if (s.atEnd) {
    if (next) {
      s.atEnd = false;
      s.push = 0;
      s.canPush = false;
      s.measured = false;
      s.walk = newWalk({ x: xForTemp(11), cy: BASE_Y - VIEW_H / 2 + 46, speed: 54, lookAhead: 40 });
      for (const m of markers) m.fired = false;
    }
    return;
  }

  // Pushing is only possible once you have walked out to where it matters.
  if (s.canPush && pressing(PUSH)) {
    s.push = Math.min(2.5, s.push + 0.5 * dt);
    if (Math.abs(s.push - BEST_SHIFT.degrees) < 0.12) s.measured = true;
  }

  stepWalk(
    s.walk,
    { left: pressing(LEFT) || touchDir < 0, right: pressing(RIGHT) || touchDir > 0, next },
    dt,
    markers,
    WORLD,
  );
}

/* ---------- draw ---------- */
function hud(): void {
  const here = tempAtX(s.walk.x);
  renderer.rect(0, 0, VIEW_W, 24, "rgba(5,6,13,0.78)");
  renderer.text(`${here.toFixed(1)} °C`, 8, 4, { size: 11, color: COLORS.gold, title: true });
  renderer.text("where you are standing", 8, 16, { size: 7, color: COLORS.dim });
  const read = walkReadout(here);
  renderer.text(read.label, VIEW_W - 8, 3, { size: 7, color: COLORS.dim, align: "right" });
  renderer.text(read.value, VIEW_W - 8, 11, {
    size: 8, color: read.notable ? COLORS.gold : COLORS.ink, align: "right",
  });
  if (s.push > 0.01) {
    renderer.text(`pushed +${s.push.toFixed(2)} °C`, VIEW_W / 2, 3, {
      size: 8, color: s.measured ? COLORS.gold : COLORS.hot, align: "center",
    });
    renderer.text(
      s.measured ? "as far as it really moved" : pushedReadout(here, s.push),
      VIEW_W / 2, 13, { size: 7, color: s.measured ? COLORS.gold : COLORS.dim, align: "center" },
    );
  }
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
      title: line === "LOADED DICE",
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

  const g = ground();
  drawSky(renderer, s.walk, s.time);
  drawGround(
    renderer, s.walk, g,
    s.push > 0.01 ? EARLY_GROUND : undefined,
    s.canPush ? LATE_GROUND : undefined,
  );
  drawSpread(renderer, s.walk, EARLY_STATS.mean, EARLY_STATS.sd, "most summer days");
  // Labelled "avg", because the summit of the ground is a different place.
  // 30 not 36: the root scale stands the ground at the average 78px tall, so the old
  // post height put this label two pixels under the HUD band.
  drawPost(renderer, s.walk, g, EARLY_STATS.mean, `avg ${EARLY_STATS.mean.toFixed(1)} °C`, COLORS.gold, 30);
  drawPost(renderer, s.walk, g, THRESHOLD, `${THRESHOLD} °C`, COLORS.hot, 26);
  drawPost(renderer, s.walk, g, FAR_THRESHOLD, `${FAR_THRESHOLD} °C`, COLORS.hot, 20);
  drawPost(renderer, s.walk, g, SAMPLE_PEAK, `${SAMPLE_YEAR}`, COLORS.ink, 24);
  drawPost(renderer, s.walk, g, HOTTEST.value, `${HOTTEST.year}`, COLORS.ink, 16);
  drawWalker(renderer, s.walk, g);
  hud();

  // The title stands on the cold end, so nothing has to be dismissed to begin.
  const titleX = Math.round(screenX(s.walk, xForTemp(9), VIEW_W));
  if (titleX > -200 && titleX < VIEW_W + 40) {
    renderer.text(TITLE.name, titleX, BASE_Y - MAX_H - 34, { size: 16, color: COLORS.gold, title: true });
    renderer.text(TITLE.tagline, titleX, BASE_Y - MAX_H - 16, { size: 8, color: COLORS.ink });
  }

  if (s.canPush && s.push < 0.02) {
    renderer.text("hold ↑ to push the land", VIEW_W / 2, BASE_Y - MAX_H - 26, {
      size: 8, color: Math.floor(s.time * 2) % 2 ? COLORS.gold : COLORS.dim, align: "center",
    });
  }

  const idle = !pressing(RIGHT) && !pressing(LEFT) && touchDir === 0;
  if (idle && !s.walk.held && s.walk.captionAge > 1.6 && !s.canPush) {
    renderer.text("→", VIEW_W - 16, BASE_Y - 30, {
      size: 12, color: Math.floor(s.time * 2) % 2 ? COLORS.gold : COLORS.dim, align: "center",
    });
  }

  renderer.caption(s.walk.caption, s.walk.held ? "SPACE" : false, s.time);
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
  mountPanel({ title: "Loaded Dice", standfirst: STANDFIRST, sections: SECTIONS, renderer });
  void fontsReady()
    .then(() => requestAnimationFrame(frame))
    .catch(showBootFailure);
} catch (err) {
  showBootFailure(err);
}
