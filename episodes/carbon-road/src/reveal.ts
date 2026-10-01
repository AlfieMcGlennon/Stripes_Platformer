import {
  CUMULATIVE, EMISSIONS, FIT, LAST_INDEX, LAST_YEAR, MAX_EMISSIONS, START_YEAR, TOTAL_EMITTED,
  WARMING,
} from "./data";
import { COLORS, Renderer, VIEW_W } from "./render";

/**
 * The four panels hung along the roadside at the end: the spiky flow, the running
 * total it built, temperature over the same years, then the two plotted against each
 * other. Walked past rather than shown.
 */
const PY = 52;
const PW = 300;
const PH = 120;
/** World pixels between one panel's left edge and the next's. */
export const PANEL_STEP = 340;
export const PANEL_COUNT = 4;

function plate(r: Renderer, x: number, y: number, w: number, h: number, label: string, right: string): void {
  r.rect(x - 1, y - 1, w + 2, h + 2, COLORS.shadow);
  r.rect(x, y, w, h, COLORS.plate);
  r.rect(x, y, w, 1, COLORS.plateEdge);
  r.rect(x, y + h - 1, w, 1, COLORS.plateEdge);
  r.text(label, x + 3, y + 2, { size: 8, color: COLORS.dim });
  if (right) r.text(right, x + w - 3, y + 2, { size: 8, color: COLORS.dim, align: "right" });
}

function series(
  r: Renderer, x: number, y: number, w: number, h: number,
  data: number[], min: number, max: number, color: string,
  kind: "bar" | "area" | "line", upTo: number,
): void {
  const ctx = r.px;
  const inner = w - 4;
  const xAt = (i: number) => x + 2 + (i / LAST_INDEX) * inner;
  const yAt = (v: number) => y + h - 4 - ((v - min) / (max - min)) * (h - 16);

  if (kind === "bar") {
    ctx.fillStyle = color;
    const bw = Math.max(1, inner / LAST_INDEX);
    for (let i = 0; i <= upTo; i++) {
      const top = yAt(data[i]);
      ctx.fillRect(Math.round(xAt(i)), Math.round(top), Math.ceil(bw), Math.max(1, Math.round(y + h - 4 - top)));
    }
    return;
  }

  if (kind === "area") {
    ctx.beginPath();
    ctx.moveTo(xAt(0), y + h - 4);
    for (let i = 0; i <= upTo; i++) ctx.lineTo(xAt(i), yAt(data[i]));
    ctx.lineTo(xAt(upTo), y + h - 4);
    ctx.closePath();
    ctx.fillStyle = "rgba(209,73,91,0.32)";
    ctx.fill();
  }

  ctx.beginPath();
  for (let i = 0; i <= upTo; i++) {
    const p: [number, number] = [xAt(i), yAt(data[i])];
    if (i === 0) ctx.moveTo(p[0], p[1]);
    else ctx.lineTo(p[0], p[1]);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function years(r: Renderer, x: number, y: number, w: number): void {
  r.text(String(START_YEAR), x, y, { size: 8, color: COLORS.dim });
  r.text(String(LAST_YEAR), x + w, y, { size: 8, color: COLORS.dim, align: "right" });
}

/**
 * One roadside panel, drawn in world space at `offsetX`.
 *
 * These were once steps of a full-screen reveal, which is why this began by clearing
 * the whole view. Hung along the road instead, that clear meant four calls in one
 * frame erased the road, the sky and each other, leaving only whichever panel was
 * drawn last -- and the fourth was never called at all, so the scatter, its fitted
 * slope and the "not TCRE" label on it had no way to reach the screen. A panel now
 * paints nothing it does not own.
 */
export function drawPanel(r: Renderer, id: number, offsetX: number): void {
  const x = Math.round(offsetX);
  if (x > VIEW_W + 8 || x + PW < -8) return;
  const last = LAST_INDEX;

  if (id === 1) {
    plate(r, x, PY, PW, PH, "EMITTED EACH YEAR", `peak ${MAX_EMISSIONS.toFixed(0)} Gt/yr`);
    series(r, x, PY, PW, PH, EMISSIONS, 0, MAX_EMISSIONS, COLORS.cold, "bar", last);
  } else if (id === 2) {
    plate(r, x, PY, PW, PH, "TOTAL EVER EMITTED", `${Math.round(TOTAL_EMITTED)} Gt`);
    series(r, x, PY, PW, PH, CUMULATIVE, 0, TOTAL_EMITTED, COLORS.hot, "area", last);
  } else if (id === 3) {
    plate(r, x, PY, PW, PH, "WARMING VS 1850-1900", `+${WARMING[last].toFixed(1)} °C`);
    series(r, x, PY, PW, PH, WARMING, -0.3, 1.6, COLORS.gold, "line", last);
  } else {
    drawScatter(r, x);
    return;
  }
  years(r, x + 2, PY + PH + 2, PW - 4);
}

/** Warming against the total that caused it: the two series as one relationship. */
function drawScatter(r: Renderer, x: number): void {
  plate(r, x, PY, PW, PH, "WARMING AGAINST TOTAL", "one dot = one year");
  const xAt = (v: number): number => x + 4 + (v / TOTAL_EMITTED) * (PW - 44);
  const yAt = (v: number): number => PY + PH - 5 - ((v + 0.3) / 1.9) * (PH - 20);
  const ctx = r.px;

  ctx.strokeStyle = "#4a5382";
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(xAt(0), yAt(FIT.intercept));
  ctx.lineTo(xAt(TOTAL_EMITTED), yAt(FIT.intercept + FIT.slope * TOTAL_EMITTED));
  ctx.stroke();
  ctx.setLineDash([]);

  for (let i = 0; i <= LAST_INDEX; i++) {
    const t = i / LAST_INDEX;
    r.rect(Math.round(xAt(CUMULATIVE[i])) - 1, Math.round(yAt(WARMING[i])) - 1, 2, 2,
      `rgb(${Math.round(67 + t * 142)},${Math.round(147 - t * 74)},${Math.round(195 - t * 104)})`);
  }

  r.text(`${(FIT.slope * 1000).toFixed(2)} °C per 1000 Gt`, x + PW - 4, PY + PH - 22, {
    size: 9, align: "right",
  });
  r.text(`r ${FIT.r.toFixed(2)}`, x + PW - 4, PY + PH - 12, { size: 8, color: COLORS.dim, align: "right" });
  r.text("0", x + 4, PY + PH + 2, { size: 8, color: COLORS.dim });
  r.text(`${Math.round(TOTAL_EMITTED)} Gt emitted`, x + PW - 4, PY + PH + 2, {
    size: 8, color: COLORS.dim, align: "right",
  });
  // The hedge belongs on the picture, not only in the credits.
  r.text("measured from these two series — not the IPCC's TCRE", x + PW / 2, PY - 10, {
    size: 8, color: COLORS.dim, align: "center",
  });
}
