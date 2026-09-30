import "@fontsource/pixelify-sans/400.css";
import "@fontsource/silkscreen/400.css";
import { Input } from "./core";
import { isMuted, toggleMute, unlock } from "./core/audio";
import { reduceMotion, setReduceMotion } from "@stripes/engine";
import { storySections } from "./story";
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

/** One full-screen swing per scene boundary is exactly what reduced motion means. */
function fadeSeconds(): number {
  return reduceMotion() ? STEP : FADE_SECONDS;
}

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
  if (e.code === "KeyM") syncPanel(toggleMute());
  if (e.code === "KeyT") {
    renderer.cycleTextScale();
    syncPanel();
  }
});

/**
 * The accessibility panel is plain HTML, so it works with a keyboard, a screen
 * reader and a thumb without the canvas having to reimplement any of it. It also
 * carries the text size control: canvas text cannot respond to browser zoom,
 * because the view is fitted to the viewport, so page zoom leaves it unchanged.
 */
const byId = <T extends HTMLElement>(id: string): T | null => document.getElementById(id) as T | null;

function syncPanel(_muted = isMuted()): void {
  const size = byId<HTMLButtonElement>("text-size");
  if (size) size.textContent = `Text size: ${renderer.textScale}×`;
  const motion = byId<HTMLButtonElement>("reduce-motion");
  if (motion) {
    motion.textContent = `Reduce motion: ${reduceMotion() ? "on" : "off"}`;
    motion.setAttribute("aria-pressed", String(reduceMotion()));
  }
  const mute = byId<HTMLButtonElement>("mute");
  if (mute) {
    mute.textContent = `Sound: ${isMuted() ? "off" : "on"}`;
    mute.setAttribute("aria-pressed", String(isMuted()));
  }
}

function buildPanel(): void {
  byId<HTMLButtonElement>("text-size")?.addEventListener("click", () => {
    renderer.cycleTextScale();
    syncPanel();
  });
  byId<HTMLButtonElement>("reduce-motion")?.addEventListener("click", () => {
    setReduceMotion(!reduceMotion());
    syncPanel();
  });
  byId<HTMLButtonElement>("mute")?.addEventListener("click", () => {
    unlock();
    toggleMute();
    syncPanel();
  });
  const story = byId("story");
  if (story) {
    story.replaceChildren();
    for (const section of storySections()) {
      const h = document.createElement("h2");
      h.textContent = section.heading;
      story.append(h);
      for (const text of section.paragraphs) {
        const p = document.createElement("p");
        p.textContent = text;
        story.append(p);
      }
    }
  }
  syncPanel();
}

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

/**
 * Landscape is better but it is not essential -- the view is a fixed 320x180 that
 * already letterboxes -- so the hint must be escapable. A mounted tablet, a
 * pupil holding a device one-handed, or anyone with rotation locked would
 * otherwise be shut out entirely.
 */
let portraitDismissed = false;

function drawRotateHint(): void {
  renderer.clear("#05060d");
  renderer.text("Turn your phone sideways", VIEW_W / 2, VIEW_H / 2 - 14, { size: 10, color: COLORS.accent, align: "center" });
  renderer.text("(the game is paused)", VIEW_W / 2, VIEW_H / 2 + 2, { size: 8, color: COLORS.dim, align: "center" });
  renderer.text("or tap to play anyway", VIEW_W / 2, VIEW_H / 2 + 16, { size: 8, color: COLORS.text, align: "center" });
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
  const showRotateHint = coarsePointer && renderer.portrait && !portraitDismissed;
  while (accumulator >= STEP) {
    const frameInput = input.poll();
    if (showRotateHint) {
      if (frameInput.actionPressed || frameInput.anyPressed) portraitDismissed = true;
      accumulator -= STEP;
      continue;
    }
    if (fadeDir === 0) scene.update(frameInput, STEP);
    if (fadeDir === -1) {
      renderer.fade = Math.max(0, renderer.fade - STEP / fadeSeconds());
      if (renderer.fade === 0) fadeDir = 0;
    } else if (fadeDir === 1) {
      renderer.fade = Math.min(1, renderer.fade + STEP / fadeSeconds());
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

/**
 * Any failure here used to leave a silent black page: the loop was scheduled off
 * an unhandled promise, and a null 2D context threw during module evaluation. The
 * text version is already in the DOM, so the honest fallback is to say so and
 * point at it.
 */
function bootFailed(err: unknown): void {
  console.error("Height Check failed to start", err);
  const note = document.createElement("p");
  note.className = "fallback";
  note.textContent =
    "Height Check could not start in this browser. Open “Text version & accessibility” at the bottom of the page for the whole story in text.";
  document.body.append(note);
  byId("panel")?.setAttribute("open", "");
}

try {
  buildPanel();
  void fontsReady()
    .then(() => requestAnimationFrame(frame))
    .catch(bootFailed);
} catch (err) {
  bootFailed(err);
}
