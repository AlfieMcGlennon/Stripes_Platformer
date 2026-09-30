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
