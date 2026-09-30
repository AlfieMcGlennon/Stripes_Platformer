# Memory / handoff

**Phase:** v0.3 — all v0.2 review fixes applied; "Your Stripes" share card added.

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

## Next up
1. Push to a real GitHub repo, enable Pages (Settings → Pages → GitHub Actions). Add an og:image screenshot.
2. Test on a real phone (touch feel, font sizes, audio unlock on iOS).
3. Data upgrades when a network can reach them: ERA5 daily (level 1), Osman 2021 LGMR curve (slide), HadCRUT5 uncertainty band.
4. Verify literature claims quoted in captions (AR6 SPM A.2.2 wording) and the showyourstripes colour method.
5. Optional: save progress, level select, music.

## Gotchas
- `datasets/global-temp` mirror labels HadCRUT5 as "GCAG"; values are vs 1961–1990 and get rebased.
- Variable jump height was tried and removed: a tap must clear real-data steps.
- Camera must not follow while controls are off, or reveals drift (fixed in WalkScene).
- Playtest bots: use `window.__sceneId`, hold KeyZ while `__scene.zoomAvailable`.
