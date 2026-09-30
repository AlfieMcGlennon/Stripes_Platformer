import { lerp, type CameraState } from "../core";

/**
 * Blend between a close-up and a zoomed-out camera. Zoom blends in log space
 * so the pull-back feels even. The centre blends in *screen* terms: we lerp the
 * point that sits at screen centre by the same fraction as the log-zoom, which
 * keeps the player from sliding off screen early in the pull-back.
 */
export function blendCamera(near: CameraState, far: CameraState, t: number): CameraState {
  const logLerp = (a: number, b: number) => Math.exp(lerp(Math.log(a), Math.log(b), t));
  const zoomX = logLerp(near.zoomX, far.zoomX);
  const zoomY = logLerp(near.zoomY, far.zoomY);
  // Fraction of the way from near to far zoom, in "how zoomed out" terms.
  const kx = far.zoomX === near.zoomX ? t : (1 / zoomX - 1 / near.zoomX) / (1 / far.zoomX - 1 / near.zoomX);
  const ky = far.zoomY === near.zoomY ? t : (1 / zoomY - 1 / near.zoomY) / (1 / far.zoomY - 1 / near.zoomY);
  return { cx: lerp(near.cx, far.cx, kx), cy: lerp(near.cy, far.cy, ky), zoomX, zoomY };
}
