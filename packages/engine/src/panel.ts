import type { PixelRenderer } from "./renderer";
import { reduceMotion, setReduceMotion } from "./motion";

/**
 * The reading panel every episode carries.
 *
 * These are explainers before they are games, so the argument has to exist as text
 * as well as as an interaction: for anyone using a screen reader, anyone who would
 * rather read than play, anyone whose browser cannot run the canvas, and any
 * teacher who wants a transcript to print. It also carries the controls that cannot
 * live on a canvas — text size, reduced motion, sound — because real HTML controls
 * get keyboard and assistive-technology support for free.
 *
 * It builds its own DOM so each episode's `index.html` stays a canvas, a fallback
 * and a `<noscript>`. It also creates the `aria-live` region the renderer's caption
 * mirror looks for, so an episode cannot forget it.
 */
export interface StorySection {
  heading: string;
  paragraphs: string[];
}

export interface AudioControl {
  isMuted: () => boolean;
  toggle: () => void;
  unlock?: () => void;
}

export interface PanelOptions {
  /** The episode's name, shown at the top of the text version. */
  title: string;
  /** One line saying what the episode is for, before the sections. */
  standfirst: string;
  sections: StorySection[];
  renderer: PixelRenderer;
  /** Omit for an episode with no sound. */
  audio?: AudioControl;
}

const CSS = `
#stripes-panel {
  position: fixed; left: 0; bottom: 0; z-index: 2;
  max-width: min(46rem, 100%); max-height: 72vh; overflow: auto;
  font: 13px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif;
  color: #f2efe6; background: #05060d;
  border: 1px solid #3a4260; border-radius: 0 6px 0 0;
  touch-action: auto; -webkit-user-select: text; user-select: text;
}
#stripes-panel summary { padding: 7px 11px; color: #ffd166; cursor: pointer; }
#stripes-panel .body { padding: 0 11px 14px; }
#stripes-panel .controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 2px 0 12px; }
#stripes-panel button {
  font: inherit; color: #f2efe6; background: #1b2140; cursor: pointer;
  border: 1px solid #3a4260; border-radius: 4px; padding: 6px 9px;
}
#stripes-panel button:hover { background: #262d52; }
#stripes-panel summary:focus-visible, #stripes-panel button:focus-visible {
  outline: 2px solid #ffd166; outline-offset: 1px;
}
#stripes-panel h2 { margin: 0 0 2px; font-size: 15px; color: #ffd166; }
#stripes-panel .standfirst { margin: 0 0 10px; color: #b9bfd0; }
#stripes-panel h3 { margin: 14px 0 4px; font-size: 13px; color: #ffd166; }
#stripes-panel p { margin: 0 0 7px; max-width: 62ch; }
.stripes-sr {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
`;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, props: Partial<HTMLElementTagNameMap[K]> = {},
): HTMLElementTagNameMap[K] {
  return Object.assign(document.createElement(tag), props);
}

/** The renderer's caption mirror looks for `#live`; create it if the page has none. */
function ensureLiveRegion(): void {
  if (document.getElementById("live")) return;
  const live = el("div", { id: "live", className: "stripes-sr" });
  live.setAttribute("role", "status");
  live.setAttribute("aria-live", "polite");
  document.body.append(live);
}

/**
 * The reading drawer: the whole argument as text, plus the accessibility controls.
 *
 * Set this to false to hide it. It was off for a while and is back on because two
 * reviews and CLAUDE.md all say the same thing: a lot of readers want the argument
 * without the interaction, and anyone who cannot work the controls has no other way
 * in. Verified open and closed, in both view profiles.
 */
export const PANEL_ENABLED = true;

/** Returns a function that refreshes the control labels, for keyboard shortcuts. */
export function mountPanel(options: PanelOptions): () => void {
  if (typeof document === "undefined" || document.getElementById("stripes-panel")) return () => undefined;
  // The caption mirror is screen-reader support rather than a visible panel, so it
  // stays up even with the drawer off: turning off a reading panel should not take
  // spoken captions with it.
  ensureLiveRegion();
  if (!PANEL_ENABLED) return () => undefined;
  document.head.append(el("style", { textContent: CSS }));

  const panel = el("details", { id: "stripes-panel" });
  panel.append(el("summary", { textContent: "Read it instead, and accessibility" }));
  const body = el("div", { className: "body" });
  const controls = el("div", { className: "controls" });

  const size = el("button", { type: "button" });
  const motion = el("button", { type: "button" });
  const sound = options.audio ? el("button", { type: "button" }) : null;

  const sync = (): void => {
    // "Game text", not "Text size": it scales the captions and credits drawn on the
    // canvas, not this panel (which the browser's own zoom handles) and not the HUD
    // readouts, which sit in a layout that cannot reflow.
    size.textContent = `Game text: ${options.renderer.textScale}×`;
    motion.textContent = `Reduce motion: ${reduceMotion() ? "on" : "off"}`;
    motion.setAttribute("aria-pressed", String(reduceMotion()));
    if (sound && options.audio) {
      sound.textContent = `Sound: ${options.audio.isMuted() ? "off" : "on"}`;
      sound.setAttribute("aria-pressed", String(options.audio.isMuted()));
    }
  };

  size.addEventListener("click", () => {
    options.renderer.cycleTextScale();
    sync();
  });
  motion.addEventListener("click", () => {
    setReduceMotion(!reduceMotion());
    sync();
  });
  sound?.addEventListener("click", () => {
    options.audio?.unlock?.();
    options.audio?.toggle();
    sync();
  });

  controls.append(size, motion);
  if (sound) controls.append(sound);
  body.append(controls);

  body.append(el("h2", { textContent: options.title }));
  body.append(el("p", { className: "standfirst", textContent: options.standfirst }));
  for (const section of options.sections) {
    body.append(el("h3", { textContent: section.heading }));
    for (const text of section.paragraphs) body.append(el("p", { textContent: text }));
  }

  panel.append(body);
  document.body.append(panel);
  sync();
  return sync;
}

/**
 * Show a readable failure instead of a black rectangle. Any throw during boot used
 * to leave nothing on screen at all, with the text version sitting unopened
 * underneath it.
 */
export function showBootFailure(error: unknown): void {
  console.error("Episode failed to start", error);
  const note = el("p", {
    textContent:
      "This episode could not start in this browser. Open “Read it instead” at the bottom of the page for the whole thing in text.",
  });
  Object.assign(note.style, {
    position: "fixed",
    inset: "0",
    display: "grid",
    placeItems: "center",
    margin: "0",
    padding: "24px",
    background: "#0b1020",
    color: "#f2efe6",
    font: "15px/1.6 system-ui, sans-serif",
    textAlign: "center",
    zIndex: "3",
  });
  document.body.append(note);
  document.getElementById("stripes-panel")?.setAttribute("open", "");
}
