/**
 * The zoom-out is the whole game, so the camera is data: a centre plus separate
 * horizontal and vertical zoom. While walking they are equal; on a reveal the
 * vertical zoom can stay larger, exactly like a chart's y-axis, otherwise 175
 * years of staircase would flatten into a line.
 */
export interface CameraState {
  cx: number;
  cy: number;
  zoomX: number;
  zoomY: number;
}

export interface CameraTween {
  from: CameraState;
  to: CameraState;
  duration: number;
  elapsed: number;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function camera(cx: number, cy: number, zoom = 1): CameraState {
  return { cx, cy, zoomX: zoom, zoomY: zoom };
}

export function startTween(from: CameraState, to: CameraState, duration: number): CameraTween {
  return { from: { ...from }, to: { ...to }, duration, elapsed: 0 };
}

export function advanceTween(tw: CameraTween, dt: number): CameraState {
  tw.elapsed = Math.min(tw.duration, tw.elapsed + dt);
  return sampleTween(tw);
}

/**
 * Zoom is interpolated in log space so a 1x -> 0.1x pull-back feels even rather
 * than rushing at the start.
 */
export function sampleTween(tw: CameraTween): CameraState {
  const t = easeInOutCubic(tw.duration <= 0 ? 1 : tw.elapsed / tw.duration);
  const logLerp = (a: number, b: number) => Math.exp(lerp(Math.log(a), Math.log(b), t));
  return {
    cx: lerp(tw.from.cx, tw.to.cx, t),
    cy: lerp(tw.from.cy, tw.to.cy, t),
    zoomX: logLerp(tw.from.zoomX, tw.to.zoomX),
    zoomY: logLerp(tw.from.zoomY, tw.to.zoomY),
  };
}

export function tweenDone(tw: CameraTween): boolean {
  return tw.elapsed >= tw.duration;
}

/** Smoothly chase a target; `rate` is roughly "fraction per second". */
export function follow(cam: CameraState, tx: number, ty: number, dt: number, rate = 6): CameraState {
  const k = 1 - Math.exp(-rate * dt);
  return { ...cam, cx: lerp(cam.cx, tx, k), cy: lerp(cam.cy, ty, k) };
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Camera that fills the view with a world rectangle (axes scaled independently). */
export function fitRect(r: Rect, viewW: number, viewH: number, margin = 16): CameraState {
  return {
    cx: (r.left + r.right) / 2,
    cy: (r.top + r.bottom) / 2,
    zoomX: (viewW - 2 * margin) / (r.right - r.left),
    zoomY: (viewH - 2 * margin) / (r.bottom - r.top),
  };
}

export function worldToScreen(cam: CameraState, x: number, y: number, viewW: number, viewH: number) {
  return { sx: (x - cam.cx) * cam.zoomX + viewW / 2, sy: (y - cam.cy) * cam.zoomY + viewH / 2 };
}
