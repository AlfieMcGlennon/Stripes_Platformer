# CLAUDE.md

Monorepo for the stripes series: a shared pixel engine plus one folder per episode.

**These are explainers, not games.** No score, no fail state, no replay value: each episode lands one
point once and stops. If a control does not teach, cut it. Every episode ships a written version of
its whole argument via the engine's reading panel, because a lot of readers will want the point
without the interaction.
Read `docs/MEMORY.md` first, then `docs/ARCHITECTURE.md`.

```
packages/engine/        @stripes/engine — shared renderer, colour scale, sky, sprites, look
episodes/noise-and-trends/  episode 1 (the deployed one)
episodes/carbon-road/   episode 2 (walkthrough prototype)
scripts/                Python data pipeline + pytest
data/source/            committed official CSVs with provenance sidecars
```

Rules:
- **One idea per episode, and the mechanic is the idea.** Episode 1: a trend is a property of the
  long view, not of any one day or year. Cut anything that doesn't serve the episode's single goal.
- **No invented climate data.** Every climate number comes from `scripts/build_data.py` output.
  Illustrative values (only episode 1's height metaphor) must be labelled on screen.
- **Comparisons must be like-for-like**, and every simplification goes in the credits.
- **Engine vs episode:** the engine takes anything two episodes would copy, and nothing about any
  episode's subject. If it mentions terrain, levels, vehicles or captions, it belongs to an episode.
- State updates and drawing stay separate: `update()` mutates state, `draw()` only reads it.
  World/physics code never touches the canvas.
- Keep files under ~300 lines; barrel exports per folder; strict TS, no `any`.
- Before committing: `npm run check` (typecheck the project graph, all tests, both builds) and
  `python -m pytest scripts/` if the pipeline changed.
- Log non-trivial choices in `docs/DECISIONS.md`; update `docs/MEMORY.md` at the end of a session.
- Commit style: `area: description` (e.g. `stripes: slow the reveal`, `engine: share the renderer`).

Gotchas:
- A `say` beat with `wait: false` immediately before another caption-setting beat never renders:
  `startBeat` chains synchronously, so the second caption replaces the first before any `draw()`.
- Canvas text cannot respond to browser zoom (the view is fitted to the viewport, so `cssW * dpr`
  is invariant). That is why the engine owns an in-game text-size control.
- `engine/motion.ts` is imported by scenes, so it must stay safe where `matchMedia` and
  `localStorage` do not exist — vitest runs in node.
- `emitDeclarationOnly` is deliberate: `tsc --build` emitting JS made vitest run every test twice,
  once from source and once from the compiled copy.
