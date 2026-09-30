import { Input, type TouchZone } from "./core";
import { COLORS } from "./render/palette";
import { Renderer, VIEW_H, VIEW_W } from "./render/renderer";
import { CreditsScene, HeightScene, MonthsScene, SlideScene, StripesScene, type Scene } from "./scenes";

const SCENES: (() => Scene)[] = [
  () => new HeightScene(),
  () => new MonthsScene(),
  () => new StripesScene(),
  () => new SlideScene(),
  () => new CreditsScene(),
];

const STEP = 1 / 60;

declare global {
  interface Window {
    /** Current scene, exposed for playtesting scripts and the browser console. */
    __scene?: Scene;
    __sceneIndex?: number;
  }
}

const canvas = document.getElementById("game") as HTMLCanvasElement;
const renderer = new Renderer(canvas);

// Touch layout: bottom-left quarter = left/right, anywhere on the right half = jump.
function touchZone(clientX: number, clientY: number): TouchZone {
  const v = renderer.clientToView(clientX, clientY);
  if (v.x < VIEW_W / 4) return "left";
  if (v.x < VIEW_W / 2 && v.y > VIEW_H / 2) return "right";
  return "jump";
}
const input = new Input(canvas, touchZone);

// ?level=N jumps straight to a scene, which is handy while tuning.
let index = Math.min(SCENES.length - 1, Number(new URLSearchParams(location.search).get("level") ?? 0) || 0);
let scene = SCENES[index]();
let accumulator = 0;
let last = performance.now();

function drawTouchButtons(): void {
  if (!input.touchSeen) return;
  const px = renderer.px;
  px.fillStyle = "rgba(255,255,255,0.12)";
  px.fillRect(6, VIEW_H - 26, 24, 20);
  px.fillRect(44, VIEW_H - 26, 24, 20);
  px.fillRect(VIEW_W - 34, VIEW_H - 26, 28, 20);
  renderer.text("◀", 18, VIEW_H - 22, { align: "center", color: COLORS.dim });
  renderer.text("▶", 56, VIEW_H - 22, { align: "center", color: COLORS.dim });
  renderer.text("▲", VIEW_W - 20, VIEW_H - 22, { align: "center", color: COLORS.dim });
}

function frame(now: number): void {
  accumulator += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (accumulator >= STEP) {
    scene.update(input.poll(), STEP);
    accumulator -= STEP;
    if (scene.done) {
      index = (index + 1) % SCENES.length;
      scene = SCENES[index]();
    }
    window.__scene = scene;
    window.__sceneIndex = index;
  }
  scene.draw(renderer);
  drawTouchButtons();
  renderer.present();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
