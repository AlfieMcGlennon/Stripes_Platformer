# Architecture

Vite + TypeScript (strict), Canvas 2D, no framework. ~62 KB JS (25 KB gzipped) + self-hosted pixel fonts.

## Module map
```
scripts/build_data.py   Fetch -> rebase -> derive (rates range, cherry-pick search, warmest years) -> src/data/*.json
scripts/test_data.py    pytest checks on the generated JSON

src/data/index.ts       Typed access to global/paleo/derived JSON; monthlyWindow, olsSlope, signed
src/core/camera.ts      CameraState {cx, cy, zoomX, zoomY}; tweens (log-space zoom), follow, fitRect
src/core/input.ts       Keyboard + Pointer Events -> InputFrame {move, jump, zoomHeld, action, any}
src/core/layout.ts      Touch button table (one source for hit-testing and drawing)
src/core/audio.ts       WebAudio synth sfx (no files); sonified steps (pitch = temperature); sled noise
src/core/random.ts      Seeded PRNG
src/world/terrain.ts    Heightfield from a series ("steps" | "linear")
src/world/player.ts     Pure stepPlayer: coyote time, jump buffer, exact-apex jump, 1px swept collision, bounds
src/world/sled.ts       Pure stepSled: gravity along slope + friction (steepness -> speed)
src/world/particles.ts  Plain-data particles
src/render/renderer.ts  320x180 pixel layer + hi-res pixel-font text; steps/slope/outline/line/player/caption/touch
src/render/backdrop.ts  Cached dithered skies, parallax ridges, stars, snow, dither pattern
src/render/sprites.ts   String-art hero (raincoat kid) frames + sled
src/render/palette.ts   RdBu stripe colours, UI colours
src/scenes/scene.ts     Scene interface; WalkScene: physics, triggers, Beat sequencer, hold-to-zoom verb
src/scenes/zoom.ts      blendCamera (log zoom, screen-space centre blend)
src/scenes/title.ts     Start screen (unlocks audio, fullscreen on phones)
src/scenes/height.ts    0: height metaphor; hold Z to fast-forward a year
src/scenes/months.ts    1: monthly 1985-94; hold Z to average into years + pull back
src/scenes/cherry.ts    2: algorithmically cherry-picked 8-yr window, then zoom out to 1970-now
src/scenes/stripes.ts   3: 1850-now staircase; hold Z -> warming stripes; silent hold; legend
src/scenes/slide.ts     4: sled 21 ka -> now; landmarks; reveal with paleo stripes + magnifier + rate race
src/scenes/slideArt.ts  Slide colours/themes, thermometer, magnifier, rate race
src/scenes/credits.ts   Sources + simplifications
src/main.ts             Fixed 60 Hz loop, scene registry (?level=<id>), fades, rotate hint, mute (M)
.github/workflows/deploy.yml  CI: typecheck, test, build, publish to GitHub Pages
```

## Key ideas
- **Terrain is the data.** Level geometry is never hand-authored; tests fail if any real rise is taller than the jump.
- **Zoom is the verb.** A `zoom` beat maps held input to progress 0..1 (decays when released so the noise returns), blends the camera, and drives per-level effects (averaging morph, stripes fade-in, fast-forward). Auto-completes after 20 s so no one gets stuck.
- **Scripts are data.** Levels describe endings as `Beat[]` (say / camera / pause / run / until / zoom).
- **Update vs draw.** `update()` mutates state; `draw()` only reads. World modules never touch the canvas.
