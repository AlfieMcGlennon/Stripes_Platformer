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
    ctx.fillStyle = b.id === "zoom" ? "rgba(255,209,102,0.28)" : "rgba(255,255,255,0.12)";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    const icon = ICONS[b.id];
    const scale = 2;
    const ox = Math.round(b.x + (b.w - icon[0].length * scale) / 2);
    const oy = Math.round(b.y + (b.h - icon.length * scale) / 2);
    ctx.fillStyle = b.id === "zoom" ? "#ffd166" : "rgba(242,239,230,0.75)";
    icon.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] === "#") ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    });
  }
}
