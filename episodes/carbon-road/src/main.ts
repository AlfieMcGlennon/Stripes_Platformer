import "@fontsource/pixelify-sans/400.css";
import "@fontsource/silkscreen/400.css";
import { ART, drawHeroStanding, drawHeroWalking, seatRider } from "./art";
import { drawBackdrop, drawRoad, FLIGHT_Y, LANES, prewarm, ROAD_Y, THEMES, type Theme } from "./backdrop";
import { CHAPTERS, CLEAN_TALK, REVEAL_TALK } from "./chapters";
import { cumulativeAt, emissionsAt, LAST_YEAR, TOTAL_EMITTED } from "./data";
import { COLORS, Renderer, VIEW_H, VIEW_W } from "./render";
import { drawReveal } from "./reveal";

const STEP = 1 / 60;
/** Where the vehicle sits while parked and while driving. */
const VEHICLE_X = 128;

/**
 * The run is a walkthrough, so it alternates strictly between moving and
 * talking: board, drive, pull up, talk, board the next era. Nothing scrolls
 * while there is text to read.
 */
type Phase = "title" | "board" | "drive" | "halt" | "talk" | "clean" | "reveal" | "end";

interface Puff { x: number; y: number; life: number; size: number }
interface Hazard { x: number; lane: number; kind: number; passed: boolean }

const canvas = document.getElementById("game") as HTMLCanvasElement;
const renderer = new Renderer(canvas);

const s = {
  phase: "title" as Phase,
  chapter: 0,
  talkLine: 0,
  cleanStep: 0,
  revealStep: 1,
  revealGrow: 0,
  time: 0,
  phaseTime: 0,
  year: CHAPTERS[0].from,
  scroll: 0,
  /** 0 while parked, 1 at full speed; eased so stops and starts are smooth. */
  speed: 0,
  lane: 1,
  laneY: LANES[1],
  /** Airliner altitude, lerped from the road to cruising height. */
  flight: 0,
  vehicle: CHAPTERS[0].vehicle,
  /** Character x while walking; null once aboard. */
  walkerX: null as number | null,
  puffs: [] as Puff[],
  hazards: [] as Hazard[],
  hazardsLeft: 0,
  hazardTimer: 0,
  puffTimer: 0,
  hits: 0,
  dodged: 0,
  jolt: 0,
  frozen: 0,
};

/* ---------- input ---------- */
const held = new Set<string>();
let advance = false;
let up = false;
let down = false;

addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Enter"].includes(e.code)) e.preventDefault();
  if (!held.has(e.code)) {
    if (e.code === "Space" || e.code === "Enter") advance = true;
    if (e.code === "ArrowUp" || e.code === "KeyW") up = true;
    if (e.code === "ArrowDown" || e.code === "KeyS") down = true;
  }
  held.add(e.code);
});
addEventListener("keyup", (e) => held.delete(e.code));
canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  const p = renderer.clientToView(e.clientX, e.clientY);
  if (p.y > VIEW_H - 70) advance = true;
  else if (p.y < VIEW_H / 2) up = true;
  else down = true;
});

const fast = (): boolean => held.has("ArrowRight") || held.has("KeyD");

/** Era themes, in chapter order, matching episode 1's Theme shape. */
const CHAPTER_THEMES: Theme[] = [THEMES.dawn, THEMES.smoke, THEMES.haze, THEMES.hot];

function theme(): Theme {
  if (s.phase === "clean") return THEMES.clean;
  return CHAPTER_THEMES[Math.min(s.chapter, CHAPTER_THEMES.length - 1)];
}

/* ---------- helpers ---------- */
const chapter = () => CHAPTERS[Math.min(s.chapter, CHAPTERS.length - 1)];
const stopped = () => s.phase === "clean" || s.phase === "reveal" || s.phase === "end";
const stockGt = () => (stopped() ? s.frozen : cumulativeAt(s.year));
const stock = () => stockGt() / TOTAL_EMITTED;
const emissions = () => (stopped() ? 0 : emissionsAt(s.year));

function beginBoard(i: number): void {
  s.chapter = i;
  s.phase = "board";
  s.phaseTime = 0;
  s.speed = 0;
  s.year = CHAPTERS[i].from;
  s.vehicle = CHAPTERS[i].vehicle;
  s.walkerX = 30;
  s.hazards = [];
  s.puffs = [];
  s.flight = 0;
}

function beginDrive(): void {
  s.phase = "drive";
  s.phaseTime = 0;
  s.walkerX = null;
  s.hazardsLeft = chapter().obstacles;
  s.hazardTimer = 1.6;
}

/* ---------- update ---------- */
function update(dt: number): void {
  s.time += dt;
  s.phaseTime += dt;
  s.jolt = Math.max(0, s.jolt - dt * 5);

  if (up) s.lane = 0;
  if (down) s.lane = 1;
  up = false;
  down = false;
  s.laneY += (LANES[s.lane] - s.laneY) * Math.min(1, dt * 10);

  const go = advance;
  advance = false;

  const art = ART[s.vehicle];

  switch (s.phase) {
    case "title":
      if (go) beginBoard(0);
      return;

    case "board": {
      // The character walks up to the door, then gets in.
      const door = VEHICLE_X + art.door;
      if (s.walkerX !== null) {
        s.walkerX = Math.min(door, s.walkerX + dt * 34);
        if (s.walkerX >= door && s.phaseTime > 1.2) s.walkerX = null;
      }
      if ((s.walkerX === null && s.phaseTime > 2) || go) beginDrive();
      return;
    }

    case "drive": {
      const c = chapter();
      const target = fast() ? 2.6 : 1;
      s.speed += (target - s.speed) * Math.min(1, dt * 2.2);
      s.scroll += dt * 74 * s.speed;
      if (art.airborne) s.flight = Math.min(1, s.flight + dt * 0.5);
      const rate = ((c.to - c.from) / c.seconds) * s.speed;
      s.year = Math.min(c.to, s.year + dt * rate);
      puffs(dt);
      hazards(dt);
      if (s.year >= c.to) {
        s.phase = "halt";
        s.phaseTime = 0;
      }
      return;
    }

    case "halt": {
      // Coast to a stop before anyone speaks.
      s.speed += (0 - s.speed) * Math.min(1, dt * 2.4);
      s.scroll += dt * 74 * s.speed;
      if (art.airborne) s.flight = Math.min(1, s.flight + dt * 0.3);
      puffs(dt);
      hazards(dt);
      if (s.speed < 0.04 || go) {
        s.speed = 0;
        s.phase = "talk";
        s.phaseTime = 0;
        s.talkLine = 0;
      }
      return;
    }

    case "talk":
      puffs(dt);
      if (go) {
        s.talkLine++;
        if (s.talkLine >= chapter().talk.length) {
          if (s.chapter + 1 < CHAPTERS.length) beginBoard(s.chapter + 1);
          else {
            s.phase = "clean";
            s.phaseTime = 0;
            s.cleanStep = 0;
            s.frozen = cumulativeAt(LAST_YEAR);
            s.vehicle = "clean";
            s.flight = 0;
            s.speed = 1;
            s.puffs = [];
            s.hazardTimer = 1.4;
          }
        }
      }
      return;

    case "clean":
      s.scroll += dt * 74 * s.speed;
      hazards(dt);
      s.hazardTimer -= dt;
      if (s.hazardTimer <= 0) {
        s.hazardTimer = 2.2;
        s.hazards.push({ x: VIEW_W + 16, lane: Math.random() < 0.5 ? 0 : 1, kind: Math.floor(Math.random() * 3), passed: false });
      }
      if (go) {
        s.cleanStep++;
        if (s.cleanStep >= CLEAN_TALK.length) {
          s.phase = "reveal";
          s.revealStep = 1;
          s.revealGrow = 0;
        }
      }
      return;

    case "reveal":
      s.revealGrow = Math.min(1, s.revealGrow + dt * 1.9);
      if (go) {
        if (s.revealGrow < 1) s.revealGrow = 1;
        else if (s.revealStep < 4) {
          s.revealStep++;
          s.revealGrow = 0;
        } else s.phase = "end";
      }
      return;

    case "end":
      if (go) {
        s.phase = "title";
        s.hits = 0;
        s.dodged = 0;
        s.scroll = 0;
        s.vehicle = CHAPTERS[0].vehicle;
      }
      return;
  }
}

function vehicleGround(): number {
  const art = ART[s.vehicle];
  if (!art.airborne) return s.laneY;
  // Climbs from the road to cruising height.
  return ROAD_Y + 10 + (FLIGHT_Y - ROAD_Y - 10) * s.flight;
}

function puffs(dt: number): void {
  const art = ART[s.vehicle];
  const e = emissions() / 43.2;
  s.puffTimer -= dt;
  if (e > 0 && s.puffTimer <= 0 && s.speed > 0.05) {
    s.puffTimer = 0.1 / (0.2 + e);
    s.puffs.push({
      x: VEHICLE_X + art.stack.x,
      y: vehicleGround() - art.stack.y,
      life: 1,
      size: 2 + Math.random() * 3,
    });
  }
  for (const p of s.puffs) {
    p.x -= dt * 74 * s.speed * 0.6;
    p.y -= dt * 9;
    p.life -= dt * 0.55;
    p.size += dt * 4;
  }
  s.puffs = s.puffs.filter((p) => p.life > 0 && p.x > -14);
}

function hazards(dt: number): void {
  if (s.phase === "drive" && s.hazardsLeft > 0) {
    s.hazardTimer -= dt;
    if (s.hazardTimer <= 0) {
      s.hazardTimer = chapter().seconds / (chapter().obstacles + 1);
      s.hazardsLeft--;
      s.hazards.push({ x: VIEW_W + 16, lane: Math.random() < 0.5 ? 0 : 1, kind: Math.floor(Math.random() * 3), passed: false });
    }
  }
  const vx = dt * 132 * Math.max(0.35, s.speed);
  for (const h of s.hazards) {
    const before = h.x;
    h.x -= vx;
    const gate = VEHICLE_X + 30;
    if (!h.passed && h.x < gate && before >= gate) {
      h.passed = true;
      if (h.lane === s.lane && !ART[s.vehicle].airborne) {
        s.hits++;
        s.jolt = 1;
      } else s.dodged++;
    }
  }
  s.hazards = s.hazards.filter((h) => h.x > -20);
}

/* ---------- draw ---------- */
function drawHud(): void {
  renderer.rect(0, 0, VIEW_W, 30, "rgba(5,6,13,0.8)");
  renderer.text(String(Math.round(s.year)), 8, 4, { size: 13, color: COLORS.gold, title: true });

  const gx = 84;
  const gw = VIEW_W - gx - 96;
  renderer.rect(gx, 6, gw, 9, COLORS.shadow);
  renderer.rect(gx + 1, 7, Math.round((gw - 2) * stock()), 7, COLORS.hot);
  renderer.text("CO₂ IN THE AIR: TOTAL EVER EMITTED", gx, 18, { size: 7, color: COLORS.dim });
  renderer.text(`${Math.round(stockGt())} Gt`, VIEW_W - 8, 18, { size: 8, align: "right" });
  const e = emissions();
  renderer.text(e > 0 ? `${e.toFixed(1)} Gt/yr` : "0 Gt/yr", VIEW_W - 8, 5,
    { size: 9, color: e > 0 ? COLORS.cold : "#6fd08c", align: "right" });
}

function drawHazard(h: Hazard): void {
  const ctx = renderer.px;
  const y = LANES[h.lane];
  const dim = h.passed && h.lane === s.lane;
  const c = dim ? "#6b4450" : COLORS.hot;
  if (h.kind === 0) {
    // heat: a shimmering patch on the road
    ctx.fillStyle = c;
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = 0.5 - i * 0.1;
      ctx.fillRect(h.x - i * 2, y - 6 - i * 4 + Math.sin(s.time * 6 + i) * 1.5, 18, 3);
    }
    ctx.globalAlpha = 1;
  } else if (h.kind === 1) {
    ctx.fillStyle = "#3f7fa8";
    ctx.beginPath();
    ctx.ellipse(h.x + 9, y - 2, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#67aed6";
    ctx.beginPath();
    ctx.ellipse(h.x + 9, y - 4, 7, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#6a7290";
    ctx.beginPath();
    ctx.ellipse(h.x + 9, y - 22, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c;
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(h.x + 4 + i * 6, y - 18);
      ctx.lineTo(h.x + 2 + i * 6, y - 4);
      ctx.stroke();
    }
  }
}

function drawScene(): void {
  const ctx = renderer.px;
  drawBackdrop(ctx, theme(), s.year, s.scroll, stock(), s.time);
  drawRoad(ctx, s.scroll);

  for (const h of s.hazards) drawHazard(h);

  for (const p of s.puffs) {
    ctx.globalAlpha = Math.max(0, p.life) * 0.42;
    ctx.fillStyle = "#8f8c88";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const art = ART[s.vehicle];
  const jolt = s.jolt > 0 ? Math.round(Math.sin(s.time * 50) * 2 * s.jolt) : 0;
  // Once aboard, the vehicle draws the rider itself, at the layer where they
  // belong: behind the cart's bench board, behind the cab window, behind glass.
  art.draw(ctx, VEHICLE_X, vehicleGround() + jolt, s.scroll / 9, s.walkerX === null ? seatRider : undefined);

  if (s.walkerX !== null) {
    const door = VEHICLE_X + art.door;
    if (s.walkerX < door - 0.5) drawHeroWalking(ctx, s.walkerX, LANES[1], s.time * 6);
    else drawHeroStanding(ctx, s.walkerX, LANES[1]);
  }
}

function draw(): void {
  if (s.phase === "reveal" || s.phase === "end") {
    drawReveal(renderer, s.revealStep, s.revealGrow);
    renderer.caption(
      REVEAL_TALK[Math.min(REVEAL_TALK.length - 1, s.revealStep - 1)],
      s.phase === "end" ? "SPACE to start again" : "SPACE",
      s.time,
    );
    if (s.phase === "end") {
      renderer.text(
        `dodged ${s.dodged} · hit ${s.hits} · neither moved the bar`,
        VIEW_W / 2, 14, { size: 8, color: COLORS.dim, align: "center" },
      );
    }
    renderer.present();
    return;
  }

  drawScene();
  drawHud();

  if (s.phase === "title") {
    renderer.rect(0, 74, VIEW_W, 52, "rgba(5,6,13,0.8)");
    renderer.text("CARBON ROAD", VIEW_W / 2, 82, { size: 24, color: COLORS.gold, align: "center", title: true });
    renderer.text("everything you burn stays up there", VIEW_W / 2, 108, { size: 9, align: "center" });
    renderer.caption(
      ["1850 to 2024 in four energy eras.", "↑ ↓ change lane · hold → to speed time up · SPACE to talk."],
      "SPACE to begin", s.time,
    );
  } else if (s.phase === "board") {
    const c = chapter();
    renderer.rect(0, 62, VIEW_W, 40, "rgba(5,6,13,0.78)");
    renderer.text(c.title, VIEW_W / 2, 68, { size: 18, color: COLORS.gold, align: "center", title: true });
    renderer.text(c.subtitle, VIEW_W / 2, 88, { size: 8, color: COLORS.ink, align: "center" });
    renderer.caption([c.boarding], "SPACE", s.time);
  } else if (s.phase === "talk") {
    const c = chapter();
    renderer.caption(
      [c.talk[s.talkLine]],
      s.talkLine + 1 < c.talk.length ? "SPACE" : "SPACE to carry on",
      s.time,
    );
    renderer.text(`${s.talkLine + 1} / ${c.talk.length}`, VIEW_W - 12, 36, { size: 7, color: COLORS.dim, align: "right" });
  } else if (s.phase === "clean") {
    renderer.caption(CLEAN_TALK[s.cleanStep], "SPACE", s.time);
  } else if (s.phase === "drive" || s.phase === "halt") {
    renderer.text(`${chapter().from}–${chapter().to}`, VIEW_W / 2, 36, { size: 8, color: COLORS.dim, align: "center" });
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

prewarm();
void fontsReady().then(() => requestAnimationFrame(frame));
