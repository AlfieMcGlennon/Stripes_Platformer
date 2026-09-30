import { buttonAt, type ButtonId } from "./layout";

/**
 * Keyboard + pointer (touch and mouse). Game code only sees an InputFrame,
 * never raw events.
 */
export interface InputFrame {
  move: -1 | 0 | 1;
  jumpPressed: boolean;
  jumpHeld: boolean;
  /** Hold to zoom out / average: the game's central verb. */
  zoomHeld: boolean;
  /** "Continue": Enter, jump, or any new tap/click anywhere. */
  actionPressed: boolean;
  /** Any key or tap at all this frame (used to unlock audio and start). */
  anyPressed: boolean;
}

const LEFT = new Set(["ArrowLeft", "KeyA"]);
const RIGHT = new Set(["ArrowRight", "KeyD"]);
const JUMP = new Set(["Space", "ArrowUp", "KeyW"]);
const ZOOM = new Set(["KeyZ", "KeyX", "ShiftLeft", "ShiftRight"]);
const ACTION = new Set(["Enter"]);
const GAME_KEYS = new Set([...LEFT, ...RIGHT, ...JUMP, ...ZOOM, ...ACTION]);

export class Input {
  private held = new Set<string>();
  private pressed = new Set<string>();
  private pointers = new Map<number, ButtonId | null>();
  private tapQueued = false;
  private jumpTapQueued = false;
  private anyQueued = false;
  touchSeen = false;
  /** Whether the on-screen zoom button is live (only during a zoom beat). */
  zoomActive = false;

  /**
   * `onGesture` runs synchronously inside real user-gesture events. iOS only
   * lets audio start (and Android fullscreen) from inside such a handler.
   */
  constructor(
    target: HTMLElement,
    toView: (clientX: number, clientY: number) => { x: number; y: number },
    onGesture: () => void = () => undefined,
  ) {
    window.addEventListener("keydown", (e) => {
      // Leave browser shortcuts (Ctrl/Cmd + arrows etc.) alone.
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.held.add(e.code);
      this.anyQueued = true;
      onGesture();
    });
    window.addEventListener("keyup", (e) => this.held.delete(e.code));
    window.addEventListener("blur", () => {
      this.held.clear();
      this.pointers.clear();
    });

    const zoneFor = (e: PointerEvent) => {
      const v = toView(e.clientX, e.clientY);
      return e.pointerType === "mouse" ? null : buttonAt(v.x, v.y, 6, this.zoomActive);
    };
    target.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (e.pointerType !== "mouse") this.touchSeen = true;
      const zone = zoneFor(e);
      this.pointers.set(e.pointerId, zone);
      this.anyQueued = true;
      onGesture();
      if (zone === "jump") this.jumpTapQueued = true;
      // Any tap that isn't steering counts as "continue".
      if (zone !== "left" && zone !== "right") this.tapQueued = true;
    });
    target.addEventListener("pointermove", (e) => {
      if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, zoneFor(e));
    });
    const release = (e: PointerEvent) => this.pointers.delete(e.pointerId);
    target.addEventListener("pointerup", (e) => {
      release(e);
      onGesture();
    });
    target.addEventListener("pointercancel", release);
  }

  /** Read and clear this frame's edge-triggered presses. */
  poll(): InputFrame {
    const heldAny = (keys: Set<string>) => [...keys].some((k) => this.held.has(k));
    const pressedAny = (keys: Set<string>) => [...keys].some((k) => this.pressed.has(k));
    const zones = new Set(this.pointers.values());
    const left = heldAny(LEFT) || zones.has("left");
    const right = heldAny(RIGHT) || zones.has("right");
    const jumpPressed = pressedAny(JUMP) || this.jumpTapQueued;
    const frame: InputFrame = {
      move: left === right ? 0 : left ? -1 : 1,
      jumpPressed,
      jumpHeld: heldAny(JUMP) || zones.has("jump"),
      zoomHeld: heldAny(ZOOM) || zones.has("zoom"),
      actionPressed: jumpPressed || pressedAny(ACTION) || this.tapQueued,
      anyPressed: this.anyQueued,
    };
    this.pressed.clear();
    this.tapQueued = false;
    this.jumpTapQueued = false;
    this.anyQueued = false;
    return frame;
  }
}
