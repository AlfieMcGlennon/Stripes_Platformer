# Height Check (working title)

A small retro platformer about why climate trends are invisible day to day and unmissable when you zoom out. You measure your height every day and can't see yourself grow, walk month-to-month global temperatures, climb 176 years of the warming stripes, then slide back to the last ice age to see how fast today's warming is.

Every climate number in levels 1-5 is real (HadCRUT5, Tierney et al. 2020) and computed by
`scripts/build_data.py`. Level 0's ruler is invented, and says so on screen. A few deep-time
round numbers (the drawn onset of the deglaciation, "about 10,000 stable years") are drawn for
clarity rather than derived; the game's credits list every simplification.

```bash
npm install
npm run dev        # play at http://localhost:5173  (?level=0..4 to jump to a level)
npm test           # vitest: physics, terrain, "real data is jumpable"
npm run build      # static site in dist/

pip install -r scripts/requirements.txt
npm run data       # rebuild src/data/*.json from source
python -m pytest scripts/
```

Controls: ← → move, Space jump / continue. Touch: left edge = move, right half = jump.

Docs: `docs/DESIGN.md`, `docs/DATA_PLAN.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/MEMORY.md`.

Credits: HadCRUT5 (Met Office Hadley Centre / CRU, Open Government Licence), Tierney et al. 2020 (Nature), warming stripes concept by Ed Hawkins (showyourstripes.info, CC BY 4.0).
