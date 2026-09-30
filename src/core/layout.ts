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

export const TOUCH_BUTTONS: TouchButton[] = [
  { id: "left", x: 4, y: 136, w: 34, h: 40, label: "◀" },
  { id: "right", x: 42, y: 136, w: 34, h: 40, label: "▶" },
  { id: "zoom", x: 244, y: 136, w: 34, h: 40, label: "Z" },
  { id: "jump", x: 282, y: 136, w: 34, h: 40, label: "▲" },
];

/** Slightly generous hit boxes: thumbs are imprecise. */
export function buttonAt(x: number, y: number, slop = 6): ButtonId | null {
  for (const b of TOUCH_BUTTONS) {
    if (x >= b.x - slop && x <= b.x + b.w + slop && y >= b.y - slop * 2 && y <= b.y + b.h + slop) return b.id;
  }
  return null;
}
