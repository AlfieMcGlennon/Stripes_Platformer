/**
 * Roadside furniture, placed in world space so it scrolls past at road speed.
 *
 * Slots sit every `SLOT` world pixels and what stands in one is hashed from its
 * index, so the roadside is stable as you drive rather than flickering. What kinds
 * of thing are available depends on the year: fences and mileposts all the way
 * through, telegraph poles once the wires arrive, streetlights and gantries later.
 *
 * Billboards advertise whatever was genuinely new that decade. These are dated
 * historical developments, not climate data, so they carry no numbers.
 */
export type PropKind = "milepost" | "billboard" | "pole" | "streetlight" | "fence";

export interface RoadProp {
  worldX: number;
  kind: PropKind;
  /** Billboard copy, or the year for a milepost. */
  label: string;
}

const SLOT = 132;

/** Real developments, with the decade they belong to. Not climate figures. */
const DEVELOPMENTS: { from: number; lines: string[] }[] = [
  { from: 1850, lines: ["RAILWAY", "GAS LIGHT", "PENNY POST"] },
  { from: 1880, lines: ["ELECTRIC LIGHT", "TELEPHONE", "STEEL WORKS"] },
  { from: 1900, lines: ["MOTOR CARS", "CINEMA", "AERODROME"] },
  { from: 1930, lines: ["RADIO", "NEW ESTATE", "FILLING STATION"] },
  { from: 1950, lines: ["TELEVISION", "SUPERMARKET", "JET SERVICE"] },
  { from: 1970, lines: ["MOTORWAY", "AIRPORT", "SHOPPING CENTRE"] },
  { from: 1995, lines: ["BROADBAND", "DATA CENTRE", "WIND FARM"] },
];

function hash(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

function developmentFor(year: number, k: number): string {
  const era = DEVELOPMENTS.filter((d) => d.from <= year).at(-1) ?? DEVELOPMENTS[0];
  return era.lines[Math.floor(hash(k * 5 + 3) * era.lines.length)];
}

/**
 * Props whose slots fall in the visible window. `year` decides what exists and
 * what the billboards say; `yearAt` maps a world x back to a year for mileposts.
 */
export function visibleProps(
  scroll: number, viewW: number, year: number, yearAt: (worldX: number) => number,
): RoadProp[] {
  const first = Math.floor((scroll - SLOT) / SLOT);
  const last = Math.ceil((scroll + viewW + SLOT) / SLOT);
  const out: RoadProp[] = [];
  for (let k = first; k <= last; k++) {
    const worldX = k * SLOT + Math.round(hash(k) * 40);
    const r = hash(k * 13 + 7);
    let kind: PropKind;
    if (r < 0.26) kind = "milepost";
    else if (r < 0.46) kind = "billboard";
    else if (r < 0.68) kind = year >= 1960 ? "streetlight" : year >= 1880 ? "pole" : "fence";
    else if (r < 0.84) kind = year >= 1910 ? "streetlight" : "fence";
    else kind = "fence";
    const label = kind === "milepost" ? String(Math.round(yearAt(worldX))) : developmentFor(year, k);
    out.push({ worldX, kind, label });
  }
  return out;
}
