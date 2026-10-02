import "@fontsource/pixelify-sans/400.css";
import "@fontsource/jersey-10/400.css";
import { Input } from "./core";
import { isMuted, toggleMute, unlock } from "./core/audio";
import { mountPanel, reduceMotion, showBootFailure } from "@stripes/engine";
import { storySections, STANDFIRST } from "./story";
import { COLORS } from "./render/palette";
import { PORTRAIT_VIEW, Renderer, VIEW_H, VIEW_W, wantsPortrait } from "./render/renderer";
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
    /** Orientation check, exposed so a harness can drive it without waiting. */
    __followRotation?: () => void;
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
let syncPanel: () => void = () => undefined;
window.addEventListener("keydown", (e) => {
  if (e.code === "KeyM") {
    toggleMute();
    syncPanel();
  }
  if (e.code === "KeyT") {
    renderer.cycleTextScale();
    syncPanel();
  }
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
  const load = Promise.all([document.fonts.load('16px "Pixelify Sans"'), document.fonts.load('16px "Jersey 10"')]);
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

/*
 * Follow a rotation by reloading into the other profile, keeping the reader's place.
 *
 * The profile cannot be swapped in place: the renderer's view size is fixed at
 * construction, and scenes derive layout constants from it when their module first
 * loads (level 0's log and chart positions, for instance). Reloading is the honest
 * way to get every one of those recomputed. The level is carried across in the
 * query string, so a rotation costs the current level's progress and nothing more.
 *
 * Debounced, because a rotation fires several resize events and a desktop window
 * being dragged across the threshold should not reload on every frame.
 */
/*
 * Checked in the game loop rather than from a resize listener on a timer.
 *
 * The loop is the one thing guaranteed to be running, and polling it costs a
 * comparison of two numbers a few times a second. Two agreeing checks in a row are
 * required because a rotation passes through intermediate sizes, and we do not want
 * to reload on a shape the device is only briefly in.
 */
let frames = 0;
let wrongShapeFor = 0;
function followRotation(): void {
  if (wantsPortrait() === PORTRAIT_VIEW) {
    wrongShapeFor = 0;
    return;
  }
  if (++wrongShapeFor < 2) return;
  /*
   * Reload rather than swap in place: the renderer's view size is fixed at
   * construction and scenes derive layout constants from it when their module first
   * loads, so a reload is the honest way to recompute every one of them. The level
   * rides across in the query string, so a rotation costs the current level and
   * nothing more.
   */
  const url = new URL(location.href);
  url.searchParams.set("level", window.__sceneId ?? SCENES[index].id);
  location.replace(url.toString());
}
window.__followRotation = followRotation;

let accumulator = 0;
let last = performance.now();

/*
 * There is no "turn your phone sideways" screen any more. It existed because the
 * view was a fixed 320x180: on a portrait phone that is pinned by width to a scale
 * of 2, a 640x360 band using about a sixth of the screen with captions at roughly 8
 * CSS pixels. Rotating was the only way to read it.
 *
 * The view now has a portrait profile of its own -- narrower, so a bigger whole
 * scale fits, and much taller -- so portrait is a shape the game is laid out for
 * rather than one it tolerates. See `render/renderer.ts`.
 */

/**
 * Desktop reminder that Z does something right now (touch players get a button).
 *
 * Top centre, not top right. The chip is on screen for the whole of a zoom beat, and
 * the top right belongs to something in every scene that has one: the stripes colour
 * key, the title screen's mute line, and the year chart in level 0 -- which it
 * covered for the entire fast-forward, the episode's flagship moment. The band from
 * 134 to 186 is clear of the stripes HUD, which ends at 111, and of the key, which
 * starts at 192.
 */
function drawZoomChip(time: number, hint: string, low = false): void {
  const x = Math.round(VIEW_W / 2) - 26;
  // "low" is for scenes that put a centred title at the very top, where the chip
  // would land straight on it. Below the caption area, clear of the touch buttons,
  // which this chip never shares a screen with anyway.
  const y = low ? VIEW_H - 24 : 6;
  renderer.px.fillStyle = "#05060d";
  renderer.px.fillRect(x, y, 52, 14);
  renderer.px.fillStyle = Math.floor(time * 2) % 2 === 0 ? COLORS.accent : "#b8952f";
  renderer.px.fillRect(x + 3, y + 2, 12, 10);
  renderer.text("Z", x + 9, y + 2, { size: 10, color: "#05060d", align: "center", title: true });
  renderer.text(hint, x + 20, y + 3, { size: 8 });
}

function frame(now: number): void {
  requestAnimationFrame(frame); // schedule first, so one thrown error can't freeze the loop
  if (++frames % 15 === 0) followRotation(); // about four times a second
  accumulator += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (accumulator >= STEP) {
    const frameInput = input.poll();
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
  scene.draw(renderer);
  if (touchUi) renderer.touchButtons(!!scene.zoomAvailable);
  else if (scene.zoomAvailable) drawZoomChip(now / 1000, scene.zoomHint ?? "hold", scene.chipAnchor === "low");
  renderer.present();
}

try {
  syncPanel = mountPanel({
    title: "Noise and Trends",
    standfirst: STANDFIRST,
    sections: storySections(),
    renderer,
    audio: { isMuted, toggle: toggleMute, unlock },
  });
  void fontsReady()
    .then(() => requestAnimationFrame(frame))
    .catch(showBootFailure);
} catch (err) {
  showBootFailure(err);
}
