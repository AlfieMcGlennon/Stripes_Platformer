import "@fontsource/pixelify-sans/400.css";
import "@fontsource/silkscreen/400.css";
import {
  ART, drawBillboard, drawDepot, drawFence, drawHeroStanding, drawHeroWalking, drawMilepost,
  drawStreetlight, drawTelegraphPole, seatRider, type VehicleArt,
} from "./art";
import { drawBackdrop, drawRoad, FLIGHT_Y, LANES, prewarm, ROAD_Y, THEMES, type Theme } from "./backdrop";
import { CHAPTERS, CLEAN_TALK, CREDITS, REVEAL_TALK } from "./chapters";
import { cumulativeAt, emissionsAt, LAST_YEAR, TOTAL_EMITTED } from "./data";
import { visibleProps } from "./props";
import { COLORS, Renderer, VIEW_H, VIEW_W } from "./render";
import { drawReveal } from "./reveal";

const STEP = 1 / 60;
/** Where the vehicle you are travelling in sits on screen. */
const DRIVE_X = 96;
/** Where the next vehicle waits while you are stopped. */
const PARK_X = 300;
const DEPOT_X = 168;
const ROAD_SPEED = 96;

/**
 * A road trip in four legs. You drive one energy era, a stop comes into view, you
 * pull in, the talking points play while everything is still, then you walk across
 * to whatever is waiting and carry on. Nothing scrolls while there is text.
 */
type Phase = "title" | "drive" | "arriving" | "talk" | "swap" | "clean" | "reveal" | "credits";

interface Puff { x: number; y: number; life: number; size: number }

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
  speed: 0,
  /** Screen x of the vehicle in use; animates when pulling away from a stop. */
  vehicleX: DRIVE_X,
  flight: 0,
  vehicle: CHAPTERS[0].vehicle as VehicleArt["id"],
  /** The vehicle parked at the stop, waiting to be boarded. */
  nextVehicle: null as VehicleArt["id"] | null,
  /** Screen x of the depot while it is on screen, or null. */
  depotX: null as number | null,
  walkerX: null as number | null,
  aboard: true,
  puffs: [] as Puff[],
  frozen: 0,
};

/* ---------- input ---------- */
const held = new Set<string>();
let advance = false;

addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "Space", "Enter"].includes(e.code)) e.preventDefault();
  if (!held.has(e.code) && (e.code === "Space" || e.code === "Enter")) advance = true;
  held.add(e.code);
});
addEventListener("keyup", (e) => held.delete(e.code));
canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  advance = true;
});

const fast = (): boolean => held.has("ArrowRight") || held.has("KeyD");

/* ---------- helpers ---------- */
const chapter = () => CHAPTERS[Math.min(s.chapter, CHAPTERS.length - 1)];
const finished = () => s.phase === "clean" || s.phase === "reveal" || s.phase === "credits";
const stockGt = () => (finished() ? s.frozen : cumulativeAt(s.year));
const stock = () => stockGt() / TOTAL_EMITTED;
const emissions = () => (finished() ? 0 : emissionsAt(s.year));

/** Era themes, in chapter order, mixed from episode 1's own palette. */
const CHAPTER_THEMES: Theme[] = [THEMES.dawn, THEMES.smoke, THEMES.haze, THEMES.hot];
const theme = (): Theme =>
  s.phase === "clean" ? THEMES.clean : CHAPTER_THEMES[Math.min(s.chapter, CHAPTER_THEMES.length - 1)];

/** World x to year, so mileposts can carry the year of the ground they stand on. */
function yearAt(worldX: number): number {
  const c = chapter();
  const travelled = worldX - s.scroll;
  const perPx = (c.to - c.from) / (c.seconds * ROAD_SPEED);
  return Math.max(1850, Math.min(LAST_YEAR, s.year + travelled * perPx));
}

function vehicleGround(): number {
  const art = ART[s.vehicle];
  if (!art.airborne) return LANES[1];
  return ROAD_Y + 16 + (FLIGHT_Y - ROAD_Y - 16) * s.flight;
}

function startLeg(i: number): void {
  s.chapter = i;
  s.phase = "drive";
  s.phaseTime = 0;
  s.year = CHAPTERS[i].from;
  s.vehicle = CHAPTERS[i].vehicle;
  s.nextVehicle = null;
  s.depotX = null;
  s.walkerX = null;
  s.aboard = true;
  s.puffs = [];
  s.flight = 0;
}

/* ---------- update ---------- */
function update(dt: number): void {
  s.time += dt;
  s.phaseTime += dt;
  const go = advance;
  advance = false;

  const art = ART[s.vehicle];

  switch (s.phase) {
    case "title":
      if (go) startLeg(0);
      return;

    case "drive": {
      const c = chapter();
      const target = fast() ? 2.4 : 1;
      s.speed += (target - s.speed) * Math.min(1, dt * 2);
      s.scroll += dt * ROAD_SPEED * s.speed;
      s.vehicleX += (DRIVE_X - s.vehicleX) * Math.min(1, dt * 2.5);
      if (art.airborne) s.flight = Math.min(1, s.flight + dt * 0.42);
      s.year = Math.min(c.to, s.year + dt * ((c.to - c.from) / c.seconds) * s.speed);
      exhaust(dt);
      if (s.year >= c.to) {
        s.phase = "arriving";
        s.phaseTime = 0;
        s.depotX = VIEW_W + 60;
      }
      return;
    }

    case "arriving": {
      // The stop slides in while the vehicle coasts down to meet it.
      s.speed += (0 - s.speed) * Math.min(1, dt * 1.5);
      s.scroll += dt * ROAD_SPEED * s.speed;
      if (s.depotX !== null) s.depotX = Math.max(DEPOT_X, s.depotX - dt * ROAD_SPEED * Math.max(s.speed, 0.35));
      if (art.airborne) s.flight = Math.max(0, s.flight - dt * 0.5);
      exhaust(dt);
      const parked = s.depotX !== null && s.depotX <= DEPOT_X + 0.5 && s.speed < 0.06;
      if (parked || go) {
        s.speed = 0;
        s.depotX = DEPOT_X;
        s.flight = 0;
        s.phase = "talk";
        s.phaseTime = 0;
        s.talkLine = 0;
      }
      return;
    }

    case "talk":
      exhaust(dt);
      if (go) {
        s.talkLine++;
        if (s.talkLine >= chapter().talk.length) {
          const next = s.chapter + 1;
          if (next < CHAPTERS.length) {
            s.phase = "swap";
            s.phaseTime = 0;
            s.nextVehicle = CHAPTERS[next].vehicle;
            s.walkerX = s.vehicleX + art.door;
            s.aboard = false;
          } else {
            s.phase = "clean";
            s.phaseTime = 0;
            s.cleanStep = 0;
            s.frozen = cumulativeAt(LAST_YEAR);
            s.vehicle = "clean";
            s.nextVehicle = null;
            s.depotX = null;
            s.speed = 1;
            s.vehicleX = DRIVE_X;
            s.puffs = [];
          }
        }
      }
      return;

    case "swap": {
      // Walk across the forecourt to whatever is waiting, then pull away.
      const nextArt = s.nextVehicle ? ART[s.nextVehicle] : art;
      const target = PARK_X + nextArt.door;
      if (s.walkerX !== null) {
        s.walkerX = Math.min(target, s.walkerX + dt * 46);
        if (s.walkerX >= target && (s.phaseTime > 1.4 || go)) {
          s.walkerX = null;
          s.aboard = true;
          s.vehicle = s.nextVehicle ?? s.vehicle;
          s.nextVehicle = null;
          s.vehicleX = PARK_X;
          s.chapter += 1;
          s.year = chapter().from;
          s.phase = "drive";
          s.phaseTime = 0;
          s.depotX = DEPOT_X;
        }
      } else if (go) {
        s.walkerX = target;
      }
      return;
    }

    case "clean":
      s.scroll += dt * ROAD_SPEED * s.speed;
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
        } else s.phase = "credits";
      }
      return;

    case "credits":
      if (go) {
        s.phase = "title";
        s.scroll = 0;
        s.vehicle = CHAPTERS[0].vehicle;
        s.vehicleX = DRIVE_X;
      }
      return;
  }
}

function exhaust(dt: number): void {
  const art = ART[s.vehicle];
  const e = emissions() / 43.2;
  if (e > 0 && s.speed > 0.06 && Math.random() < dt * (6 + e * 26)) {
    s.puffs.push({
      x: s.vehicleX + art.stack.x,
      y: vehicleGround() - art.stack.y,
      life: 1,
      size: 2 + Math.random() * 3,
    });
  }
  for (const p of s.puffs) {
    p.x -= dt * ROAD_SPEED * s.speed * 0.7;
    p.y -= dt * 10;
    p.life -= dt * 0.5;
    p.size += dt * 5;
  }
  s.puffs = s.puffs.filter((p) => p.life > 0 && p.x > -20);
}

/* ---------- draw ---------- */
function drawProps(): void {
  const ctx = renderer.px;
  for (const prop of visibleProps(s.scroll, VIEW_W, s.year, yearAt)) {
    const x = prop.worldX - s.scroll;
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

function drawScene(): void {
  const ctx = renderer.px;
  drawBackdrop(ctx, theme(), s.year, s.scroll, stock(), s.time);
  drawProps();
  drawRoad(ctx, s.scroll);

  if (s.depotX !== null) {
    drawDepot(ctx, s.depotX, ROAD_Y + 2);
    const c = chapter();
    renderer.text(`${c.from}–${c.to}`, s.depotX + 39, ROAD_Y - 47, { size: 8, color: "#2a3358", align: "center" });
  }

  for (const p of s.puffs) {
    ctx.globalAlpha = Math.max(0, p.life) * 0.4;
    ctx.fillStyle = "#8f8c88";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // The vehicle waiting at the stop, drawn before the one you arrived in.
  if (s.nextVehicle) {
    const nextArt = ART[s.nextVehicle];
    nextArt.draw(ctx, PARK_X, nextArt.airborne ? ROAD_Y + 16 : LANES[1], 0, undefined);
  }

  const art = ART[s.vehicle];
  art.draw(ctx, s.vehicleX, vehicleGround(), s.scroll / 11, s.aboard ? seatRider : undefined);

  if (s.walkerX !== null) {
    const target = s.nextVehicle ? PARK_X + ART[s.nextVehicle].door : s.vehicleX + art.door;
    if (s.walkerX < target - 0.5) drawHeroWalking(ctx, s.walkerX, LANES[1], s.time * 6);
    else drawHeroStanding(ctx, s.walkerX, LANES[1]);
  }
}

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

function draw(): void {
  if (s.phase === "credits") {
    renderer.clear("#070a16");
    let y = 16;
    for (const line of CREDITS) {
      if (!line) {
        y += 6;
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
    if (Math.floor(s.time * 2) % 2 === 0) {
      renderer.text("SPACE to drive it again", VIEW_W / 2, VIEW_H - 18, { size: 8, color: COLORS.gold, align: "center" });
    }
    renderer.present();
    return;
  }

  if (s.phase === "reveal") {
    drawReveal(renderer, s.revealStep, s.revealGrow);
    renderer.caption(REVEAL_TALK[Math.min(REVEAL_TALK.length - 1, s.revealStep - 1)], "SPACE", s.time);
    renderer.present();
    return;
  }

  drawScene();
  drawHud();

  if (s.phase === "title") {
    renderer.rect(0, 70, VIEW_W, 54, "rgba(5,6,13,0.8)");
    renderer.text("CARBON ROAD", VIEW_W / 2, 78, { size: 24, color: COLORS.gold, align: "center", title: true });
    renderer.text("a road trip through four ways of moving", VIEW_W / 2, 104, { size: 9, align: "center" });
    renderer.caption(
      ["1850 to 2024, stopping four times.", "Hold → to cover ground faster. SPACE at any stop."],
      "SPACE to set off", s.time,
    );
  } else if (s.phase === "talk") {
    const c = chapter();
    renderer.caption([c.talk[s.talkLine]], s.talkLine + 1 < c.talk.length ? "SPACE" : "SPACE to carry on", s.time);
    renderer.text(`${s.talkLine + 1} / ${c.talk.length}`, VIEW_W - 12, 36, { size: 7, color: COLORS.dim, align: "right" });
  } else if (s.phase === "swap") {
    const next = s.nextVehicle ? ART[s.nextVehicle].name : "";
    renderer.caption([CHAPTERS[s.chapter + 1]?.boarding ?? `Take the ${next}.`], "SPACE", s.time);
  } else if (s.phase === "clean") {
    renderer.caption(CLEAN_TALK[s.cleanStep], "SPACE", s.time);
  } else if (s.phase === "arriving") {
    renderer.text("NEXT STOP", VIEW_W / 2, 36, { size: 8, color: COLORS.gold, align: "center" });
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
