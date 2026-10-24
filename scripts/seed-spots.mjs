// Build the network-map spots (prompt bundle §A). Deterministic and idempotent.
//
//   npm run seed:spots                       # uses design-refs/data/wards.geocoded.json cache
//   node scripts/seed-spots.mjs --refresh    # re-query Nominatim for wards (≤ 1 req/s)
//
// Run scripts/geocode-vets.mjs first. Output (read by the app at build time):
//   src/data/spots.generated.json   src/data/wards.generated.json
//
// Privacy: rescue groups, foster zones, volunteers and reports never get a street
// address. Rescue/foster coordinates are a ward centroid (OSM) plus a seeded
// 300–600 m offset that stays inside the ward boundary.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { contains, haversine, mulberry32, normalizeVi, offset, parseCsv } from "../src/lib/geo/geo.ts";

const ROOT = process.cwd();
const WARDS_CACHE = join(ROOT, "design-refs/data/wards.geocoded.json");
const VETS_CACHE = join(ROOT, "design-refs/data/vet_clinics.geocoded.json");
const CSV = join(ROOT, "design-refs/data/vet_clinics.csv");
const OUT_DIR = join(ROOT, "src/data");
const UA = "HomeForAll-seed/0.1 (nonprofit animal-rescue pilot prototype, one-off ward lookup)";
const refresh = process.argv.includes("--refresh");

// Current ward names (2025 reorganisation). Unresolvable ones are dropped and reported.
const PILOT = ["Diên Hồng", "Phú Mỹ", "Thủ Đức"];
const OTHER_WARDS = [
  "Sài Gòn", "Bến Thành", "Tân Định", "Cầu Ông Lãnh", "Bàn Cờ", "Xuân Hòa", "Nhiêu Lộc", "Vườn Lài", "Hòa Hưng",
  "Chợ Lớn", "An Đông", "Chợ Quán", "Gia Định", "Bình Thạnh", "Thạnh Mỹ Tây", "Phú Nhuận", "Đức Nhuận", "Cầu Kiệu",
  "Tân Sơn Hòa", "Tân Sơn Nhất", "Bảy Hiền", "Tân Bình", "Gò Vấp", "Hạnh Thông", "An Nhơn", "An Khánh", "Bình Trưng",
  "Tân Thuận", "Tân Mỹ", "Tân Hưng", "Chánh Hưng", "Phú Thọ Hòa", "Tân Phú", "Hiệp Bình", "Linh Xuân", "Tăng Nhơn Phú",
];
const PLACES = { thaoDien: "Thảo Điền", phuMyHung: "Phú Mỹ Hưng" };

const slugify = (s) => normalizeVi(s).replace(/\s+/g, "-");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;
async function nominatim(params) {
  const wait = 1100 - (Date.now() - last);
  if (wait > 0) await sleep(wait);
  last = Date.now();
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ format: "jsonv2", addressdetails: "1", countrycodes: "vn", "accept-language": "vi", limit: "5", ...params })}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  return res.json();
}
const inHcmc = (r) => /ho chi minh/.test(normalizeVi([r.address?.city, r.address?.state, r.display_name].filter(Boolean).join(" ")));

async function lookupWard(name) {
  const hits = await nominatim({ q: `Phường ${name}, Thành phố Hồ Chí Minh, Việt Nam`, polygon_geojson: "1", polygon_threshold: "0.0003" });
  const want = normalizeVi(name);
  const hit = hits.find(
    (h) =>
      inHcmc(h) &&
      ["boundary", "place"].includes(h.category ?? h.class) &&
      normalizeVi(h.name ?? "").replace(/^phuong\s+/, "") === want &&
      ["Polygon", "MultiPolygon"].includes(h.geojson?.type),
  );
  if (!hit) return null;
  return {
    slug: slugify(name),
    name: `Phường ${name}`,
    centroid: { lat: +hit.lat, lng: +hit.lon },
    polygon: hit.geojson,
    osm: { type: hit.osm_type, id: hit.osm_id },
  };
}

async function lookupPlace(name) {
  const hits = await nominatim({ q: `${name}, Thành phố Hồ Chí Minh, Việt Nam` });
  const hit = hits.find(inHcmc);
  return hit ? { lat: +hit.lat, lng: +hit.lon, display: hit.display_name } : null;
}

// ─── 1. Ward shapes (cached) ──────────────────────────────────────────────────
let cache = !refresh && existsSync(WARDS_CACHE) ? JSON.parse(readFileSync(WARDS_CACHE, "utf8")) : null;
if (!cache) {
  cache = { geocoder: "Nominatim (© OpenStreetMap contributors, ODbL)", retrieved_at: new Date().toISOString().slice(0, 10), wards: {}, unresolved: [], places: {} };
  try {
    for (const w of [...PILOT, ...OTHER_WARDS]) {
      const r = await lookupWard(w);
      if (r) cache.wards[r.slug] = r;
      else cache.unresolved.push(w);
      process.stdout.write(r ? "." : "x");
    }
    for (const [key, name] of Object.entries(PLACES)) cache.places[key] = await lookupPlace(name);
  } catch (e) {
    console.error(`\nERROR: ${e.message}. Is nominatim.openstreetmap.org reachable from this network?`);
    process.exit(1);
  }
  writeFileSync(WARDS_CACHE, JSON.stringify(cache, null, 2) + "\n");
}
const wards = cache.wards;
const missingPilot = PILOT.filter((p) => !wards[slugify(p)]);
if (missingPilot.length) {
  console.error(`\nERROR: pilot ward(s) not resolvable on OSM: ${missingPilot.join(", ")}. Decide a fallback (district level) before seeding.`);
  process.exit(2);
}

// ─── 2. Deterministic sample spots (is_sample: internal flag, never rendered) ──
// 4 rescue points in each pilot ward + 1 in each of 16 other wards, so "the 3
// nearest rescue points" always returns 3 in the urban area. Named neutrally.
const rand = mulberry32(20261116);
function pointIn(ward) {
  for (let i = 0; i < 40; i++) {
    const p = offset(ward.centroid, 300 + rand() * 300, rand() * 360);
    if (!ward.polygon || contains(ward.polygon, p)) return p;
  }
  return ward.centroid; // small or oddly shaped ward: centroid, still ward-level
}
const round = (p) => ({ lat: Math.round(p.lat * 1e5) / 1e5, lng: Math.round(p.lng * 1e5) / 1e5 });
const others = Object.values(wards).filter((w) => !PILOT.map(slugify).includes(w.slug));
const base = { accepts_reports: false, public_url: null, verified_at: null, retrieved_at: cache.retrieved_at };
const spots = [];

let n = 0;
const shortName = (w) => w.name.replace(/^Phường\s+/, "");
const rescueWards = [...PILOT.flatMap((p) => Array(4).fill(slugify(p))), ...others.slice(0, 16).map((w) => w.slug)];
const perWard = {};
for (const slug of rescueWards) {
  n++;
  const w = wards[slug];
  perWard[slug] = (perWard[slug] ?? 0) + 1;
  spots.push({
    ...base,
    id: `rescue-sample-${String(n).padStart(2, "0")}`,
    kind: "rescue",
    name: `Điểm cứu hộ ${shortName(w)}${perWard[slug] > 1 ? ` ${perWard[slug]}` : ""}`,
    ward: w.name,
    ward_slug: w.slug,
    ...round(pointIn(w)),
    location_precision: "ward-approx",
    geocode_status: "ward_centroid_offset",
    placement: "map",
    accepts_reports: true, // sample groups: reports land in the partner-dashboard inbox
    is_sample: true,
    is_real_org: false,
    source_urls: [],
  });
}

const fosterWards = others.slice(16, 22).length >= 6 ? others.slice(16, 22) : others.slice(0, 6);
fosterWards.forEach((w, i) => {
  spots.push({
    ...base,
    id: `foster-sample-${i + 1}`,
    kind: "foster_zone",
    name: `Nơi nuôi tạm ${shortName(w)}`,
    ward: w.name,
    ward_slug: w.slug,
    ...round(w.centroid),
    count: 3 + Math.floor(rand() * 6), // ward-level count only; shown only if ≥ 3
    location_precision: "ward-approx",
    geocode_status: "ward_centroid",
    placement: "map",
    is_sample: true,
    is_real_org: false,
    source_urls: [],
  });
});

// ─── 3. Real public organisations (not contacted; accepts_reports = false) ───
const wardContaining = (p) => p && Object.values(wards).find((w) => w.polygon && contains(w.polygon, p));
const realOrgs = [];
const anKhanh = wards["an-khanh"];
const thaoDien = cache.places.thaoDien;
const pmh = cache.places.phuMyHung;
const vn = "https://vietnamnews.vn/life-style/expat-corner/1691114/cuddles-and-coffee-on-the-menu-at-a-pet-rescue-cafe.html";
const hive = "https://hivelife.com/vietnam-pet-adoption/";
if (anKhanh) realOrgs.push({ id: "real-wagwel", name: "WagWel Rescue", ward: anKhanh, near: anKhanh.centroid, sources: [vn] });
const tdWard = wardContaining(thaoDien) ?? anKhanh;
if (tdWard) {
  realOrgs.push({ id: "real-arc", name: "ARC Pet Rescue", ward: tdWard, near: thaoDien ?? tdWard.centroid, sources: [hive] });
  realOrgs.push({ id: "real-laws-for-paws", name: "Laws For Paws", ward: tdWard, near: thaoDien ?? tdWard.centroid, sources: [hive] });
}
const pmhWard = wardContaining(pmh);
if (pmhWard) realOrgs.push({ id: "real-rad7", name: "RAD7 (Rescue Animals in District 7)", ward: pmhWard, near: pmh, sources: [hive] });
for (const o of realOrgs) {
  const p = offset(o.near, 300 + rand() * 300, rand() * 360);
  spots.push({
    ...base,
    id: o.id,
    kind: "rescue",
    name: o.name,
    ward: o.ward.name,
    ward_slug: o.ward.slug,
    ...round(o.ward.polygon && !contains(o.ward.polygon, p) ? o.ward.centroid : p),
    location_precision: "ward-approx",
    geocode_status: "ward_level_public_org",
    placement: "map",
    is_sample: false,
    is_real_org: true,
    contacts: [], // only from the organisation's own page / Google Maps listing, with source_url
    source_urls: o.sources,
  });
}
// YDV Foundation: side list only, no dot (no confident ward).
spots.push({
  ...base,
  id: "real-ydv",
  kind: "rescue",
  name: "YDV Foundation",
  ward: null,
  ward_slug: null,
  lat: null,
  lng: null,
  location_precision: null,
  geocode_status: "list_only_public_org",
  placement: "list-only",
  is_sample: false,
  is_real_org: true,
  contacts: [],
  source_urls: [hive],
});

// ─── 4. Vets and state stations from the team's CSV (real, unverified) ───────
const csvRows = parseCsv(readFileSync(CSV, "utf8"));
const vetCache = existsSync(VETS_CACHE) ? JSON.parse(readFileSync(VETS_CACHE, "utf8")).rows : {};
for (const row of csvRows) {
  const g = vetCache[row.id];
  const ward = g?.lat ? wardContaining({ lat: g.lat, lng: g.lng }) : null;
  let placement = g?.placement === "hidden" ? "map" : (g?.placement ?? "list-only");
  // Doubtful rows (per the team's note) sit at ward level, never at the exact address.
  const doubtful = g?.doubtful ?? /doubtful|verify/i.test(row.note ?? "");
  let pos = g?.lat ? { lat: g.lat, lng: g.lng } : null;
  let precision = g?.precision ?? null;
  if (pos && doubtful && placement === "map") {
    if (ward) {
      pos = ward.centroid;
      precision = "ward-approx";
    } else {
      placement = "district";
      precision = "district";
    }
  }
  spots.push({
    ...base,
    id: `csv-${row.id}`,
    kind: row.kind,
    name: row.name,
    ward: ward?.name ?? g?.ward ?? null,
    ward_slug: ward?.slug ?? null,
    legacy_area: row.legacy_area || null,
    address_raw: row.address_raw || null,
    ...(pos && placement !== "list-only" ? round(pos) : { lat: null, lng: null }),
    location_precision: precision,
    geocode_status: g?.geocode_status ?? "not_geocoded",
    needs_check: g?.needs_check ?? true,
    placement,
    multi_branch: row.multi_branch === "yes",
    is_sample: false,
    is_real_org: true,
    contacts: [], // no phones/hours for vets (team list, unverified)
    source_urls: [],
    note: row.note || null,
  });
}

// ─── 4b. Spots that share a place get a small offset so each stays clickable ──
const seen = [];
for (const s of spots) {
  if (s.lat == null) continue;
  let k = 0;
  while (seen.some((p) => haversine(p, s) < 20)) {
    k++;
    Object.assign(s, round(offset({ lat: s.lat, lng: s.lng }, 30, (k * 137.5) % 360)));
  }
  seen.push({ lat: s.lat, lng: s.lng });
}

// ─── 5. Write ─────────────────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  join(OUT_DIR, "spots.generated.json"),
  JSON.stringify({ geocoder: cache.geocoder, retrieved_at: cache.retrieved_at, seed: 20261116, spots }, null, 1) + "\n",
);
writeFileSync(
  join(OUT_DIR, "wards.generated.json"),
  JSON.stringify(Object.values(wards).map(({ slug, name, centroid, polygon }) => ({ slug, name, centroid, polygon })), null, 0) + "\n",
);

// Report
const count = (f) => spots.filter(f).length;
console.log(`\nWards resolved: ${Object.keys(wards).length}; unresolved: ${cache.unresolved.join(", ") || "none"}`);
console.log(`Spots: ${spots.length} total · rescue sample ${count((s) => s.kind === "rescue" && !s.is_real_org)} · real orgs ${count((s) => s.kind === "rescue" && s.is_real_org)} · foster zones ${count((s) => s.kind === "foster_zone")} · vets/stations ${count((s) => s.id.startsWith("csv-"))} (on map: ${count((s) => s.id.startsWith("csv-") && s.placement !== "list-only" && s.placement !== "hidden")})`);
console.log(`RAD7 → ${pmhWard ? pmhWard.name : "NOT placed (Phú Mỹ Hưng not inside a resolved ward)"}${pmhWard && pmhWard.slug !== "phu-my" ? "  ⚠ not the pilot ward Phú Mỹ" : ""}`);
const byWard = spots.filter((s) => s.kind === "rescue").reduce((m, s) => ((m[s.ward] = (m[s.ward] ?? 0) + 1), m), {});
console.log(`Rescue spots by ward: ${JSON.stringify(byWard)}`);
const nearestCheck = haversine(spots[0], spots[1]);
if (!Number.isFinite(nearestCheck)) console.warn("WARN: unexpected coordinates");
