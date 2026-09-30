/**
 * Keyboard + touch. Game code only sees `move`, `jumpPressed` and
 * `actionPressed` (edge-triggered), never raw events.
 */
export interface InputFrame {
  move: -1 | 0 | 1;
  jumpPressed: boolean;
  /** "Continue" on caption screens: jump, Enter or a tap. */
  actionPressed: boolean;
}

const LEFT = new Set(["ArrowLeft", "KeyA"]);
const RIGHT = new Set(["ArrowRight", "KeyD"]);
const JUMP = new Set(["Space", "ArrowUp", "KeyW", "KeyZ"]);
const ACTION = new Set(["Enter"]);

export type TouchZone = "left" | "right" | "jump";

export class Input {
  private held = new Set<string>();
  private pressedThisFrame = new Set<string>();
  private touches = new Map<number, TouchZone>();
  private touchJumpQueued = false;
  touchSeen = false;

  constructor(target: HTMLElement, private zoneAt: (clientX: number, clientY: number) => TouchZone) {
    window.addEventListener("keydown", (e) => {
      if ([...LEFT, ...RIGHT, ...JUMP, ...ACTION].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressedThisFrame.add(e.code);
      this.held.add(e.code);
    });
    window.addEventListener("keyup", (e) => this.held.delete(e.code));
    window.addEventListener("blur", () => this.held.clear());

    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
      this.touchSeen = true;
      const current = new Map<number, TouchZone>();
      for (const t of Array.from(e.touches)) current.set(t.identifier, this.zoneAt(t.clientX, t.clientY));
      for (const [id, zone] of current) if (!this.touches.has(id) && zone === "jump") this.touchJumpQueued = true;
      this.touches = current;
    };
    target.addEventListener("touchstart", onTouch, { passive: false });
    target.addEventListener("touchmove", onTouch, { passive: false });
    target.addEventListener("touchend", onTouch, { passive: false });
    target.addEventListener("touchcancel", onTouch, { passive: false });
  }

  /** Read and clear this frame's edge-triggered presses. */
  poll(): InputFrame {
    const anyHeld = (keys: Set<string>) => [...keys].some((k) => this.held.has(k));
    const anyPressed = (keys: Set<string>) => [...keys].some((k) => this.pressedThisFrame.has(k));
    const zones = new Set(this.touches.values());
    const left = anyHeld(LEFT) || zones.has("left");
    const right = anyHeld(RIGHT) || zones.has("right");
    const jump = anyPressed(JUMP) || this.touchJumpQueued;
    const frame: InputFrame = {
      move: left === right ? 0 : left ? -1 : 1,
      jumpPressed: jump,
      actionPressed: jump || anyPressed(ACTION),
    };
    this.pressedThisFrame.clear();
    this.touchJumpQueued = false;
    return frame;
  }
}
