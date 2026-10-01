import { CUMULATIVE, EMISSIONS, FIT, LAST_INDEX, MAX_EMISSIONS, TOTAL_EMITTED, WARMING } from "./data";
import { COLORS, Renderer, VIEW_W } from "./render";

/**
 * The zoom-out, inside the level. Four steps: the spiky flow, the smooth stock it
 * built, temperature over the same years, then all of it as one straight line.
 */
const BASE_PX = 40;
const PY = 48;
const PW = 400;
const PH = 138;

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
  r.text("1850", x, y, { size: 8, color: COLORS.dim });
  r.text("2024", x + w, y, { size: 8, color: COLORS.dim, align: "right" });
}

/** `step` is 1..4; `grow` is 0..1 for the draw-on animation. */
export function drawReveal(r: Renderer, step: number, grow: number, offsetX = 0): void {
  const PX = BASE_PX + offsetX;
  r.clear("#070a16");
  const upTo = Math.max(1, Math.round(LAST_INDEX * grow));

  if (step < 4) {
    const gap = 6;
    const ph = Math.floor((PH - gap * 2) / 3);
    plate(r, PX, PY, PW, ph, "EMITTED EACH YEAR", "43 Gt/yr");
    series(r, PX, PY, PW, ph, EMISSIONS, 0, MAX_EMISSIONS, COLORS.cold, "bar", upTo);

    if (step >= 2) {
      const y2 = PY + ph + gap;
      plate(r, PX, y2, PW, ph, "TOTAL STILL UP THERE", `${Math.round(TOTAL_EMITTED)} Gt`);
      series(r, PX, y2, PW, ph, CUMULATIVE, 0, TOTAL_EMITTED, COLORS.hot, "area", upTo);
    }
    if (step >= 3) {
      const y3 = PY + (ph + gap) * 2;
      plate(r, PX, y3, PW, ph, "WARMING VS 1850-1900", "+1.5 °C");
      series(r, PX, y3, PW, ph, WARMING, -0.3, 1.6, COLORS.gold, "line", upTo);
    }
    years(r, PX + 2, PY + PH + 2, PW - 4);
    return;
  }

  plate(r, PX, PY, PW, PH, "WARMING AGAINST TOTAL EMITTED", "one dot = one year");
  const xAt = (v: number) => PX + 4 + (v / TOTAL_EMITTED) * (PW - 40);
  const yAt = (v: number) => PY + PH - 5 - ((v + 0.3) / 1.9) * (PH - 18);
  const ctx = r.px;

  ctx.strokeStyle = "#4a5382";
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(xAt(0), yAt(FIT.intercept));
  ctx.lineTo(xAt(TOTAL_EMITTED), yAt(FIT.intercept + FIT.slope * TOTAL_EMITTED));
  ctx.stroke();
  ctx.setLineDash([]);

  for (let i = 0; i <= upTo; i++) {
    const t = i / LAST_INDEX;
    r.rect(xAt(CUMULATIVE[i]) - 1, yAt(WARMING[i]) - 1, 2, 2,
      `rgb(${Math.round(67 + t * 142)},${Math.round(147 - t * 74)},${Math.round(195 - t * 104)})`);
  }

  r.text(`${(FIT.slope * 1000).toFixed(2)} °C per 1000 Gt`, PX + PW - 4, PY + PH - 20, { size: 9, align: "right" });
  r.text(`r ${FIT.r.toFixed(2)}`, PX + PW - 4, PY + PH - 11, { size: 8, color: COLORS.dim, align: "right" });
  r.text("0", PX + 4, PY + PH + 2, { size: 8, color: COLORS.dim });
  r.text(`${Math.round(TOTAL_EMITTED)} Gt emitted`, PX + PW - 4, PY + PH + 2, { size: 8, color: COLORS.dim, align: "right" });
  r.text("not the IPCC's TCRE — measured from these two series", VIEW_W / 2, PY - 10, { size: 8, color: COLORS.dim, align: "center" });
}
