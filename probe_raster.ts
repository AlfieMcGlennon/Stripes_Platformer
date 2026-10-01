/* A tiny software rasteriser for the subset of canvas2d that art.ts uses, so the
   vehicles can be "rendered" headlessly and measured. Records the LAST colour
   written per pixel, which is exactly what occlusion questions need. */
const W = 260, H = 160, OX = 20, OY = 120; // OY: pixel row of groundY/centreline

export class FakeCtx {
  fillStyle = "#000"; strokeStyle = "#000"; lineWidth = 1; lineCap = "butt"; globalAlpha = 1;
  grid: (string | null)[][] = Array.from({ length: H }, () => new Array<string | null>(W).fill(null));
  tag: (string | null)[][] = Array.from({ length: H }, () => new Array<string | null>(W).fill(null));
  current = "?";
  private subs: [number, number][][] = [];
  private cur: [number, number][] = [];

  private put(x: number, y: number, col: string): void {
    const px = Math.floor(x) + OX, py = Math.floor(y) + OY;
    if (px < 0 || px >= W || py < 0 || py >= H) return;
    // A translucent fill tints what is under it rather than hiding it, so for
    // occlusion questions it must not overwrite.
    if (this.globalAlpha < 0.9 && this.grid[py][px]) return;
    this.grid[py][px] = col; this.tag[py][px] = this.current;
  }
  beginPath(): void { this.subs = []; this.cur = []; }
  moveTo(x: number, y: number): void { if (this.cur.length > 1) this.subs.push(this.cur); this.cur = [[x, y]]; }
  lineTo(x: number, y: number): void { this.cur.push([x, y]); }
  closePath(): void { if (this.cur.length > 1) { this.cur.push([...this.cur[0]]); this.subs.push(this.cur); this.cur = [[...this.cur[0]]]; } }
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void {
    const [x0, y0] = this.cur.length ? this.cur[this.cur.length - 1] : [cx, cy];
    for (let i = 1; i <= 24; i++) { const t = i / 24, u = 1 - t;
      this.cur.push([u * u * x0 + 2 * u * t * cx + t * t * x, u * u * y0 + 2 * u * t * cy + t * t * y]); }
  }
  arc(cx: number, cy: number, r: number, a0: number, a1: number, ccw = false): void {
    let span = a1 - a0;
    if (!ccw) { while (span < 0) span += Math.PI * 2; } else { while (span > 0) span -= Math.PI * 2; }
    const n = Math.max(8, Math.ceil(Math.abs(span) / 0.15));
    for (let i = 0; i <= n; i++) { const a = a0 + (span * i) / n;
      this.cur.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, rot: number, a0: number, a1: number): void {
    let span = a1 - a0; while (span < 0) span += Math.PI * 2;
    const n = Math.max(12, Math.ceil(span / 0.12));
    for (let i = 0; i <= n; i++) { const a = a0 + (span * i) / n;
      const px = Math.cos(a) * rx, py = Math.sin(a) * ry;
      this.cur.push([cx + px * Math.cos(rot) - py * Math.sin(rot), cy + px * Math.sin(rot) + py * Math.cos(rot)]); }
  }
  private allSubs(): [number, number][][] {
    const s = [...this.subs]; if (this.cur.length > 1) s.push(this.cur); return s;
  }
  fill(): void {
    const polys = this.allSubs(); if (!polys.length) return;
    let minY = Infinity, maxY = -Infinity;
    for (const p of polys) for (const [, y] of p) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    for (let py = Math.floor(minY); py <= Math.ceil(maxY); py++) {
      const yc = py + 0.5; const xs: number[] = [];
      for (const p of polys) {
        const q = p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1] ? p : [...p, p[0]];
        for (let i = 0; i + 1 < q.length; i++) {
          const [ax, ay] = q[i], [bx, by] = q[i + 1];
          if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
        }
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2)
        for (let px = Math.floor(xs[i]); px <= Math.ceil(xs[i + 1]) - 1; px++) this.put(px, py, this.fillStyle);
    }
  }
  stroke(): void {
    const t = Math.max(1, Math.round(this.lineWidth));
    for (const p of this.allSubs())
      for (let i = 0; i + 1 < p.length; i++) {
        const [ax, ay] = p[i], [bx, by] = p[i + 1];
        const n = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2));
        for (let k = 0; k <= n; k++) {
          const x = ax + ((bx - ax) * k) / n, y = ay + ((by - ay) * k) / n;
          for (let dx = 0; dx < t; dx++) for (let dy = 0; dy < t; dy++)
            this.put(x - (t - 1) / 2 + dx, y - (t - 1) / 2 + dy, this.strokeStyle);
        }
      }
  }
  fillRect(x: number, y: number, w: number, h: number): void {
    for (let py = Math.floor(y); py < Math.ceil(y + h); py++)
      for (let px = Math.floor(x); px < Math.ceil(x + w); px++) this.put(px, py, this.fillStyle);
  }
  strokeRect(x: number, y: number, w: number, h: number): void {
    this.beginPath(); this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h);
    this.lineTo(x, y + h); this.closePath(); this.stroke();
  }
  bbox(): { x0: number; x1: number; y0: number; y1: number } {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) if (this.grid[py][px]) {
      x0 = Math.min(x0, px - OX); x1 = Math.max(x1, px - OX); y0 = Math.min(y0, py - OY); y1 = Math.max(y1, py - OY);
    }
    return { x0, x1, y0, y1 };
  }
  countTag(t: string): number {
    let n = 0; for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) if (this.tag[py][px] === t) n++;
    return n;
  }
  /** Topmost row (relative to groundY) holding a pixel with the given tag. */
  topOfTag(t: string): number {
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) if (this.tag[py][px] === t) return py - OY;
    return NaN;
  }
  /** For each column, topmost filled row (relative to groundY), excluding a tag. */
  topByColumn(exclude?: string): Map<number, number> {
    const m = new Map<number, number>();
    for (let px = 0; px < W; px++) for (let py = 0; py < H; py++) {
      if (this.grid[py][px] && this.tag[py][px] !== exclude) { m.set(px - OX, py - OY); break; }
    }
    return m;
  }
}
export { W, H, OX, OY };
