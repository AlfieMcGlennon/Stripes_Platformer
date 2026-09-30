import "@fontsource/pixelify-sans/400.css";
import "@fontsource/silkscreen/400.css";
import { Input } from "./core";
import { toggleMute, unlock } from "./core/audio";
import { COLORS } from "./render/palette";
import { Renderer, VIEW_H, VIEW_W } from "./render/renderer";
import {
  CherryScene, CreditsScene, HeightScene, MonthsScene, SlideScene, StripesScene, TitleScene, YoursScene, type Scene,
} from "./scenes";

const SCENES: { id: string; make: () => Scene }[] = [
  { id: "title", make: () => new TitleScene() },
  { id: "height", make: () => new HeightScene() },
  { id: "months", make: () => new MonthsScene() },
  { id: "cherry", make: () => new CherryScene() },
  { id: "stripes", make: () => new StripesScene() },
  { id: "slide", make: () => new SlideScene() },
  { id: "yours", make: () => new YoursScene() },
  { id: "credits", make: () => new CreditsScene() },
];

const STEP = 1 / 60;
const FADE_SECONDS = 0.35;

declare global {
  interface Window {
    /** Current scene, exposed for playtesting scripts and the browser console. */
    __scene?: Scene;
    __sceneId?: string;
  }
}

const canvas = document.getElementById("game") as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const coarsePointer = matchMedia("(pointer: coarse)").matches;

/**
 * Runs inside real key/tap events. iOS only allows audio to start from inside
 * such a handler, and fullscreen needs one too, so neither can live in the game loop.
 */
function onGesture(): void {
  unlock();
  if (coarsePointer && window.__sceneId === "title" && !document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => undefined);
  }
}

const input = new Input(canvas, (x, y) => renderer.clientToView(x, y), onGesture);
window.addEventListener("keydown", (e) => {
  if (e.code === "KeyM") toggleMute();
});

// ?level=<id or number> jumps straight to a scene, which is handy while tuning.
function startIndex(): number {
  const param = new URLSearchParams(location.search).get("level");
  if (!param) return 0;
  const byId = SCENES.findIndex((s) => s.id === param);
  if (byId >= 0) return byId;
  const n = Number(param);
  return Number.isInteger(n) ? Math.max(0, Math.min(SCENES.length - 1, n + 1)) : 0;
}

/** Wait (briefly) for the pixel fonts so the first captions don't swap fonts mid-read. */
async function fontsReady(timeoutMs = 1500): Promise<void> {
  const load = Promise.all([document.fonts.load('16px "Pixelify Sans"'), document.fonts.load("16px Silkscreen")]);
  await Promise.race([load, new Promise((resolve) => setTimeout(resolve, timeoutMs))]).catch(() => undefined);
}

let index = startIndex();
let scene = SCENES[index].make();
let fadeDir: -1 | 0 | 1 = -1; // -1 fading in, 1 fading out
renderer.fade = 1;
window.__scene = scene;
window.__sceneId = SCENES[index].id;

function advance(): void {
  scene.onExit?.();
  index = (index + 1) % SCENES.length;
  scene = SCENES[index].make();
  window.__scene = scene;
  window.__sceneId = SCENES[index].id;
  fadeDir = -1;
}

let accumulator = 0;
let last = performance.now();

function drawRotateHint(): void {
  renderer.clear("#05060d");
  renderer.text("Turn your phone sideways", VIEW_W / 2, VIEW_H / 2 - 8, { size: 10, color: COLORS.accent, align: "center" });
  renderer.text("(the game is paused)", VIEW_W / 2, VIEW_H / 2 + 8, { size: 8, color: COLORS.dim, align: "center" });
}

/** Desktop reminder that Z does something right now (touch players get a button). */
function drawZoomChip(time: number, hint: string): void {
  const x = VIEW_W - 58, y = 6;
  renderer.px.fillStyle = "#05060d";
  renderer.px.fillRect(x, y, 52, 14);
  renderer.px.fillStyle = Math.floor(time * 2) % 2 === 0 ? COLORS.accent : "#b8952f";
  renderer.px.fillRect(x + 3, y + 2, 12, 10);
  renderer.text("Z", x + 9, y + 3, { size: 8, color: "#05060d", align: "center", title: true });
  renderer.text(hint, x + 20, y + 3, { size: 8 });
}

function frame(now: number): void {
  requestAnimationFrame(frame); // schedule first, so one thrown error can't freeze the loop
  accumulator += Math.min(0.25, (now - last) / 1000);
  last = now;
  const showRotateHint = coarsePointer && renderer.portrait;
  while (accumulator >= STEP) {
    const frameInput = input.poll();
    // Paused while the phone is upright, so nothing happens behind the hint.
    if (fadeDir === 0 && !showRotateHint) scene.update(frameInput, STEP);
    if (fadeDir === -1) {
      renderer.fade = Math.max(0, renderer.fade - STEP / FADE_SECONDS);
      if (renderer.fade === 0) fadeDir = 0;
    } else if (fadeDir === 1) {
      renderer.fade = Math.min(1, renderer.fade + STEP / FADE_SECONDS);
      if (renderer.fade === 1) advance();
    } else if (scene.done) fadeDir = 1;
    accumulator -= STEP;
  }
  const touchUi = input.touchSeen || coarsePointer;
  input.zoomActive = !!scene.zoomAvailable;
  renderer.bottomReserve = touchUi ? 40 : 0;
  if (showRotateHint) drawRotateHint();
  else {
    scene.draw(renderer);
    if (touchUi) renderer.touchButtons(!!scene.zoomAvailable);
    else if (scene.zoomAvailable) drawZoomChip(now / 1000, scene.zoomHint ?? "hold");
  }
  renderer.present();
}

void fontsReady().then(() => requestAnimationFrame(frame));
