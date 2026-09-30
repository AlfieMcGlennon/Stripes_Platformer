# The Stripes Series

Small browser games that each make one climate idea physical. No frameworks, no game engine, no
accounts: a pixel canvas, a shared TypeScript engine, and a Python pipeline that turns published
climate datasets into the ground you walk on.

This is a communication project first. Climate is a subject where the evidence is settled and the
explanation still routinely fails to land, and where the usual formats — a chart, a paragraph, a
statistic — ask the reader to take the important step in their head. An interactive can make them
take it with their hands instead. In episode 1 you are not told that a single year means little;
you climb 176 of them one at a time, see nothing, and then step back. The argument arrives as an
experience rather than an assertion, which is a different channel to the one a graph uses, and it
reaches people a graph does not.

| | Episode | The one idea | The misconception it corrects |
|---|---|---|---|
| 1 | **Height Check** | A trend is a property of the long view, not of any one day or year. | "It was cold last winter, so warming isn't happening." |
| 2 | **Carbon Road** | Warming tracks the *total ever emitted*. Stopping is not undoing. | "If we cut emissions, temperatures go back down." |

## Why this form

Three things a playable version does that a chart cannot.

**It makes the reader do the work.** Noise is boring to read about and physical to walk over. The
step you cannot see the point of *is* the day that tells you nothing.

**It lets a mistake be survivable.** The cherry-pick level hands you a real claim people make
online, lets you walk the evidence and reach the wrong conclusion honestly, then asks for one more
step and flips it. Being briefly wrong on purpose is a better teacher than being told.

**It fits a different learning style.** The same content exists here in four registers — the
mechanic, the picture, the number, and a generated text version for anyone using a screen reader or
who would simply rather read. None is a translation of the others; each carries the argument on its
own terms.

## The directive

Four rules, applied to every episode, and the reason the codebase looks the way it does.

**One idea per episode, and the mechanic *is* the idea.** In episode 1 the ground height *is* the
temperature record, so a noisy decade is rough terrain and a trend is a hill you climb. Learning
the controls is learning the concept. Anything that does not serve the single idea gets cut.

**No invented climate data.** Every number on screen comes from `scripts/build_data.py`, computed
from a published dataset. The one illustrative exception — the ruler in episode 1's opening — is
labelled as made up, on screen, in the level where it appears.

**Every simplification is disclosed.** The credits screen names them: the deglaciation drawn as a
straight line at its average pace, the flat Holocene, the colour scale extended below its published
range, the two different zeros either side of 1850. A game that teaches people to distrust
cherry-picked evidence has to be auditable itself.

**Comparisons must be like-for-like.** Episode 1 originally compared a 50-year warming trend with a
6 °C change spread over 7,000–10,000 years and called the ratio 23–34×. Most of that ratio was a
smoothing artefact, not a difference in rate, so it was removed rather than reworded. What remains
compares equal spans and quotes a range.

## The result

- **Two playable episodes** from one engine: episode 1 finished and reviewed, episode 2 a
  working prototype. Both build to one site; Pages deployment is manual and has not been run yet.
- **32 unit tests and 5 data tests**, including a canary that fails the build if a data revision
  ever makes a step in the terrain too tall to jump.
- **Reproducible offline, for the instrumental record.** The official Met Office CSVs are committed
  under `data/source/` with provenance sidecars recording URL, retrieval date, SHA-256, CSV header
  and licence, and the pipeline reads those before it reaches the network. The paleo dataset
  (Tierney et al. 2020) is still fetched, so `paleo.json` alone is not yet offline-reproducible.
- **Verified against the source of record.** The committed series was checked value-by-value against
  the official Met Office files: largest difference across 176 years is 0.0001 °C.
- **Reviewed adversarially.** Five parallel reviews — visual design, pedagogy, climate science, game
  design, accessibility — are consolidated in [`docs/REVIEW-v0.3.md`](docs/REVIEW-v0.3.md), with the
  findings that survived verification separated from the one that did not.
- **Accessible** (episode 1). A generated text version of the whole game for screen readers,
  `prefers-reduced-motion` honoured, an in-game text-size control (canvas text cannot respond to
  browser zoom), and the colour scale checked under simulated protanopia, deuteranopia and
  tritanopia. Not yet tested with a real screen reader, which `docs/MEMORY.md` lists as outstanding.

## Layout

```
packages/engine/        Renderer, dithered skies, colour scale, sprites, saved look
episodes/height-check/  Episode 1: platformer on the temperature record
episodes/carbon-road/   Episode 2: walkthrough of cumulative emissions
scripts/                Python data pipeline and its tests
data/source/            Committed official CSVs, with provenance
docs/                   Design, decisions, data plan, review trail
web/                    The landing page the two episodes are published under
```

The engine holds what two episodes would otherwise copy: the pixel renderer and its text handling,
the warming-stripes colour scale, the dithered sky and parallax ridge builders, the hero sprite and
the look a player picks. It holds nothing about any episode's subject — terrain, levels, vehicles,
captions and data all stay with the episode that owns them.

Three details in the renderer are shared because each was a real bug fix: text gets an
eight-direction outline rather than a drop shadow (a diagonal shadow reads as a second copy of a
digit and fills the counters of `0 6 8 9`), glyph positions are rounded (fractional baselines blur
pixel fonts), and the scale is always an integer (a fractional scale doubles arbitrary pixel
columns).

## Running it

```bash
npm install
npm run dev          # episode 1 at http://localhost:5173
npm run dev:carbon   # episode 2 at http://localhost:5174

npm run check        # typecheck the whole graph, run every test, build both episodes
```

Add `?level=slide` (or `cherry`, `stripes`, `yours`) to episode 1's URL to jump to a level, or
`?y=1998` to go straight to the personal stripes card.

## Rebuilding the data

```bash
pip install -r scripts/requirements.txt
npm run data                     # rebuild episodes/height-check/src/data/*.json
python -m pytest scripts/        # sanity checks on the output
```

The pipeline prefers the committed CSVs in `data/source/`, falls back to `scripts/raw/`, and only
then reaches the network — so the numbers are reproducible without access to
metoffice.gov.uk, which some networks block. It warns loudly if it ever falls back to a mirror.

## How this was built

Built over a short period with heavy AI pair-programming; the commit trailers record it rather than
hiding it. What is mine is the direction and the calls: the retraction of the 23–34× figure, the
decision to revert a costume feature I had already shipped because it turned the avatar into a
second temperature readout, and pulling episode 2 back toward episode 1's visual language when it
drifted. `docs/DECISIONS.md` marks those entries "Author's call". Judging the output is the work
that does not delegate.

## Credits

HadCRUT5 (Met Office Hadley Centre / CRU, Open Government Licence v3; Morice et al. 2021) ·
Global Carbon Budget via Our World in Data · Tierney et al. 2020, *Nature* · IPCC AR6 WG1 ·
warming stripes concept by Ed Hawkins, [showyourstripes.info](https://showyourstripes.info)
(CC BY 4.0), rebuilt from the data rather than copied · ColorBrewer RdBu.
