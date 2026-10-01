# Decisions

### 2026-09-30 — Stack
**Decision:** Vite + TypeScript + Canvas 2D, no game framework; small and grown only if needed.
**Alternatives:** Phaser (as in Nimbus Valley).
**Reasoning:** Terrain is a 1D series, collision is trivial, zoom needs custom camera control anyway.
**Affects:** All code.

### 2026-09-30 — Data sources
**Decision:** Global temperatures throughout. ERA5 daily global anomalies (levels 0–2), HadCRUT5 monthly/annual 1850+ (levels 2–3), Tierney 2020 / Osman 2021 paleo (level 4). Rebased to 1850–1900.
**Alternatives:** Central England Temperature or a home station for daily noise; Berkeley Earth or NASA GISTEMP for the annual series.
**Reasoning:** One global story end to end; HadCRUT5 goes back to 1850 with an uncertainty ensemble. Local fallback kept if global daily data feels too smooth.
**Affects:** scripts/build_data.py, level 1–3 scale tuning, credits.

### 2026-09-30 — Repo
**Decision:** Separate repo from Nimbus Valley. Docs drafted in a scratchpad because the session's GitHub integration cannot create repos (403).
**Affects:** Needs a repo created by the user before scaffolding is committed.

### 2026-09-30 — Monthly instead of daily for level 1 (for now)
**Decision:** Level 1 uses HadCRUT5 monthly anomalies (1985–1994) rather than ERA5 daily.
**Alternatives:** Synthetic daily noise (rejected: an education game must not show invented climate data); wait for ERA5 access.
**Reasoning:** ERA5/Copernicus hosts were blocked in the build environment. Monthly global data is real and already clearly noisy. Window chosen to include Pinatubo (a named natural wiggle), not for its trend.
**Affects:** MonthsScene, DATA_PLAN. Reversible as a data-only change.

### 2026-09-30 — Straight-line deglaciation
**Decision:** Level 3 draws the ice-age exit as a straight line at the Tierney 2020 average rate over an assumed 10,000 years; Holocene drawn flat.
**Alternatives:** Osman 2021 LGMR curve (not reachable from the build network); Shakun 2012.
**Reasoning:** The message is rate, and an average-rate line is honest if labelled. Caveat is in the credits.
**Affects:** SlideScene, derived.deglacialRatePerCentury.

### 2026-09-30 — Anisotropic camera zoom on reveals
**Decision:** Camera has separate zoomX / zoomY; reveals fit the whole series like a chart.
**Alternatives:** Uniform zoom (176 years × 12 px at uniform zoom squashes a 1.4 °C rise into ~25 screen px, which kills the payoff).
**Reasoning:** A chart's axes are scaled independently; players read it as a chart.
**Affects:** camera.ts, revealCamera.

### 2026-09-30 — Stripe colour reference
**Decision:** Colours centred on the 1971–2000 mean, saturating at ±2.6σ of 1901–2000; numbers shown vs 1850–1900.
**Reasoning:** Matches the familiar showyourstripes look (verify exact method) while keeping text on the IPCC pre-industrial baseline.
**Affects:** palette.ts, build_data.py.

### 2026-09-30 — v0.2: zoom as the player's verb
**Decision:** Every reveal is driven by holding Z (touch: Z button); progress decays on release; auto-completes after 20 s.
**Alternatives:** Scripted camera tweens (v0.1).
**Reasoning:** Design review: the insight moment was a cutscene. Now the player performs the zoom-out themselves.
**Affects:** WalkScene zoom beat, all level endings.

### 2026-09-30 — Rate comparison as a range, plus a cause beat
**Decision:** Show 25–35x (deglaciation assumed 7,000–10,000 yrs) instead of 34x; add the IPCC AR6 "fastest 50-year warming in at least 2,000 years" line and one "why" caption.
**Reasoning:** Science review: a single integer overstated precision; without a cause, "ice ages ended naturally" invites the wrong conclusion.
**Affects:** build_data.py derived fields, SlideScene finale, credits.

### 2026-09-30 — Cherry-pick window chosen by search
**Decision:** build_data.py searches all 8-year windows since 1970 for the most negative trend (1979–1986) and the game says so.
**Alternatives:** The classic 1998–2012 "pause" — rejected: in HadCRUT5 it trends +0.12 °C/decade, so claiming it looks flat would be false.
**Affects:** CherryScene, derived.cherry.

### 2026-09-30 — Slide colours
**Decision:** While sledding, ground uses scenery colours (ice → tundra → grass → ochre); temperature colours (same scale as the stripes) are used for the thermometer and the reveal's 21 kyr stripes.
**Reasoning:** Stripe colours made the Holocene read as sea; the reveal needed the stripes look to make the modern sliver striking, plus a 20x magnifier.

### 2026-09-30 — Drop the 23–34x rate ratio; keep only the equal-window comparison
**Decision:** The finale now quotes "about 9–13x faster" over the same 175 years, as a range, and states IPCC AR6 SPM A.2.2 in its own beat, in AR6's wording, with "high confidence". The 23–34x figure (last 50 years vs the whole deglaciation) is gone.
**Reasoning:** Climate review: that ratio divided a 50-year OLS trend by a 6 °C change spread over 7,000–10,000 years, so most of it was a temporal-smoothing artefact rather than a difference in rate — demonstrable inside the instrumental record, where lengthening the window from 50 to 176 years alone cuts the apparent rate 3.1-fold. Placing AR6 immediately after it also read as IPCC endorsement of a 20,000-year rate comparison the IPCC deliberately does not make (AR6 stops at 2,000 years because proxies cannot resolve 50-year rates further back). The old credits line had the like-for-like claim backwards.
**Affects:** `slide.ts` raceCaption and finale beats, `credits.ts`, `story.ts`. `derived.rateRatioLow/High` are now unused by the game but left in the pipeline.

### 2026-09-30 — Extend the stripes palette downwards instead of compressing the ice age into it
**Decision:** `tempColor` ramps through six added darker blues below the stripes scale rather than squeezing the glacial range into the scale's remaining blue.
**Reasoning:** The stripes scale saturates at −0.13 °C, so the old mapping gave 6.06 °C of glacial cooling 10.5% of the palette against 89.5% for 1.53 °C of modern warming — 45x the compression. The ice age and the pre-industrial era came out the same blue in the one image whose purpose is to show how large natural change was. Found independently by the visual and climate reviews.
**Alternatives:** One linear axis across −6.5…+1.6 °C — rejected: it would change the modern stripes, which must stay identical to level 3 and to Hawkins' method.
**Affects:** `slideArt.ts` tempColor, `credits.ts` disclosure.

### 2026-09-30 — Two zeros, labelled as two zeros
**Decision:** Before 1850 the HUD reads "vs the last few thousand years"; from 1850 it reads "vs 1850-1900".
**Reasoning:** Tierney 2020's −6.06 °C is LGM minus the late Holocene (4–0 ka), not an anomaly against 1850-1900. Calling it "vs pre-industrial" asserted that the late Holocene sat exactly at the 1850-1900 mean, which the committed data cannot support, and the game contradicted itself about it 40 seconds apart.
**Affects:** `slide.ts` HUD and `pathValue` docs, `credits.ts`, `story.ts`. The offset itself is still unapplied — see REVIEW-v0.3.md.

### 2026-09-30 — Captions get a minimum dwell, and triggers queue behind them
**Decision:** `setCaption` records a hold of `0.35 + 0.3 x words` seconds; a positional trigger firing inside that window is queued rather than shown, and movement stops while a caption waits for acknowledgement.
**Reasoning:** Pedagogy review measured 12 of 17 timed captions being cut off mid-read at full walking speed, worst at 28%. The line that maps ground height to temperature — the only one in the game — got 41% of its reading time. Every wording fix is worthless until the words survive.
**Affects:** `scene.ts` update/setCaption/play.

### 2026-09-30 — Costume follows the trend, never a single year
**Decision:** The hero's raincoat becomes a jacket and then summer clothes based on the 30-year mean at the player's position, with thresholds derived from the stripes scale.
**Reasoning:** A costume that flipped on one warm year would teach "warm year = sunny day", which is precisely the confusion the game exists to undo. Keyed to the trend it reinforces the lesson instead.
**Alternatives:** Per-year costume (livelier, wrong); a dedicated summer sprite with a sun hat and shorts — still worth doing, but the palette swap needed no new geometry.
**Affects:** `sprites.ts`, `actors.ts`, `renderer.player`, `scenes/costume.ts`, `stripes.ts`, `slide.ts`.
**Superseded same day** by "Avatar is the player's, not a readout" below.

### 2026-09-30 — Lifetime warming as a decade difference, with a 30-year floor
**Decision:** "Your Stripes" reports the last decade's mean minus the first decade's, with a 95% error bar, and refuses to quote anything under 30 years.
**Reasoning:** The OLS version was not monotonic in age — a player born in 1930 was told they had lived through less warming (+1.09) than one born in 1960 (+1.20), because the fit crossed the 1940–70 plateau. And quoting a 15-year trend to one decimal, with no error, one level after proving a 7-year window worthless, was self-refuting. Thirty years is the WMO climate normal and a rule the player can reuse.
**Trade-off:** Players born after 1995 now get the rule instead of a personal number, so they are shown the whole-record figure instead. Reversible by lowering MIN_TREND_YEARS.
**Affects:** `yours.ts`.

### 2026-09-30 — Accessibility lives in an HTML panel, not on the canvas
**Decision:** A `<details>` panel holds the text version of the game plus text-size, reduce-motion and mute controls; captions are mirrored into an `aria-live` region; the canvas carries fallback content.
**Reasoning:** A canvas is opaque to assistive tech, and canvas text cannot respond to browser zoom at all — the view is fitted to the viewport, so page zoom leaves `cssW x dpr` invariant and the rendered size unchanged. Real HTML controls get keyboard, screen-reader and touch support for free, and the same markup doubles as the fallback that used to be a silent black page when boot failed.
**Affects:** `index.html`, `main.ts`, `story.ts`, `core/motion.ts`, `renderer.caption`.

### 2026-09-30 — Avatar is the player's, not a readout (supersedes the trend-keyed costume)
**Decision:** The hero's clothes never change on their own. Instead the title screen has a look
picker: skin tone, garment colour, and a plain/stripes outfit, persisted in `localStorage`.
**Reasoning:** Author's call on playing it. Even keyed to a 30-year mean rather than a single
year, the changing costume made the avatar into another temperature display, and the game already
carries temperature in step height, a signed number, the stripe colour and an audio pitch. The
avatar is the one thing on screen that should belong to the player. Cheaper cognitively too:
one fewer moving signal during the climb.
**Kept from the reverted version:** the palette-swap mechanism, which is what makes the picker
almost free — `drawSprite` takes a palette, plus an optional per-column shader for the stripes
outfit.
**Guard:** the stripes outfit is a fixed blue-to-red ramp across the sprite, not a data series, so
it cannot be misread as a measurement of anything.
**Affects:** `render/look.ts` (new), `sprites.ts`, `actors.ts`, `title.ts`; `scenes/costume.ts` deleted.

### 2026-09-30 — Monorepo with a shared engine
**Decision:** npm workspaces: `packages/engine` (`@stripes/engine`) plus `episodes/height-check` and
`episodes/carbon-road`, with one TypeScript project graph via project references.
**Reasoning:** Episode 2 had copied `color.ts`, `palette.ts`, `random.ts`, the hero sprite, the look
system and the whole dithered-sky/ridge builder out of episode 1 — two of them byte-identical. Any
fix to the renderer's text handling would have had to be made twice. The series brief called for this
before episode 2 got real, and it is now the boundary the codebase enforces.
**The boundary:** the engine takes anything two episodes would copy and nothing about any episode's
subject. Renderer, colour scale, sky, sprites, look, camera, small pure helpers in; terrain, scenes,
levels, vehicles, captions and data pipelines out. Episode 1's `Renderer` is a subclass that adds
only its own draw calls; episode 2 uses the engine's directly.
**Consequences:** `tsc --build` across the graph, one `npm run check`, and the deploy workflow now
assembles a landing page with both episodes under it. Also `emitDeclarationOnly`, because emitting
JS made vitest run every test twice — once from source, once from the compiled copy.
**Affects:** everything; no behaviour change. 32 vitest + 5 pytest unchanged, both episodes build.

### 2026-09-30 — Episodes differ, but not by much
**Decision:** Carbon Road stays visually a sibling of Height Check: the same dithered Bayer sky, the
same parallax ridge builder, the same starfield, the same terrain grain on its road, era skies mixed
from episode 1's own dusk/sunset palette, the same hero sprite reading the same saved look, and the
same caption box and outlined text via the engine.
**Reasoning:** Author's call on seeing it. The prototype had drifted into looking like a different
game — smooth gradient skies, its own colour tokens, a generic figure. A series earns recognition
from consistency; differentiation belongs in the *mechanic*, which is already completely different
(a driving walkthrough versus a platformer).
**Remaining deliberate difference:** episode 2 renders at 480x270 rather than 320x180, which is what
buys the vehicles enough room to be drawn with real curves instead of a character grid. That is the
one divergence left, and it is reversible in one constant if parity matters more than definition.
**Affects:** `episodes/carbon-road/src/backdrop.ts`, `render.ts`, `art.ts`.

### 2026-10-01 — A caption holds the walk still
**Decision:** `stepWalk` freezes movement while a caption is inside its minimum dwell. SPACE ends the
dwell early; releasing the key keeps the reader there indefinitely. Beats that belong to one place now
share that place's x so they queue, and the reader steps through them standing still.
**Reasoning:** The walk moved the reader regardless of caption state, so markers 1–2 degrees apart
(1.6s of walking) piled into `pending` behind dwells of up to 7s. Holding an arrow key outran the
script: the caption on screen described ground the reader had left ten seconds earlier. Forecaster was
worst — its per-place beats sat 32–46px apart, about half a second, so the whole episode was one rolling
backlog. That is the mechanism behind "forecaster is messy, no step throughs" and "loaded dice looks
rushed, fast and not clear at all". Episode 1 already stopped the player for its acknowledge beats and
said why in a comment; the extracted walk dropped that, and the three new episodes never had it.
**Consequences:** marker spacing is now a design constraint, guarded by tests in each episode: nothing
closer than about 0.65s of walking, measured against each episode's own speed. Dropped Forecaster's
lead-7 stop, which scored 0.06 one day from the horizon post's 0.04.
**Affects:** `packages/engine/src/walk.ts`, all three walking episodes' `main.ts`, new
`packages/engine/tests/walk.test.ts` (the walk had no tests at all).

### 2026-10-01 — Loaded Dice draws height as a root, not a count
**Decision:** `heightAt` returns `sqrt(count / peak) * MAX_H`. Disclosed on screen at the summit mark
and in the credits, with the exact counts always in the corner readout.
**Reasoning:** On a linear scale the drawing argued against the episode. 86px of frame went to a peak
of 384 days, so between the two periods the busy middle rose 10px while 28 degC — where the whole point
lives — rose 6px, from 5px to 11px. The eye reads that as "the middle changed more than the edge",
which is the opposite of the claim. At 32 degC the difference was literally zero pixels. The root scale
makes the same two changes 5px and 10px, the right way round, and it is the standard repair for a
histogram whose tails carry the argument. It is still a hill: 86px at the peak against 21px at 28 degC.
**Also fixed here:** the ghost of the pre-push ground only drew where the land *fell*, so it was
invisible across the whole hot tail, which is the only place the push matters. Ground gained is now a
gold wash — an area, not a one-pixel line inside a red fill. And the caption at the mean called it
"the top" while the summit sits at 17.5 degC: the reader was told they were at the peak while standing
eight pixels down a slope crested two degrees earlier. `Summary.mode` is now computed from the same
bins the terrain is drawn from, so the two cannot disagree again.
**Affects:** `episodes/loaded-dice/src/{land,script,data,main}.ts`, new `tests/land.test.ts`.

### 2026-10-01 — Carbon Road's era shares are a partition
**Decision:** `emittedDuring(from, until)` is half-open, and the three era captions use it.
**Reasoning:** `emittedBetween` is inclusive at both ends, so the four era spans each counted their
boundary year twice and the four shares printed as "of everything ever emitted" summed to 101%. They
now sum to exactly 100%: 3.7%, 6.4%, 18.9% and 70.9% since 1960. Found by the episode's first test.
**Affects:** `episodes/carbon-road/src/{data,chapters}.ts`, new `tests/road.test.ts` and a `test`
script, since episode 2 had neither.
