// Pure geo helpers shared by the seed scripts (Node, type-stripped) and the app.
// No imports, no path aliases: scripts import this file directly.

export type LatLng = { lat: number; lng: number };
export type Ring = Array<[number, number]>; // [lng, lat] (GeoJSON order)
export type Polygonal = { type: "Polygon"; coordinates: Ring[] } | { type: "MultiPolygon"; coordinates: Ring[][] };

const R = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Move a point by `metres` towards `bearing` (degrees from north). */
export function offset(p: LatLng, metres: number, bearing: number): LatLng {
  const d = metres / R;
  const b = rad(bearing);
  const lat1 = rad(p.lat);
  const lng1 = rad(p.lng);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b));
  const lng2 = lng1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

/** Distance bands shown to people: never an exact distance (privacy). */
export const DISTANCE_BANDS = [
  { max: 1000, key: "lt1" },
  { max: 2000, key: "1to2" },
  { max: 4000, key: "2to4" },
  { max: 8000, key: "4to8" },
  { max: Infinity, key: "gt8" },
] as const;
export type DistanceBand = (typeof DISTANCE_BANDS)[number]["key"];

export function distanceBand(metres: number): DistanceBand {
  return DISTANCE_BANDS.find((b) => metres < b.max)!.key;
}

/** k nearest items to a point (stable for ties by id). */
export function nearest<T extends LatLng & { id: string }>(items: readonly T[], p: LatLng, k: number) {
  return items
    .map((it) => ({ item: it, metres: haversine(p, it) }))
    .sort((a, b) => a.metres - b.metres || a.item.id.localeCompare(b.item.id))
    .slice(0, k);
}

function inRing(p: LatLng, ring: Ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p.lat !== yj > p.lat && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Point-in-polygon for GeoJSON Polygon / MultiPolygon (holes respected). */
export function contains(poly: Polygonal, p: LatLng): boolean {
  const polys = poly.type === "Polygon" ? [poly.coordinates] : poly.coordinates;
  return polys.some(([outer, ...holes]) => inRing(p, outer) && !holes.some((h) => inRing(p, h)));
}

export type WardShape = { slug: string; name: string; centroid: LatLng; polygon?: Polygonal };

/**
 * Resolve the ward locally (no third-party geocoder at runtime): polygon first,
 * else the nearest ward centroid within `maxApproxMetres`, flagged approximate.
 */
export function resolveWard(p: LatLng, wards: readonly WardShape[], maxApproxMetres = 3000) {
  const hit = wards.find((w) => w.polygon && contains(w.polygon, p));
  if (hit) return { ward: hit, approximate: false as const };
  const best = wards
    .map((w) => ({ w, m: haversine(p, w.centroid) }))
    .sort((a, b) => a.m - b.m)[0];
  return best && best.m <= maxApproxMetres ? { ward: best.w, approximate: true as const } : null;
}

/** Deterministic PRNG (mulberry32) for reproducible demo seeds. */
export function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Lowercase, strip Vietnamese diacritics (đ → d) and punctuation, collapse spaces. */
export function normalizeVi(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * The street part of a Vietnamese address: drops house numbers, "Đường", ward/
 * district suffixes after a comma. "27 Đường số 1, KDC Tân Phong" → "so 1".
 */
export function streetOf(address: string): string {
  const tokens = normalizeVi(address.split(",")[0]).split(" ");
  // Leading house-number tokens ("38 40 42", "u50", "161 5a") all contain a digit.
  while (tokens.length > 1 && /\d/.test(tokens[0])) tokens.shift();
  // "hem 204 …" (alley number) is part of the address, not the street name.
  if (tokens[0] === "hem") {
    tokens.shift();
    while (tokens.length > 1 && /\d/.test(tokens[0])) tokens.shift();
  }
  if (tokens[0] === "duong" || tokens[0] === "pho") tokens.shift();
  return tokens.join(" ").trim();
}

/** Simple RFC-4180 CSV parser (quotes, commas, BOM, CRLF). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    if (row.some((x) => x !== "")) rows.push(row);
  }
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}
