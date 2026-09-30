/**
 * Motion preference. Read from the OS once, and overridable from the game's
 * accessibility panel, because managed school devices rarely have the OS flag
 * set even when a pupil needs it.
 *
 * Everything here is guarded for non-browser contexts so scenes stay importable
 * under vitest, which has no `matchMedia` or `localStorage`.
 */
const KEY = "stripes.reduceMotion";
const LEGACY_KEY = "heightcheck.reduceMotion";

const query = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;

let reduced = query?.matches ?? false;
query?.addEventListener?.("change", (e) => (reduced = e.matches));

try {
  const saved = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
  if (saved === "1" || saved === "0") reduced = saved === "1";
} catch {
  // Blocked or private-mode storage: fall back to the OS preference.
}

export function reduceMotion(): boolean {
  return reduced;
}

export function setReduceMotion(on: boolean): void {
  reduced = on;
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    // The setting just won't persist.
  }
}
