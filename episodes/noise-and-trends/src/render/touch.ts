import { TOUCH_BUTTONS, type ButtonId } from "../core/layout";

/**
 * On-screen touch buttons with pixel-art arrows. Font glyphs like ◀ ▶ render
 * as colour emoji on iOS, so the icons are drawn as pixels instead.
 */
const ICONS: Record<ButtonId, string[]> = {
  left: ["...##", "..###", ".####", "#####", ".####", "..###", "...##"],
  right: ["##...", "###..", "####.", "#####", "####.", "###..", "##..."],
  jump: ["...#...", "..###..", ".#####.", "#######", "..###..", "..###..", "..###.."],
  zoom: [".###..", "#...#.", "#...#.", "#...#.", ".###..", "....##", ".....#"],
};

export function drawTouchButtons(ctx: CanvasRenderingContext2D, showZoom: boolean): void {
  for (const b of TOUCH_BUTTONS) {
    if (b.id === "zoom" && !showZoom) continue;
    // A solid dark plate with a light border. The old translucent white wash sat
    // at 1.01:1 over a near-white stripe, so during the stripes reveal -- which
    // fills all 180 rows with stripe colours -- the buttons simply vanished.
    const edge = b.id === "zoom" ? "#ffd166" : "#f2efe6";
    ctx.fillStyle = "rgba(5,6,13,0.72)";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = edge;
    ctx.fillRect(b.x, b.y, b.w, 1);
    ctx.fillRect(b.x, b.y + b.h - 1, b.w, 1);
    ctx.fillRect(b.x, b.y, 1, b.h);
    ctx.fillRect(b.x + b.w - 1, b.y, 1, b.h);
    const icon = ICONS[b.id];
    const scale = 2;
    const ox = Math.round(b.x + (b.w - icon[0].length * scale) / 2);
    const oy = Math.round(b.y + (b.h - icon.length * scale) / 2);
    ctx.fillStyle = edge;
    icon.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] === "#") ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    });
  }
}
