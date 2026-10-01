import { FakeCtx } from "./probe_raster";
import { ART, type Rider } from "./episodes/carbon-road/src/art";
import { BUST_ROWS, HERO } from "@stripes/engine";
type Any = any;

const tagRider = (ctx: FakeCtx): Rider => (c, x, seatY, scale) => {
  const prev = ctx.current; ctx.current = "RIDER";
  const y = Math.round(seatY - BUST_ROWS * scale);
  for (let row = 0; row < BUST_ROWS; row++) for (let col = 0; col < HERO.stand[row].length; col++) {
    if (HERO.stand[row][col] === ".") continue;
    (ctx as Any).fillStyle = "H";
    ctx.fillRect(Math.round(x) + col * scale, y + row * scale, scale, scale);
  }
  ctx.current = prev;
};

const LEGEND: Record<string, string> = {};
function glyph(col: string): string {
  if (col === "H") return "@";
  if (!LEGEND[col]) LEGEND[col] = "abcdefghijklmnopqrstuvwxyz0123456789"[Object.keys(LEGEND).length] ?? "?";
  return LEGEND[col];
}

for (const id of ["cart", "loco", "car", "jet"] as const) {
  const ctx = new FakeCtx(); ctx.current = "V";
  ART[id].draw(ctx as Any, 0, 0, 1.0, tagRider(ctx));
  for (const k of Object.keys(LEGEND)) delete LEGEND[k];
  const bb = ctx.bbox();
  console.log(`\n======== ${id}  x ${bb.x0}..${bb.x1}  y ${bb.y0}..${bb.y1} (y is relative to the ground line / centreline; row 0 = ground)`);
  const rows: string[] = [];
  for (let y = bb.y0; y <= bb.y1; y++) {
    let line = "";
    for (let x = bb.x0; x <= bb.x1; x++) {
      const c = ctx.grid[y + 120][x + 20];
      line += c ? glyph(c) : ".";
    }
    rows.push(`${String(y).padStart(4)} ${line}`);
  }
  // print every row
  for (const r of rows) console.log(r);
}
