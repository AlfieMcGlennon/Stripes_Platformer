# Loaded Dice needs rebuilding

Episode 3 shipped unclear. Playtest verdict, unprompted: *"I do not get the loaded
dice, it looks rushed, fast and not clear at all."* That is the correct reading, and
the fault is structural rather than a matter of tuning.

## The structural error

**Episode 1's best property is that you walk the data at your own pace.** You climb
176 years one step at a time, and you stop when you want to. The pace is yours,
which is why a step you cannot see the point of lands as *the day that tells you
nothing* rather than as clutter.

Loaded Dice took that away. The data rains down at a rate the player cannot change.
Nothing in the design lets them dwell on a single day, so the sentence the whole
episode rests on — *one tile is one real summer day* — is never demonstrable.

Measured from the code as shipped:

| | |
|---|---|
| tiles per round | 394 |
| round length | 39 s, one tile every 0.10 s |
| a tile is airborne | 1.04 s (96 px at 92 px/s) |
| tiles on screen at once | ~10 |
| tile size | 3 px cool, 5 px hot, on a 320×180 view |

Ten 3-pixel objects, each on screen for a second, for thirty-nine seconds. That is
not a distribution being drawn; it is static.

## Everything else that is wrong, in order

1. **No onboarding.** It opens straight into the rain. There is no moment that
   teaches "a tile's horizontal position is its temperature", which is the only
   thing a player must understand for any of it to work. Episode 1 spends a whole
   level teaching its metaphor before using it.
2. **The shade is unexplained and unmotivated.** What it represents (a fixed
   capacity to cope with heat) is never said, so moving it feels arbitrary.
   Blocking a hot day has no legible consequence either way.
3. **Two visualisations share one space.** The histogram builds *behind* the falling
   tiles, so both read as noise.
4. **The rounds look identical.** At that speed the difference between 1.7 and 3.0
   hot days a summer is invisible — and that difference is the entire episode.
5. **No anchor for "hot".** The threshold arrives as a thin dashed line with a 7px
   label, rather than as something established before it matters.
6. **Nothing is ever still.** No beat holds. Episode 1 earns its reveals with a
   three-second silence; this has none.

## What a rebuild should do

- **Give the pace back.** The player scrubs or walks through the years; nothing
  moves unless they move it.
- **One day first.** Show a single real day, large, with its date and temperature,
  and let them place it on the axis themselves. Then ten. Then a summer. Then thirty.
- **Separate the two pictures.** Falling days, or a histogram — not both at once.
- **Make the comparison a single gesture.** A toggle or a slider between the two
  normals, so the player flips between them and sees the tail change, rather than
  playing two rounds forty seconds apart and being told they differed.
- **Keep the numbers.** The statistics are sound and verified; the tests assert the
  shape of the claim rather than its digits. Nothing in `data.ts` or `script.ts`
  needs redoing. This is a presentation rebuild, not a data one.

## Status

Not linked from the landing page as a finished episode. `data.ts`, `script.ts` and
the tests stand; `main.ts` and `curve.ts` are what need rethinking.
