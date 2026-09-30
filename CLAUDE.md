# CLAUDE.md

Small educational platformer (Vite + TS + Canvas 2D). Read `docs/MEMORY.md` first, then `docs/ARCHITECTURE.md`.

Rules:
- **Single teaching goal:** a trend is a property of the long view, not of any one day or year. Cut anything that doesn't serve it.
- **No invented climate data.** Every climate number comes from `scripts/build_data.py` output. Illustrative/made-up values (only the height metaphor) must be labelled on screen.
- State updates and drawing stay separate: `update()` mutates state, `draw()` only reads it. World/physics code never touches the canvas.
- Keep files under ~300 lines; barrel exports per folder; strict TS, no `any`.
- Before committing: `npx tsc --noEmit && npm test && npm run build`. If you touch level scales, the "jumpable" tests must still pass.
- Log non-trivial choices in `docs/DECISIONS.md`; update `docs/MEMORY.md` at the end of a session.
- Commit style: `area: description` (e.g. `stripes: slow the reveal`).
