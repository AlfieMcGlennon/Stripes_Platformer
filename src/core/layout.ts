/**
 * On-screen touch buttons, in view (320x180) coordinates. One table drives
 * both hit-testing and drawing so they can never disagree.
 */
export type ButtonId = "left" | "right" | "jump" | "zoom";

export interface TouchButton {
  id: ButtonId;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

/**
 * Gaps are wider than twice the hit slop, so the generous boxes below never
 * overlap. With a 4px gap and slop 6 they overlapped by 8px, and `buttonAt`
 * returns the first match -- so a thumb on the inner edge of the right arrow
 * moved the player left.
 */
export const TOUCH_BUTTONS: TouchButton[] = [
  { id: "left", x: 2, y: 136, w: 32, h: 40, label: "left" },
  { id: "right", x: 46, y: 136, w: 32, h: 40, label: "right" },
  { id: "zoom", x: 240, y: 136, w: 32, h: 40, label: "zoom" },
  { id: "jump", x: 284, y: 136, w: 32, h: 40, label: "jump" },
];

/**
 * Slightly generous hit boxes: thumbs are imprecise. Taps in the letterbox bars
 * (x < 0 or x > 320 on wide phones) are clamped onto the nearest edge button.
 */
export function buttonAt(x: number, y: number, slop = 6, zoomActive = true): ButtonId | null {
  x = Math.max(0, Math.min(320, x));
  y = Math.max(0, Math.min(180, y));
  for (const b of TOUCH_BUTTONS) {
    if (b.id === "zoom" && !zoomActive) continue;
    if (x >= b.x - slop && x <= b.x + b.w + slop && y >= b.y - slop * 2 && y <= b.y + b.h + slop) return b.id;
  }
  return null;
}
