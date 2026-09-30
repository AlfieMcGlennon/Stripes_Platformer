# Committed source data

The official Met Office HadCRUT5 global summary series, committed so that **any** machine can
rebuild `src/data/*.json` reproducibly and offline.

| file | what it is |
|---|---|
| `hadcrut_annual.csv` | Annual global mean, with 2.5% / 97.5% confidence limits |
| `hadcrut_monthly.csv` | Monthly global mean, with the same confidence limits |
| `*.source.json` | URL, retrieval date, SHA-256, CSV header, licence and citation |

## Why these are in the repo

`scripts/build_data.py` reaches for `metoffice.gov.uk` first and falls back to a GitHub mirror
(`datasets/global-temp`). Two problems with relying on that at build time:

1. **metoffice.gov.uk is blocked on some networks**, including sandboxed CI and cloud sessions.
2. **The mirror carries only the central estimate.** It has no confidence limits at all, so the
   uncertainty band the game needs cannot be built from it.

`build_data.py` therefore checks this directory before `scripts/raw/` and before the network.

## Provenance and equivalence

Retrieved 2026-09-30. Checksums are in the sidecars.

These official files were compared value-by-value against the mirror-derived series previously
committed in `src/data/global.json`: across all 176 years the largest difference is **0.0001 °C**,
and every number the game's captions quote is identical to four decimal places (2025 anomaly
1.4054 either way; 2025 ranks 3rd either way). That is also a direct confirmation that the
mirror's "GCAG" column really is HadCRUT5 — previously established by reading the mirror's own
`process.py`, now established by the numbers agreeing.

So adopting these files does not change any figure shown in the game. It only makes the
uncertainty band available.

## Refreshing

Replace the CSV, then update its `.source.json` (URL, `retrieved`, `sha256`, `header`). Note that
the annual file includes the current, incomplete year — the 2026-09-30 copy runs to 2026 with
only seven months of it. `complete_years()` in `build_data.py` filters those out, so the last
year in the game stays the last *complete* one.

## Licence

HadCRUT5 is © Crown Copyright, Met Office, released under the
[Open Government Licence v3](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/),
which permits redistribution with attribution. Cite Morice et al. (2021), JGR Atmospheres,
doi:10.1029/2019JD032361.
