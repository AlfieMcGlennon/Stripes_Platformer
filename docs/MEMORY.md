# Memory / handoff

**Phase:** v0.3.1 — five parallel reviews (visual, pedagogy, climate science, game design, accessibility) consolidated in `docs/REVIEW-v0.3.md`; every publication blocker fixed. Not yet deployed.

## Done
- v0.1 (2026-09-30): playable prototype, real data pipeline.
- v0.2 (2026-09-30), from three reviews (game design, climate science, code):
  - Hold-Z zoom verb in levels 0, 1, 2, 3; stripes reveal holds 3 s in silence, fewer captions, legend.
  - New cherry-pick level (window found by search in build_data.py, disclosed in-game).
  - Slide rebuilt: sled physics, landscape colours, climate-driven sky/snow, landmarks, thermometer; reveal with 21 kyr "paleo stripes", 20x magnifier on the modern cliff, and a same-175-years rate race.
  - Finale: rate as a 25–35x range (7–10 kyr deglaciation assumption), IPCC AR6 SPM A.2.2 line, why-beat (orbit + CO2 then; fossil CO2 now). Caption fixes (El Niño, sulphur haze, "relatively stable", "last few thousand years", HadCRUT5 named).
  - Visuals: pixel fonts (Pixelify Sans, Silkscreen via @fontsource), raincoat hero sprite with run frames, dithered skies, parallax ridges, textured terrain, particles, fades, title screen.
  - Feel: coyote time, jump buffer, exact jump apex; synth sfx; steps play a pitch from their temperature.
  - Mobile: pointer events, one touch layout table, any tap = continue, zoom button, visualViewport sizing, rotate hint, captions lifted above buttons. Verified with Playwright touch emulation.
  - Deploy: .github/workflows/deploy.yml, favicon, meta/OG tags.
- 21 vitest + 5 pytest; full bot playthrough, no console errors (~2.5 min bot, ~6–8 min human).

- v0.3 (2026-09-30), fixes from docs/REVIEW-v0.2.md:
  - Credibility: race caption now says ~11x for the same 175 years and 23–34x for the last 50 (ratios no longer rounded up); 2025 called "the latest year", ranked 3rd; why-beat makes CO₂ a feedback then, the trigger now; farming caption fits the geometry; landmarks corrected; credits disclose palette extension, flat Holocene, seam, averages.
  - Cherry-pick now uses the real "cooling since 2016" claim (2016–22 −0.12/decade, one more step into 2023 flips it to +0.14), then zooms out; 20% of 7-year windows since 1970 slope down.
  - Pacing: stripes CELL 12→9, era captions (aerosol stall, 1970s onset, 2016 callback), legend from the first step; fewer taps at the slide finale; day ticks 0.5 s; longer hold after averaging; all text ≥7 px; desktop "[Z] hold" chip.
  - Code: audio unlock + fullscreen inside gesture handlers (iOS); pixel-drawn touch icons (no emoji); fonts awaited; letterbox taps clamp to buttons; zoom button only live when shown; portrait hint pauses the game; play() cancels zooms; Scene.onExit; climate themes clamped + pre-warmed; ImageData skies; memoised colours; outline culling; DPR capped at 2; renderer split into terrainDraw/actors/touch/color.
  - New: "Your Stripes" scene (birth year → lifetime stripes + trend warming, PNG share card, ?y=YYYY).
  - CI runs pytest data checks. 28 vitest + 5 pytest.

- v0.3.1 (2026-09-30), from five parallel reviews — see `docs/REVIEW-v0.3.md` for the full ranked list:
  - Science: dropped the 23–34x ratio (a 50-year trend over a 7–10 kyr average, so mostly a smoothing artefact) for "9–13x" over equal 175-year spans; AR6 SPM A.2.2 moved to its own beat in AR6's wording with "high confidence" and re-filed away from "Ice age"; the inverted like-for-like credit line corrected; `tempColor` now extends the palette with six darker blues instead of compressing 6 °C of ice age into 10.5% of the scale; pre-1850 HUD labelled "vs the last few thousand years", not "vs pre-industrial"; error bars on the cherry window and on Your Stripes; `README.md` / `index.html` claims narrowed to what is true; `build_data.py` records real provenance on a cache hit and warns on mirror fallback.
  - Bugs: the rate-race panel was never cleared and covered the closing image for the whole epilogue; the stripes summit caption rendered for zero frames (a `say` with `wait:false` before a `zoom` beat); one tap on the share card's save button also exited the scene; positional triggers overwrote captions mid-read (12 of 17 were being cut off); overlapping touch hit boxes; touch buttons at 1.01:1 over light stripes.
  - Legibility (player-reported): text drop shadow → 8-direction outline, glyph positions rounded, `scale` always integer, Silkscreen snapped to multiples of 8, plus a 1x/1.5x/2x text-size control.
  - Accessibility: HTML `<details>` panel with a generated text version of the whole game and text-size / reduce-motion / mute controls; captions mirrored to an `aria-live` region; canvas fallback + `<noscript>` + a boot-failure handler (a silent black page before); "tap to play anyway" on the portrait lock.
  - Feature: the hero's costume follows the 30-year mean at their position — raincoat → jacket → summer clothes — deliberately keyed to the trend, never to a single year.
  - 28 vitest + 5 pytest still green; `tsc --noEmit` and `npm run build` clean.

## Next up
1. Enable Pages (Settings → Pages → GitHub Actions), then run the manual `deploy` workflow. Add an og:image screenshot.
2. v0.3.1 playtested on desktop (2026-09-30) and confirmed working end to end. Still untested: a real phone (touch feel, the new text sizes, audio unlock on iOS), the reduce-motion path, and a screen reader against the new text panel.
3. `docs/REVIEW-v0.3.md` §B is the ranked to-do list. Top three: ship HadCRUT5's uncertainty columns (§B1 — now unblocked anywhere, the official CSVs are committed under `data/source/` and verified to change no existing figure); move the deglaciation onset to ~18 ka and the Holocene to 11.7 ka (§B3, fixes three findings at once); drop the `grounded` gate so every year crossed ticks (§B4). §B2 needs a human to check the late-Holocene offset against the literature before it goes in.
4. Data upgrades when a network can reach them: ERA5 daily (level 1), Osman 2021 LGMR curve (slide).
5. Optional: save progress, level select, music.

## Gotchas
- A `say` beat with `wait: false` immediately before another caption-setting beat never renders: `startBeat` chains synchronously, so the second caption replaces the first before any `draw()`. Fold the line into the next beat's prompt instead.
- Canvas text cannot respond to browser zoom: the view is fitted to the viewport, so `cssW * dpr` is invariant under page zoom. That is why there is an in-game text-size control.
- `core/motion.ts` is imported by scenes, so it must stay safe where `matchMedia` and `localStorage` do not exist — vitest runs in node.
- Costume thresholds come from `GLOBAL.stripes`, so they follow the data; never key a costume to a single year's value.
- `datasets/global-temp` mirror labels HadCRUT5 as "GCAG"; values are vs 1961–1990 and get rebased. It carries no confidence limits, which is why the official CSVs are committed under `data/source/` (checked before `scripts/raw/` and before the network). Verified equivalent to 0.0001 degC.
- The official annual CSV includes the current incomplete year; `complete_years()` filters it, so `lastYear` is the last *complete* year. Don't remove that guard.
- Non-ASCII in a bash heredoc gets mangled in this environment; write patch scripts to a file instead of piping them in.
- Variable jump height was tried and removed: a tap must clear real-data steps.
- Camera must not follow while controls are off, or reveals drift (fixed in WalkScene).
- Playtest bots: use `window.__sceneId`, hold KeyZ while `__scene.zoomAvailable`.
