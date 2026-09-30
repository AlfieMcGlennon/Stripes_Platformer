import "@fontsource/pixelify-sans/400.css";
import "@fontsource/silkscreen/400.css";
import { Input } from "./core";
import { toggleMute, unlock } from "./core/audio";
import { COLORS } from "./render/palette";
import { Renderer, VIEW_H, VIEW_W } from "./render/renderer";
import {
  CherryScene, CreditsScene, HeightScene, MonthsScene, SlideScene, StripesScene, TitleScene, type Scene,
} from "./scenes";

const SCENES: { id: string; make: () => Scene }[] = [
  { id: "title", make: () => new TitleScene() },
  { id: "height", make: () => new HeightScene() },
  { id: "months", make: () => new MonthsScene() },
  { id: "cherry", make: () => new CherryScene() },
  { id: "stripes", make: () => new StripesScene() },
  { id: "slide", make: () => new SlideScene() },
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
const input = new Input(canvas, (x, y) => renderer.clientToView(x, y));
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

let index = startIndex();
let scene = SCENES[index].make();
let fadeDir: -1 | 0 | 1 = -1; // -1 fading in, 1 fading out
renderer.fade = 1;
window.__scene = scene;
window.__sceneId = SCENES[index].id;

function advance(): void {
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
  renderer.text("↻", VIEW_W / 2, VIEW_H / 2 + 8, { size: 14, align: "center" });
}

function frame(now: number): void {
  requestAnimationFrame(frame); // schedule first, so one thrown error can't freeze the loop
  accumulator += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (accumulator >= STEP) {
    const frameInput = input.poll();
    if (frameInput.anyPressed) unlock();
    if (fadeDir === 0) scene.update(frameInput, STEP);
    if (fadeDir === -1) {
      renderer.fade = Math.max(0, renderer.fade - STEP / FADE_SECONDS);
      if (renderer.fade === 0) fadeDir = 0;
    } else if (fadeDir === 1) {
      renderer.fade = Math.min(1, renderer.fade + STEP / FADE_SECONDS);
      if (renderer.fade === 1) advance();
    } else if (scene.done) fadeDir = 1;
    accumulator -= STEP;
  }
  renderer.bottomReserve = input.touchSeen ? 40 : 0;
  if (input.touchSeen && renderer.portrait) drawRotateHint();
  else {
    scene.draw(renderer);
    if (input.touchSeen) renderer.touchButtons(!!scene.zoomAvailable);
  }
  renderer.present();
}

requestAnimationFrame(frame);
