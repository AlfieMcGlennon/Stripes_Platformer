# Architecture

Vite + TypeScript (strict), Canvas 2D, no framework. ~40 KB JS (16 KB gzipped) including data.

## Module map
```
scripts/build_data.py   Fetch -> rebase -> derive -> src/data/*.json (+ data/sources.json)
scripts/test_data.py    pytest checks on the generated JSON

src/data/index.ts       Typed access to global.json, paleo.json, derived.json; helpers (monthlyWindow, signed)
src/core/camera.ts      CameraState {cx, cy, zoomX, zoomY}; tweens (log-space zoom), follow, fitRect
src/core/input.ts       Keyboard + touch -> InputFrame {move, jumpPressed, actionPressed}
src/world/terrain.ts    Heightfield from a series ("steps" or "linear"); groundAt/groundUnder; groupMeans
src/world/player.ts     Pure stepPlayer(state, controls, terrain, dt) -> new state (1px swept collision)
src/render/palette.ts   RdBu stripe colours, UI colours
src/render/renderer.ts  320x180 pixel layer (integer-scaled) + hi-res text layer; terrain/player/caption drawing
src/scenes/scene.ts     Scene interface; WalkScene base (physics, x-triggered captions, say/moveCamera beats); revealCamera
src/scenes/height.ts    Level 0: height metaphor (seeded fake data, labelled as such)
src/scenes/months.ts    Level 1: monthly 1985-1994, morph to annual means, zoom out
src/scenes/stripes.ts   Level 2: annual 1850-2025 staircase, reveal -> warming stripes
src/scenes/slide.ts     Level 3: 21 ka -> now on a true time axis; rate comparison
src/scenes/credits.ts   Sources + simplifications; loops to start
src/main.ts             Fixed 60 Hz loop, scene list, touch buttons, ?level=N, window.__scene for playtests
```

## Data flow
```
build_data.py -> src/data/*.json -> data/index.ts -> scene constructors -> Terrain (groundY[])
InputFrame -> scene.update() -> stepPlayer() / triggers / camera tweens   (state only)
scene.draw(renderer) -> pixel layer + queued text -> renderer.present()   (reads state only)
```

## Key ideas
- **Terrain is the data.** `groundY[i] = zeroY - value * valueScale`. Level geometry is never hand-authored.
- **Zoom is a camera tween**, not a scene change. `zoomX` and `zoomY` are separate so a reveal can fit 176 years across the screen while keeping the vertical axis readable (like a chart). While walking they're equal.
- **Morph** (level 1) tweens `groundY` from monthly values to annual means in place; physics keeps the player on the moving ground.
- **Scripted beats** use `say(lines, then)` (waits for continue) and `moveCamera(target, seconds, then)`; x-position `triggers` show captions while walking.
- **Playability is tested against the real data**: `tests/levels.test.ts` fails if any real month/year rise is taller than the jump. This already caught one (0.355 °C monthly rise at 160 px/°C); level 1 now uses 130 px/°C.

## Deviations from DESIGN.md
- Levels renumbered: 0 height, 1 months (daily → monthly, see DATA_PLAN), 2 stripes, 3 slide, then credits. The design's separate "averaging" level is folded into the end of level 1.
- Level 3 walks *backwards* in time (right to left): down the modern cliff, along the Holocene, down the deglaciation ramp.
