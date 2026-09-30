# v0.2 review: combined to-do list

Three reviews of v0.2 (game design, climate science, code/mobile), merged and ranked.
Items marked [verify] are literature figures the reviewer cited from memory.

## Must fix before sharing (credibility)
1. **Rate panel vs caption mismatch.** The "same 175 years" panel shows ~+0.1 vs +1.4 °C (≈10x), but the next caption says "25–35x" (that figure is last-50-years vs deglacial average). Say both explicitly, e.g. "Same 175 years: ice-age pace ≈ +0.1 °C, measured +1.4 °C, about 10x. Over the last 50 years it's roughly 24–34x." (`slide.ts` finale beats)
2. **Ratio rounding.** 2.06/0.087 = 23.7 and 2.06/0.061 = 33.8; `build_data.py` rounds to 5s and gets 25–35. Round to nearest integer or say "more than 20x". (`build_data.py` rateRatioLow/High)
3. **"2025. You're at the top."** 2025 (+1.41) is 3rd warmest after 2024 (+1.53) and 2023 (+1.47). Use "the latest year". (`stripes.ts`)
4. **Why-beat wording.** Make CO₂ a feedback then, a trigger now; say greenhouse gases, not only CO₂: "The ice age ended as orbital shifts warmed the planet; oceans released CO₂ and ice melted, amplifying it. Today the trigger is us: greenhouse gases, mostly CO₂ from fossil fuels (IPCC AR6)." (`slide.ts`)
5. **Farming sits on the warming ramp** but the caption says it began in the stable stretch. Either move the ramp end to ~11.7 ka (Holocene start) or reword to "Farming, towns and cities grew up as the climate settled." (`slide.ts` LANDMARKS / triggers)
6. **Disclose the palette extension.** Colours below the stripes range are our extension of the showyourstripes scale; say so in the credits and credit ColorBrewer. Also note the paleo/instrumental seam and flat Holocene (real variation ~±0.5 °C [verify]).

## Cherry-pick level: consider a real-world example
The searched 1979–86 window reads as a straw man (its -0.13 °C/decade has a standard error of about ±0.13). Better: **"It's been cooling since 2016!"**. In HadCRUT5, 2016–2022 is -0.12 °C/decade (super El Niño start, then triple La Niña); add 2023 and it flips to +0.14. Keep the "we checked all N windows" disclosure as a follow-up line. The 1940–1975 aerosol era (-0.04/decade) is another option.

## Game feel / pacing (design review)
- **Stripes climb drags** (176 steps, ~40 s). Options: CELL 12→8, a "hold → to sprint" hint, era captions (1940s bump, 1970s onset), a cherry-pick callback.
- **Too many tap-to-continue captions at the slide finale** (~6 in a row). Auto-advance or merge two.
- **Show a legend chip from the first stripes step**, not only after the reveal. Enlarge 5–6 px text (unreadable on phones).
- **Desktop has no on-screen Z hint.** Draw a "[Z] hold" chip whenever `zoomAvailable`.
- Level 1: add a ~1.5 s hold after the averaging morph (the most satisfying moment gets the least dwell). Level 0: days tick 0.8 s → 0.5 s.
- Slide: "Push ←" → "Hold ←"; labels collide with the magnifier and player at the reveal. Add "2025 / +1.4 °C" on the magnifier's right edge.
- **Bold v0.3 idea, "Your Stripes":** pick a birth year and get a shareable card with personal stripes and "Born 1998: you've lived through +0.6 °C" [compute from data], exported as PNG or linked with `?y=1998`.

## Code / mobile bugs (code review)
- **High: iOS audio stays silent.** `unlock()` runs in the rAF loop, not inside a gesture handler. Call it from the `pointerup` / `keydown` listeners in `input.ts` (move fullscreen there too).
- **High: iOS draws ◀ ▶ ▲ as colour emoji.** Draw the touch arrows as pixel shapes instead of font glyphs.
- **Font swap on first load:** await `document.fonts.load(...)` (with a timeout) before starting the loop.
- **Letterbox dead zone:** taps in the side black bars miss the edge buttons. Extend the edge zones to the screen edge.
- **Clamp `phase` in `climateTheme`** (`slideArt.ts`) to [0, 2] to avoid bad colours and cache growth.
- `WalkScene.play()` should clear `tween`/`zoomBase`. Add a `Scene.onExit` hook (sled volume).
- Portrait hint: pause `update()` while it shows. Detect phones with `matchMedia("(pointer: coarse)")` instead of the first touch.
- Title ignores taps during the first ~0.65 s.

## Performance (low-end phones)
1. Sky cache build = 57,600 `fillRect` calls per theme; the slide hitches when the climate theme changes. Build with `ImageData` and pre-warm themes during the fade.
2. Per-frame colour strings: memoise `shade()` / `colorForYear()`, cull `stepOutline` to the visible range, cache the dither pattern.
3. Cap devicePixelRatio at 2 in `renderer.resize()`.

## Maintainability
- `renderer.ts` is 322 lines: split into layers/text, terrain drawing and touch.
- Use one colour type (`[r,g,b]` plus a memoised `css()`) in a `render/color.ts`.
- Add tests for `buttonAt`, `climateTheme` bounds and the beat sequencer.

## Reviewer error to ignore
The science reviewer doubted that the mirror's "GCAG" column is HadCRUT5. It is: the mirror's `scripts/process.py` downloads the Met Office HadCRUT.5.1.0.0 summary series (checked 2026-09-30).
