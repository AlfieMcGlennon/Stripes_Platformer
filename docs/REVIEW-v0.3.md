# v0.3 review: five reviews, consolidated

Five parallel reviews of v0.3 — visual design, learning experience, climate science, game
design/feel, accessibility/robustness — merged, deduplicated, and ranked. Every finding was
re-checked against the source before being acted on; the ones that did not survive that check
are recorded at the bottom rather than deleted.

Items marked **[done v0.3.1]** are fixed in this commit. Everything else is open, in rough
priority order.

Cross-corroboration worth noting: the colour-scale compression (§A2) and the caption-overwrite
blocker (§A4) were each found independently by two reviewers working from different angles,
which is why they were treated as certain rather than plausible.

---

## A. Fixed in v0.3.1

### A1. "23–34x" was mostly a smoothing artefact, and AR6 appeared to endorse it — **[done]**
A 50-year OLS trend divided by 6 °C spread over 7,000–10,000 years. Demonstrable inside the
instrumental record: the maximum trend over a 20-year window is 4.52x the 176-year mean rate, a
50-year window 3.13x, a 100-year window 1.69x — so lengthening the window alone accounts for
most of a "rate" difference. The deglacial denominator averages over a window 140–200x longer
than 50 years. AR6 SPM A.2.2 stops at 2,000 years precisely because proxies cannot resolve
50-year rates further back, so placing it after the ratio implied an endorsement the IPCC does
not give. `credits.ts` also had the like-for-like claim inverted.
Now: "about 9–13x faster" over equal 175-year spans, as a range; AR6 quoted in its own beat in
AR6's wording with "(high confidence)"; the citation re-filed away from "Ice age".

### A2. Colour scale compressed the ice age 45x — **[done]**
`stripePosition(0)` = −0.7902, so `tempColor` mapped 6.06 °C of glacial cooling onto 0.21 of
the scale (0.035 palette units per °C) against 1.557 per °C above zero. The ice age `#053061`
and pre-industrial `#2368ad` were the same dark blue to the eye, in the one scene built to show
how large natural change was. Now extended with six darker blues below the stripes range, so
the deglaciation has a ramp of its own; disclosed in the credits.

### A3. Tierney's late-Holocene reference labelled "vs pre-industrial" — **[done]**
−6.06 °C is LGM minus late Holocene (4–0 ka). The game used it as an anomaly against
1850-1900 everywhere and said "colder than the last few thousand years" (correct) and "vs
pre-industrial" (not) about 40 seconds apart. Labels now name each era's own zero.

### A4. 12 of 17 timed captions were cut off mid-read — **[done]**
`scene.ts` triggers called `setCaption` unconditionally with no minimum hold, ran after the
`waiting` check, and only `jumpPressed` was suppressed while waiting — so the player kept
walking and overwrote the caption they were still reading. Worst cases: the 6 °C ice-age caption
at 28% read, and `months.ts:37` "Higher = warmer, for the whole planet" — the only line in the
game that maps ground height to temperature — at 41%. Now: a dwell of `0.35 + 0.3 x words`,
triggers queue behind it, and movement stops while a caption waits.

### A5. The rate-race panel never went away — **[done]**
`raceT` was set to 0 and never reset, and both `drawRateRace` and the early return in
`drawRevealLabels` were gated on `raceT >= 0`. So a 268x116 panel covered the screen for the
rest of the game and the closing line "Zoom out, and it's **this**" was delivered over a bar
chart with "this" hidden. One `{ run: () => (this.raceT = -1) }` beat; closing pause 3s → 4s.

### A6. The summit of the 176-step climb rendered for zero frames — **[done]**
`stripes.ts` had `{ say: [...], wait: false }` immediately before a `zoom` beat. In `startBeat` a
`say` with `wait: false` calls `nextBeat()` synchronously and the zoom beat's own prompt
overwrites the caption in the same call stack, before any `draw()`. So the v0.2 fix that changed
"You're at the top" to "the latest year" was never once visible. Folded into the zoom prompt.

### A7. Tapping save on the share card destroyed the share card — **[done]**
`input.ts` treated every non-steering zone as "continue", so one touch on the zoom button set
both `tapQueued` and `zoomHeld`: `save()` ran and `done = true` on the same frame, so "Saved!"
could never appear on touch. Zoom is now excluded from "continue".

### A8. No text alternative, no reduced motion, inescapable portrait lock, no text-size control — **[done]**
Four accessibility blockers, all absences. Now: an HTML `<details>` panel with the full text
version of the game (generated from the data, so it cannot drift) plus text-size, reduce-motion
and mute controls; captions mirrored into an `aria-live` region via `renderer.caption`; canvas
fallback content and a `<noscript>`; a boot-failure handler that points at the text version
instead of leaving a silent black page; "or tap to play anyway" on the portrait hint.
Reduced motion currently disables falling snow, star twinkle, dust bursts, sled spray, scene
fades and the title/credits auto-scroll (the last also fixes WCAG 2.2.2).

### A9. Text legibility — **[done]**
Reported by the player, and three separate causes:
- `renderer.ts` drew a *drop shadow* offset `0.6 x scale` — 2–3 device px diagonally at desktop
  scale — which reads as a second misaligned copy of a digit and fills the counters of 0/6/8/9.
  Now an 8-direction 1px outline, which also fixes contrast over light stripes.
- Glyph positions were never rounded, so fractional baselines blurred them. Now rounded.
- `scale` went fractional below 2x, doubling arbitrary pixel columns. Now always integer.
- Silkscreen is a strict 8-module-per-em face and was rendered at arbitrary sizes (scale 9 is
  common on retina laptops). Title-font sizes are now snapped to multiples of 8.

### A10. Smaller items — **[done]**
Touch buttons at 1.01:1 over light stripes (solid dark plate now); overlapping touch hit boxes
where a thumb on the inner edge of "right" moved you left; the relativist sign-off on the
cherry-pick level, replaced with the asymmetry (`ALL_RISING` is computed, not typed); an error
bar on the cherry window and on "Your Stripes"; `trendToLatest` used at last; credits half-pixel
baselines and stripe overdraw; `README.md` and `index.html` claims narrowed to what is true;
`build_data.py` now records real provenance on a cache hit and warns when it falls back to the
mirror.

---

## B. Open, highest value first

1. **Nothing in the game shows HadCRUT5's uncertainty.** The official summary CSV that
   `HADCRUT_ANNUAL[0]` points at carries 2.5%/97.5% confidence columns and `parse_hadcrut`
   throws them away (`build_data.py`, reads `r[1]` only). Three lines to keep them, then a 1px
   band behind the stripes reveal and the share card. `paleo.lgmGridErrorMean` (0.41) is
   computed, typed and referenced nowhere — and should be replaced by Tierney's published CI
   (−6.5…−5.7) rather than a mean of spatially-correlated grid errors.
   **Unblocked 2026-09-30:** the two official CSVs are now committed under `data/source/` and
   `build_data.py` checks there before the network, so this can be done on any machine including
   sandboxed sessions where metoffice.gov.uk is blocked. Confirmed additive: the official series
   and the mirror-derived series already committed differ by at most 0.0001 degC across all 176
   years, and every caption figure is identical to 4 dp, so adding the band moves no number.
   Band widths for scale: 0.346 degC in 1850, 0.203 in 1950, 0.079 in 2025.
2. **The late-Holocene → 1850-1900 offset is still unapplied.** Labels are now honest about the
   two zeros (A3), but `pathValue` still hard-sets the Holocene to exactly 0. Emit a cited
   `lateHoloceneToPreindustrialOffset` from `build_data.py` and apply it. Literature puts it at
   roughly 0.1–0.4 °C; needs a human source check (PAGES2k / Kaufman 2020 / Osman 2021).
3. **The Holocene starts ~1,700 years too late.** `DEGLACIATION_START_CE` is a hard-coded
   20 ka against `lgmAgeYearsBP = 21_000` and the script's own "roughly 18-11 ka" comment. Real
   onset ≈18–19 ka, Holocene ≈11.7 ka. `pathValue(-9500)` = −0.88 °C, so the "first farming"
   landmark still sits mid-ramp while the caption says the climate had settled. Fixing the two
   constants fixes the landmark, the "about 10,000 stable years" caption (drawn stretch is
   9,900 yr) and the "21,000 years" label that `formatYear` renders as 21,100 at the same x.
4. **Jumps fly over the years being counted.** `scene.ts` only sonifies a step when `grounded`,
   and one jump covers ~6.8 years at `CELL = 9` — in the level whose argument is "one step, one
   year". Dropping the `grounded` gate makes the year counter and step tone fire per cell
   crossed. (The v0.3 pacing fix `CELL 12→9` made this worse, not better.)
5. **The 21 kyr reveal is a cutscene.** `DECISIONS.md` locks "every reveal is driven by holding
   Z"; the slide's is a 4s camera tween followed by a 2.5s pause — 6.5s with no input, the
   longest dead block in the game — and `revealed` only flips after it, so it snaps rather than
   blooms. Make it a `zoom` beat and drive the paleo-stripe alpha from its progress.
6. **~16s pass before the player moves, and jump is never taught.** Level 0 is 40 flat cells, so
   the first jump the game asks for is in level 1, 0.2s in, at 73% of the jump ceiling.
7. **The "jumpable" canary has 1.46px of slack** (`levels.test.ts` asserts < 54px; the true
   ceiling is `jumpHeight + stepUp` = 63px; worst real rise is 52.54px at 1877). It also never
   imports `cherry.ts`'s own `PX_PER_DEGREE`, and cherry's mandatory `until` gate is the only
   softlock vector in the build. Export `MAX_CLEARABLE`, assert against 55, and add a bot test
   per walking level that asserts the end is reachable.
8. **Tests lock in the conclusion, not the pipeline.** `test_data.py` asserts the *sign* of a
   7-year trend whose CI spans zero, so a routine data refresh will fail the build instead of
   updating the game. Nothing tests the stripe centre/half-range, the monthly rebasing, or the
   ratios the captions quote.
9. **Monthly series rebased with one annual constant** but labelled "vs 1850-1900 average".
   Leaves 0.179 °C of calendar-month structure. Harmless for the level's message (it explains 5%
   of variance in the window walked) but the label is not true month by month.
10. **The share card buries its own number.** "+0.6 °C" is 9% of the card's width and its
    second-smallest type, while the date range is the largest. The default (born 2000) has no
    blue in it at all, so it does not read as diverging stripes. Drawing the full 1850–2025 band
    with the lifetime bracketed inside it would carry the whole thesis in one image — and is the
    fix for the pedagogy objection that the game currently ends zoomed *in*.
11. **Stripe colours saturate for 9 of the last 11 years**, so 2016 (+1.28) and 2024 (+1.53) are
    the same pixel. Faithful to Hawkins and now disclosed, but a legend note or an unclipped
    strip would be honest.
12. Remaining smaller items: parallax layers sit below the ground line in every level and have
    1.09–1.33:1 separation; `shade()` is multiplicative so terrain lighting and dither collapse
    at the light end of the palette; `←`, `→` and `₂` fall outside both fonts' unicode-range and
    render in Courier; the hero's outline is 1.30:1 on the stripes he walks on and the 2-frame
    run cycle strobes at 14 Hz; the credits block still overflows into the touch band on a phone;
    `worldToScreen` allocates ~700 objects per frame.

---

## Rejected on re-check

- **"`sled.ts:28` has a physics bug; use `sqrt(1 + s*s)` in the denominator."** It is not a bug.
  `vx` is *horizontal* velocity with `y` slaved to the terrain, and the horizontal component of
  gravity on a slope is exactly `g·sinθ·cosθ = g·s/(1+s²)`. The proposed change would give
  horizontal acceleration → `g` on a vertical drop. The underlying observation stands — the
  modern cliff is 26px of a 3162px world and passes in a third of a second, so it does not feel
  fast — but that is level geometry, not arithmetic, and the formula was left alone.
- The claim that the mirror's "GCAG" column might not be HadCRUT5, already settled in v0.2.

## Not verifiable in this session

Left for a human or a later pass: whether the 20x magnifier factor should read 22.7x (the
magnifier is anisotropic, so a single number is arguably the wrong thing to state at all); the
Tierney netCDF latitude-axis assumption in `build_data.py:111`, since `scripts/raw/` is
gitignored and absent; the "Holocene varied by a few tenths of a degree" credit line, which has
no source and is in tension with Osman 2021's warming Holocene; and the parts that still need a device this
session did not have. v0.3.1 has since been playtested on desktop and plays through correctly
end to end, so the new caption dwells and the summer costume are confirmed to work in
practice; a real phone, the reduce-motion path and a screen-reader pass over the new text
panel remain untested.
