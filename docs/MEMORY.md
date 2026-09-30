# Memory / handoff

**Phase:** v0.2 — feel + visuals pass, cherry-pick level, honest finale, mobile + deploy setup.

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
