import "@fontsource/pixelify-sans/400.css";
import "@fontsource/jersey-10/400.css";
import {
  fromPanel, mountPanel, newWalk, reduceMotion, screenX, showBootFailure, stepWalk, type Marker,
} from "@stripes/engine";
import {
  ART, drawBillboard, drawFence, drawHeroStanding, drawHeroWalking, drawMilepost, drawStreetlight,
  drawTelegraphPole, seatRider,
} from "./art";
import { drawBackdrop, drawRoad, LANES, prewarm, ROAD_Y, THEMES, type Theme } from "./backdrop";
import { CREDITS, GALLERY_TALK, MARKS, TITLE } from "./chapters";
import { cumulativeAt, emissionsAt, LAST_YEAR, signed, TOTAL_EMITTED, warmingAt } from "./data";
import { visibleProps } from "./props";
import { COLORS, createRenderer, VIEW_H, VIEW_W } from "./render";
import { drawPanel, PANEL_COUNT, PANEL_STEP } from "./reveal";
import {
  depotYears, drawDepotAt, drawYearPosts, eraAt, GALLERY_FROM, groundFor, isNetZero, ROAD_END,
  TRIP_FROM, vehicleAt, xForYear, yearAt, ZERO_FROM,
} from "./road";
import { SECTIONS, STANDFIRST } from "./story";

const STEP = 1 / 60;
const START_AT = TRIP_FROM - 70;
const CAMERA_Y = ROAD_Y - VIEW_H / 2 + 54;

const canvas = document.getElementById("game") as HTMLCanvasElement;
const renderer = createRenderer(canvas);

interface Puff {
  x: number;
  y: number;
  life: number;
  size: number;
}

const s = {
  walk: newWalk({ x: START_AT, cy: CAMERA_Y, speed: 78, lookAhead: 56 }),
  time: 0,
  puffs: [] as Puff[],
  puffTimer: 0,
  atEnd: false,
};

/* ---------- input ---------- */
const held = new Set<string>();
let nextPressed = false;
let touchDir = 0;

const LEFT = ["ArrowLeft", "KeyA"];
const RIGHT = ["ArrowRight", "KeyD"];

addEventListener("keydown", (e) => {
  // Keys typed into the reading drawer belong to the drawer, not the game.
  if (fromPanel(e)) return;
  if ([...LEFT, ...RIGHT, "Space", "Enter"].includes(e.code)) e.preventDefault();
  if (!held.has(e.code) && (e.code === "Space" || e.code === "Enter")) nextPressed = true;
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

/* ---------- the road, as places ---------- */
const markers: Marker[] = MARKS.map((m) => ({
  x: m.atYear !== undefined ? xForYear(m.atYear) : (m.atX ?? 0),
  lines: m.lines,
}));
GALLERY_TALK.forEach((lines, i) => markers.push({ x: GALLERY_FROM + 40 + i * PANEL_STEP, lines }));
markers.push({ x: ROAD_END - 20, lines: [], onReach: () => (s.atEnd = true) });
markers.sort((a, b) => a.x - b.x);

/* ---------- everything follows from where you are standing ---------- */
const year = (): number => yearAt(s.walk.x);
const netZero = (): boolean => isNetZero(s.walk.x);
const stockGt = (): number => cumulativeAt(netZero() ? LAST_YEAR : year());
const stock = (): number => stockGt() / TOTAL_EMITTED;
const emissions = (): number => (netZero() ? 0 : emissionsAt(year()));
const warming = (): number => warmingAt(netZero() ? LAST_YEAR : year());

const ERA_THEMES: Record<number, Theme> = {
  1850: THEMES.dawn,
  1880: THEMES.smoke,
  1910: THEMES.haze,
  1960: THEMES.hot,
};
const theme = (): Theme => (netZero() ? THEMES.clean : ERA_THEMES[eraAt(year()).from]);

/* ---------- update ---------- */
function update(dt: number): void {
  s.time += dt;
  const next = nextPressed;
  nextPressed = false;

  if (s.atEnd) {
    if (next) {
      s.atEnd = false;
      s.walk = newWalk({ x: START_AT, cy: CAMERA_Y, speed: 78, lookAhead: 56 });
      s.puffs = [];
      for (const m of markers) m.fired = false;
    }
    return;
  }

  stepWalk(
    s.walk,
    { left: pressing(LEFT) || touchDir < 0, right: pressing(RIGHT) || touchDir > 0, next },
    dt,
    markers,
    { min: START_AT - 10, max: ROAD_END },
  );

  // Exhaust at the rate that year was actually emitting, and only while moving.
  const art = ART[vehicleAt(s.walk.x)];
  const rate = emissions() / 43.2;
  s.puffTimer -= dt;
  if (rate > 0 && s.walk.moving && !reduceMotion() && s.puffTimer <= 0) {
    s.puffTimer = 0.1 / (0.2 + rate);
    s.puffs.push({
      x: s.walk.x - 26 + art.stack.x,
      y: groundFor(s.walk.x) - art.stack.y,
      life: 1,
      size: 2 + Math.random() * 3,
    });
  }
  for (const p of s.puffs) {
    p.y -= dt * 9;
    p.life -= dt * 0.45;
    p.size += dt * 4;
  }
  s.puffs = s.puffs.filter((p) => p.life > 0);
}

/* ---------- draw ---------- */
function drawProps(): void {
  const ctx = renderer.px;
  for (const prop of visibleProps(s.walk.cam.cx - VIEW_W / 2, VIEW_W, year(), yearAt)) {
    const x = Math.round(screenX(s.walk, prop.worldX, VIEW_W));
    if (x < -60 || x > VIEW_W + 60) continue;
    const gy = ROAD_Y - 2;
    if (prop.kind === "milepost") {
      drawMilepost(ctx, x, gy);
      renderer.text(prop.label, x + 4.5, gy - 24, { size: 7, color: "#2a3358", align: "center" });
    } else if (prop.kind === "billboard") {
      drawBillboard(ctx, x, gy);
      renderer.text("NEW", x + 22, gy - 42, { size: 7, color: COLORS.gold, align: "center" });
      renderer.text(prop.label, x + 22, gy - 33, { size: 7, color: COLORS.ink, align: "center" });
    } else if (prop.kind === "pole") drawTelegraphPole(ctx, x, gy);
    else if (prop.kind === "streetlight") drawStreetlight(ctx, x, gy);
    else drawFence(ctx, x, gy);
  }
}

/** Warming is drawn from -0.3 to 1.6 °C, with a tick where zero falls. */
const W_LO = -0.3;
const W_HI = 1.6;

/*
 * Two gauges, one above the other, both driven by where you are standing: the total
 * ever emitted, and the warming. The episode's claim is that the second tracks the
 * first, so the reader has to be able to watch them climb together. Previously
 * warming appeared in two captions and nowhere else, which left half the point as
 * text beside a mechanic that only ever demonstrated the other half.
 */
function hud(): void {
  renderer.rect(0, 0, VIEW_W, 40, "rgba(5,6,13,0.8)");
  renderer.text(netZero() ? "after" : String(Math.round(year())), 8, 3, {
    size: 13, color: COLORS.gold, title: true,
  });
  const e = emissions();
  renderer.text(e > 0 ? `${e.toFixed(1)} Gt/yr` : "0 Gt/yr", 8, 22, {
    size: 9, color: e > 0 ? COLORS.cold : "#6fd08c",
  });

  const gx = 132;
  const gw = VIEW_W - gx - 104;
  // Not "in the air": about half of what has been emitted has been taken up by
  // oceans and land. Warming tracks the cumulative total, which is why the total is
  // the thing on the gauge -- but the gauge must not claim to be a concentration.
  renderer.rect(gx, 5, gw, 8, COLORS.shadow);
  renderer.rect(gx + 1, 6, Math.round((gw - 2) * stock()), 6, COLORS.hot);
  renderer.text("CO₂ EMITTED, TOTAL EVER", gx, 15, { size: 7, color: COLORS.dim });
  renderer.text(`${Math.round(stockGt())} Gt`, VIEW_W - 8, 4, { size: 8, align: "right" });

  const w = warming();
  const t = Math.max(0, Math.min(1, (w - W_LO) / (W_HI - W_LO)));
  renderer.rect(gx, 24, gw, 8, COLORS.shadow);
  renderer.rect(gx + 1, 25, Math.round((gw - 2) * t), 6, COLORS.gold);
  renderer.rect(gx + 1 + Math.round((gw - 2) * (-W_LO / (W_HI - W_LO))), 24, 1, 8, COLORS.dim);
  renderer.text("WARMING SINCE 1850–1900", gx, 34, { size: 7, color: COLORS.dim });
  renderer.text(`${signed(w, 2)} °C`, VIEW_W - 8, 23, { size: 8, color: COLORS.gold, align: "right" });
}

function drawCredits(): void {
  renderer.clear("#070a16");
  let y = 10;
  for (const line of CREDITS) {
    if (!line) {
      y += 5;
      continue;
    }
    const heading = line === line.toUpperCase();
    renderer.text(line, VIEW_W / 2, y, {
      size: heading ? 9 : 8,
      color: heading ? COLORS.gold : COLORS.ink,
      align: "center",
      title: line === "CARBON ROAD",
    });
    y += heading ? 13 : 11;
  }
  if (reduceMotion() || Math.floor(s.time * 2) % 2 === 0) {
    renderer.text("SPACE to walk it again", VIEW_W / 2, VIEW_H - 14, {
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

  const ctx = renderer.px;
  drawBackdrop(ctx, theme(), year(), s.walk.cam.cx, stock(), s.time);
  drawProps();
  drawRoad(ctx, s.walk.cam.cx);
  drawYearPosts(renderer, s.walk);
  for (const d of depotYears()) drawDepotAt(renderer, s.walk, d);

  // The gallery: the four series hung along the roadside and walked past, rather
  // than a panel that arrives at the end. Each panel clips itself to the view.
  if (s.walk.x > GALLERY_FROM - 420) {
    const base = screenX(s.walk, GALLERY_FROM, VIEW_W);
    for (let id = 1; id <= PANEL_COUNT; id++) drawPanel(renderer, id, base + (id - 1) * PANEL_STEP);
  }

  for (const p of s.puffs) {
    ctx.globalAlpha = Math.max(0, p.life) * 0.4;
    ctx.fillStyle = "#8f8c88";
    ctx.beginPath();
    ctx.arc(screenX(s.walk, p.x, VIEW_W), p.y, p.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const walkerX = Math.round(screenX(s.walk, s.walk.x, VIEW_W));
  if (s.walk.x < TRIP_FROM - 24) {
    // Before the road begins you are on foot, which is where the walk is taught.
    if (s.walk.moving) drawHeroWalking(ctx, walkerX - 5, LANES[1], s.time * 6);
    else drawHeroStanding(ctx, walkerX - 5, LANES[1]);
  } else {
    ART[vehicleAt(s.walk.x)].draw(ctx, walkerX - 26, groundFor(s.walk.x), s.walk.x / 9, seatRider);
  }

  hud();

  const titleX = Math.round(screenX(s.walk, START_AT - 6, VIEW_W));
  if (titleX > -260 && titleX < VIEW_W + 40) {
    renderer.text(TITLE.name, titleX, ROAD_Y - 106, { size: 20, color: COLORS.gold, title: true });
    renderer.text(TITLE.tagline, titleX, ROAD_Y - 82, { size: 9, color: COLORS.ink });
  }

  if (netZero() && s.walk.x < ZERO_FROM + 140) {
    renderer.text("no exhaust from here on", VIEW_W / 2, ROAD_Y - 94, {
      size: 8, color: "#6fd08c", align: "center",
    });
  }

  const idle = !pressing(RIGHT) && !pressing(LEFT) && touchDir === 0;
  if (idle && !s.walk.held && s.walk.captionAge > 1.6) {
    renderer.text("»", VIEW_W - 16, ROAD_Y - 36, {
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
    document.fonts.load('16px "Jersey 10"'),
  ]);
  await Promise.race([load, new Promise((resolve) => setTimeout(resolve, timeoutMs))]).catch(() => undefined);
}

try {
  mountPanel({ title: "Carbon Road", standfirst: STANDFIRST, sections: SECTIONS, renderer });
  prewarm();
  void fontsReady()
    .then(() => requestAnimationFrame(frame))
    .catch(showBootFailure);
} catch (err) {
  showBootFailure(err);
}
