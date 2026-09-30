# Stripes Platformer — Design Doc (working title)

## One-line vision
A 5–8 minute retro platformer that makes you *feel* why a climate trend is invisible day to day and unmissable when you zoom out.

## The core idea (the "height" metaphor)
Measure your height every day. Today vs yesterday: no visible difference, sometimes you shrink (spinal discs compress over the day — roughly a centimetre or so, verify before quoting). Weather is the same: day to day it is messy, and you cannot read a trend from two points. Zoom out far enough and the pattern is obvious. The game is one continuous act of zooming out.

**Single teaching goal:** *A trend is a property of the long view, not of any one day or year.*
Everything else (causes, solutions) is out of scope for v1, or a one-screen epilogue at most.

> **Built v0.1 (2026-09-30):** levels ship as 0 height → 1 months (+ averaging) → 2 stripes → 3 slide → credits. See `ARCHITECTURE.md` "Deviations" and `DATA_PLAN.md` "Status as built".

## Player experience beats

| # | Level | What the player does | What they learn | Camera scale |
|---|-------|----------------------|-----------------|--------------|
| 0 | Title / height ruler | Character stands next to a ruler. Height ticks up/down by a few mm on each "day". | Daily measurement is noisy. | Tight |
| 1 | Daily noise | Platformer over terrain generated from a real daily temperature series. Up, down, up, down. No pattern. | Two consecutive days tell you nothing. | Days |
| 2 | Averaging | Terrain smooths as days collapse into months, then years. Still bumpy year to year. | Even averaged, one year is easy to brush off. | Months → years |
| 3 | The stripes climb | Terrain becomes a staircase, one step per year, each coloured as a warming stripe. Steps are small. Player climbs. Then the camera pulls back to reveal the whole staircase. | "We started down there, now we are here." | Years → 170 yrs |
| 4 | The slide | Long gentle slide down the last deglaciation (~10k yrs), then the last ~150 years as a cliff. | Rate of change is the story: recent warming is far faster. | Millennia |
| 5 | Epilogue (optional) | One screen, one call to action / source credits. | — | — |

### The reveal (most important moment)
Level 3 pull-back is the payoff. Spend polish budget here first. The step the player is standing on should remain visible (highlighted) as the camera zooms so "you are here" is literal.

## Mechanics (keep tiny)
- Run, jump, maybe one extra (a glide or double jump for the staircase). No enemies, no lives, no fail state beyond respawn at the last checkpoint.
- Camera zoom is a first-class system (data-driven, tweened), not a scene cut.
- Collectibles are optional and educational: e.g. a "day" token that shows that day's temperature vs the previous.
- Retro look: small internal resolution (e.g. 320×180), integer-scaled, limited palette. The stripes palette must stay faithful (blue→red diverging scale) even inside the retro palette.

## Tone
Calm, curious, not doom. Short on-screen text (max ~15 words at a time). No lecturing. Let the geometry make the argument.

## Scope guard
- v1: levels 0–4 + credits. Playable in a browser, shareable link, mobile-friendly touch controls if cheap.
- Not v1: causes/attribution, projections/scenarios, multiple regions, leaderboards, audio beyond a few chiptune sfx.
- If a feature does not serve the single teaching goal, it is cut.

## Technical approach
- **Vite + TypeScript, Canvas 2D, no game framework.** Small enough that Phaser is overhead.
- Fixed timestep loop, simple AABB collision against a heightfield (terrain is a 1D series, which makes collision trivial: y = f(x)).
- Terrain = function of a data series + a scale. Zooming = changing the series resolution and x/y scale, not swapping assets.
- State is plain JSON-serialisable objects. Rendering reads state; game logic never touches the canvas (same simulation/rendering split as Nimbus Valley).

### Proposed layout
```
src/
  main.ts
  core/        loop.ts, input.ts, camera.ts (zoom tweening)
  world/       terrain.ts (series -> heightfield), collision.ts
  levels/      level0..4.ts (each: data slice, scale, text beats)
  render/      canvas.ts, stripes.ts (palette), hud.ts
  data/        *.json (generated, committed)
scripts/
  build_data.py   # fetch + clean + rebase + export (see DATA_PLAN.md)
tests/           # terrain + collision + data-shape tests (vitest)
docs/            DESIGN.md, DATA_PLAN.md, MEMORY.md
```
Files under ~300 lines, barrel exports per folder.

## Milestones
1. **M0 Scaffold:** Vite+TS, loop, input, canvas, integer scaling, one platform. Vitest set up.
2. **M1 Terrain from data:** heightfield from a JSON series, walkable, camera follow.
3. **M2 Zoom system:** tween between resolutions (daily → monthly → annual) with the player anchored. *This is the riskiest piece; do it before content.*
4. **M3 Levels 0–3** with real data and stripes rendering.
5. **M4 Level 4** slide (paleo + recent).
6. **M5 Polish:** text beats, sfx, touch controls, credits, deploy (GitHub Pages).

## Risks
- Zoom transition feeling cheap or disorienting → prototype in isolation first.
- Data on screen being misread (baseline, units, cherry-picked window) → fix baselines in DATA_PLAN, always label.
- Scope creep into "climate education video" → scope guard above.

## Open questions
- Working title (Stripes? "Zoom Out"? "Height Check"?).
- ~~Local vs global daily series~~ Decided: global (ERA5 daily anomalies + HadCRUT5). Revisit if level 1 doesn't feel noisy enough (see DATA_PLAN).
- Do we show the projection/future at the end, or stop at "now"?
