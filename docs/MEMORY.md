# Memory / handoff

**Phase:** v0.1 playable prototype complete (M0–M4 of DESIGN.md milestones, rough M5).

## Done (2026-09-30)
- Full game loop: height ruler → months (morph + zoom) → stripes climb (reveal) → slide to the ice age (reveal) → credits → loop.
- Real data pipeline (`scripts/build_data.py`), 4 pytest checks; 15 vitest tests incl. "real data is jumpable".
- Bot playthrough in headless Chromium: all levels complete, no console errors. Bot time ≈ 2 min; a human reading captions ≈ 4–6 min.

## Known gaps / next up
1. **Feel pass** (most valuable): the level 2 reveal is the payoff; consider slowing the pull-back, a sound sting, holding on the stripes longer, and letting the player see their own step highlighted.
2. **Level 1 daily data**: switch to ERA5 daily anomalies when a network can reach Copernicus (see DATA_PLAN). Check it still feels noisy.
3. **Slide shape**: replace the straight-line deglaciation with Osman 2021 LGMR if fetchable.
4. Pixel font (captions use Courier New at display resolution), chiptune sfx, better character sprite + run/jump animation.
5. Touch controls are implemented but untested on a real phone.
6. Deploy: `npm run build` → `dist/` is static; GitHub Pages works (vite `base: "./"`).
7. Title is a placeholder ("Height Check").

## Gotchas
- `datasets/global-temp` labels HadCRUT5 as "GCAG" and claims a 20th-century baseline; it is actually HadCRUT5's 1961–1990 baseline. The script rebases to 1850–1900 regardless.
- Minified builds rename classes: playtest scripts should use `window.__sceneIndex`, not constructor names.
- Keep captions ≤ ~60 characters per line (320 px view, 7 px monospace).
