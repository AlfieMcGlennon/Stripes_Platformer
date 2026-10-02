# Architecture

Three blocks, and one rule that decides what goes in which.

> **The rule.** The engine takes anything two episodes would otherwise copy, and
> nothing about any episode's subject. If a module mentions terrain, levels,
> vehicles, captions or a dataset, it belongs to the episode that owns it.

```
packages/engine/        @stripes/engine — shared, subject-agnostic
episodes/noise-and-trends/  episode 1 — a platformer on the temperature record
episodes/carbon-road/   episode 2 — a road trip through cumulative emissions
scripts/                Python data pipeline, writes into episode 1
data/source/            committed official CSVs with provenance sidecars
web/                    landing page the episodes are published beneath
```

npm workspaces, one TypeScript project graph via project references.
`npm run check` typechecks the graph, runs every workspace's tests, builds both
episodes and assembles the site.

## packages/engine

| module | what it owns |
|---|---|
| `renderer.ts` | `PixelRenderer`: a low-resolution canvas scaled up with no smoothing, text drawn afterwards at display resolution, the caption panel, the `aria-live` mirror, the text-size control |
| `sky.ts` | ordered-dither sky gradients, tileable parallax ridge strips, starfield, terrain grain — all cached per theme and size |
| `palette.ts` | the warming-stripes colour scale (ColorBrewer RdBu, centred and saturated from the data) |
| `sprites.ts` | the hero frames and the blitter, with scale, flip, palette, garment shading and row cropping |
| `look.ts` | the appearance a player picks, persisted, so it carries between episodes |
| `camera.ts` | camera state, tweens, follow, world-to-screen |
| `color.ts` `random.ts` `motion.ts` | colour maths, a seeded PRNG, the reduced-motion preference |

**Three details in the renderer are shared because each was a bug fix**, and they
are the clearest argument for the package existing at all:

1. **Text gets an eight-direction outline, not a drop shadow.** A diagonal shadow
   reads as a second, misaligned copy of a digit and fills the counters of
   `0 6 8 9`. It also guarantees contrast over a light stripe, which a shadow does
   not.
2. **Glyph positions are rounded.** Fractional baselines blur a pixel font.
3. **The scale is always an integer.** A fractional scale doubles arbitrary pixel
   columns; letterboxing looks better than that.

A fourth, less obvious: **canvas text cannot respond to browser zoom.** The view is
fitted to the viewport, so page zoom shrinks `cssW` by exactly the factor it raises
`devicePixelRatio` and the product is invariant. That is why the engine owns an
in-game text-size control — it is the only way WCAG 1.4.4 is satisfiable here.

Text and caption metrics are authored against a 180px-tall view. An episode at a
different resolution gets them scaled by the ratio, so narrative text ends up the
same physical size rather than shrinking with the grid.

## episodes/noise-and-trends

```
src/core/      input, touch layout, audio          (camera comes from the engine)
src/world/     terrain, player physics, sled, particles — never touches a canvas
src/render/    Renderer subclass, terrain/actor/touch drawing, this episode's palette
src/scenes/    one file per level, plus the beat sequencer in scene.ts
src/data/      typed access to the JSON the pipeline builds
src/story.ts   the generated text version, for screen readers and anyone who prefers to read
```

The `Renderer` here extends `PixelRenderer` and adds only what a platformer on a
temperature series needs: `steps`, `slope`, `stepOutline`, `player`, `line`,
`particles`, `touchButtons`. Nothing generic lives in it.

`WalkScene` (`scenes/scene.ts`) holds the shared level machinery: a beat sequencer
(`say` / `pause` / `run` / `camera` / `zoom` / `until`), positional caption
triggers with a minimum dwell, camera follow, and the hold-to-zoom verb. Levels
subclass it and supply terrain, captions and a `draw`.

**State and drawing stay separate.** `update()` mutates, `draw()` only reads, and
`world/` never touches a canvas — which is why the physics is testable in node and
why `tests/levels.test.ts` can assert that every real step in the data is jumpable.

## episodes/carbon-road

A different genre on the same engine, which is the point of the series: four legs
of a road trip, each ending at a stop where the world halts, the talking points
play, and the character walks across to the next vehicle.

```
src/art.ts       vehicles and roadside furniture, drawn with canvas primitives
src/props.ts     roadside slots in world space: mileposts, billboards, poles, lights
src/backdrop.ts  era themes over the engine's sky, plus the skyline that grows
src/chapters.ts  the script; every figure computed from src/data.ts
src/reveal.ts    the four-panel zoom-out
src/main.ts      the road-trip state machine
```

It has no `Renderer` subclass — it draws its world with plain canvas calls, so it
takes the engine's renderer from a factory. It renders at 480×270 rather than
320×180, the one deliberate visual difference from episode 1, which buys the
vehicles enough room to be drawn with curves instead of a character grid.

It is a **prototype**: no tests, no generated text version, and its numbers are
committed arrays rather than pipeline output. `web/index.html` says so on its card.

## The data pipeline

`scripts/build_data.py` reads `data/source/` first, then the local cache in
`scripts/raw/`, and only then the network — so the instrumental record rebuilds
offline, which matters because some networks block metoffice.gov.uk and the GitHub
mirror carries no confidence limits. It writes
`episodes/noise-and-trends/src/data/*.json`, and `scripts/test_data.py` checks the
output. Provenance for each committed input lives beside it in a `.source.json`
sidecar: URL, retrieval date, SHA-256, CSV header, licence, citation.

## Build and deploy

`tsconfig.base.json` holds the compiler options; each workspace extends it and
references the engine. `emitDeclarationOnly` is deliberate — emitting JS made
vitest discover every test twice, once from source and once from the compiled copy.

`scripts/build_site.mjs` assembles `site/`: the landing page at the root, each
episode's `dist` in a folder beneath it. Both CI and the deploy workflow call it,
so the assembly is never untested. `check.yml` runs on every push and pull request;
`deploy.yml` is manual, so nothing publishes until someone decides to.
