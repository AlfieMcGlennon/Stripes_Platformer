/**
 * @stripes/engine — the shared parts of the series.
 *
 * What belongs here: anything two episodes would otherwise copy. The renderer and
 * its text handling, the warming-stripes colour scale, the dithered sky and ridge
 * builders, the hero sprite and the saved look, plus small pure helpers.
 *
 * What does not: anything about one episode's subject. Terrain, scenes, levels,
 * vehicles, data pipelines and captions all stay in the episode that owns them.
 */
export { css, lerpColor, lerpRgb, parseColor, shade, type RGB } from "./color";
export { RDBU, stripeColor, stripePosition } from "./palette";
export { mulberry32 } from "./random";
export { reduceMotion, setReduceMotion } from "./motion";
export {
  BUST_ROWS, drawSprite, heroFrame, HERO, SLED, SPRITE_H, SPRITE_PALETTE, SPRITE_W,
  type Frame, type SpriteOptions,
} from "./sprites";
export {
  CLOTHES, cycleLook, getLook, lookPalette, lookShirt, OUTFITS, setLook, shirtStripes, SKINS,
  type ClothesOption, type Look, type Outfit,
} from "./look";
export {
  BODY_FONT, PixelRenderer, TITLE_FONT, type Align, type RendererOptions, type TextOptions,
} from "./renderer";
export {
  BAYER, ditheredSky, ditherPattern, drawRidge, drawStars, offscreen, prewarmTheme, ridgeStrip,
  type Theme,
} from "./sky";
export {
  advanceTween, camera, easeInOutCubic, fitRect, follow, lerp, sampleTween, startTween, tweenDone,
  worldToScreen, type CameraState, type CameraTween, type Rect,
} from "./camera";
