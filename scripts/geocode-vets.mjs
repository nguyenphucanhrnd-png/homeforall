// Geocode the team's vet list ONCE with Nominatim (OpenStreetMap) and cache it.
//
//   node scripts/geocode-vets.mjs            # uses cache, only asks for missing rows
//   node scripts/geocode-vets.mjs --refresh  # re-query everything
//
// Input : design-refs/data/vet_clinics.csv (never modified)
// Output: design-refs/data/vet_clinics.geocoded.json
//
// Nominatim usage policy: ≤ 1 request/s, a descriptive User-Agent, results cached,
// never called at runtime. A result is accepted only if it is inside Ho Chi Minh
// City AND matches the street; otherwise the row falls back silently to its old
// district (legacy_area, also from Nominatim) with needs_check, or stays list-only.
// Rows flagged doubtful in `note` are snapped to ward level by the seed script.
// Coordinates are never guessed.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeVi, parseCsv, streetOf } from "../src/lib/geo/geo.ts";

const ROOT = process.cwd();
const CSV = join(ROOT, "design-refs/data/vet_clinics.csv");
const OUT = join(ROOT, "design-refs/data/vet_clinics.geocoded.json");
const UA = "HomeForAll-seed/0.1 (nonprofit animal-rescue pilot prototype, one-off geocoding of public clinic addresses)";
const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const refresh = process.argv.includes("--refresh");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;
async function nominatim(params) {
  const wait = 1100 - (Date.now() - last);
  if (wait > 0) await sleep(wait);
  last = Date.now();
  const url = `${ENDPOINT}?${new URLSearchParams({ format: "jsonv2", addressdetails: "1", countrycodes: "vn", "accept-language": "vi", limit: "5", ...params })}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`Nominatim ${res.status} for ${params.q}`);
  return res.json();
}

const inHcmc = (r) => /ho chi minh/.test(normalizeVi([r.address?.city, r.address?.state, r.display_name].filter(Boolean).join(" ")));
const wardOf = (r) => r.address?.suburb ?? r.address?.quarter ?? r.address?.city_district ?? r.address?.village ?? r.address?.town ?? null;

/** Pick the street the address is really on ("Khu phố X, <street>" → second part). */
function streetCandidate(address) {
  const parts = address.split(",").map((s) => s.trim());
  const first = normalizeVi(parts[0]);
  if (/^khu pho\b/.test(first) && parts[1]) return streetOf(parts[1]);
  return streetOf(parts[0]);
}

// District-level fallback (one lookup per legacy_area, cached for the run).
const districts = new Map();
async function districtOf(area) {
  if (!area) return null;
  if (!districts.has(area)) {
    const hits = (await nominatim({ q: `${area}, Thành phố Hồ Chí Minh, Việt Nam` })).filter(inHcmc);
    districts.set(area, hits[0] ? { lat: +hits[0].lat, lng: +hits[0].lon, display: hits[0].display_name } : null);
  }
  return districts.get(area);
}

async function geocodeRow(row) {
  const base = { id: row.id, name: row.name, kind: row.kind, address_raw: row.address_raw, legacy_area: row.legacy_area, note: row.note };
  const doubtful = /doubtful|verify/i.test(row.note);

  if (row.multi_branch === "yes") return { ...base, placement: "list-only", reason: "multi-branch chain" };
  if (!row.address_raw) {
    if (/thu duc/.test(normalizeVi(row.legacy_area))) {
      const hits = (await nominatim({ q: "Thủ Đức, Thành phố Hồ Chí Minh, Việt Nam" })).filter(inHcmc);
      const h = hits[0];
      return h
        ? { ...base, placement: "district", lat: +h.lat, lng: +h.lon, ward: null, precision: "district", geocode_status: "district_only", needs_check: true, osm: { type: h.osm_type, id: h.osm_id, display: h.display_name } }
        : { ...base, placement: "list-only", reason: "district not found" };
    }
    return { ...base, placement: "list-only", reason: "no address" };
  }

  const street = streetCandidate(row.address_raw);
  const q = `${row.address_raw}, Hồ Chí Minh, Việt Nam`;
  const hits = await nominatim({ q });
  const match = hits.find((h) => inHcmc(h) && street.length > 2 && normalizeVi(`${h.address?.road ?? ""} ${h.display_name}`).includes(street));

  if (match) {
    const houseMatches = Boolean(match.address?.house_number);
    return {
      ...base,
      placement: "map",
      doubtful,
      lat: +match.lat,
      lng: +match.lon,
      ward: wardOf(match),
      precision: "address",
      geocode_status: houseMatches ? "house_match" : "street_match",
      needs_check: doubtful || !houseMatches,
      osm: { type: match.osm_type, id: match.osm_id, display: match.display_name },
      query: q,
    };
  }

  // No street match: never guess the street. Fall back to the district, flagged for a human.
  const d = await districtOf(row.legacy_area);
  if (d) {
    return {
      ...base,
      placement: "district",
      lat: d.lat,
      lng: d.lng,
      ward: null,
      precision: "district",
      geocode_status: hits.length ? "no_street_match_district" : "not_found_district",
      needs_check: true,
      candidates: hits.slice(0, 3).map((h) => h.display_name),
      query: q,
    };
  }
  return {
    ...base,
    placement: "list-only",
    precision: null,
    geocode_status: hits.length ? "no_street_match" : "not_found",
    needs_check: true,
    candidates: hits.slice(0, 3).map((h) => h.display_name),
    query: q,
  };
}

const rows = parseCsv(readFileSync(CSV, "utf8"));
const cache = !refresh && existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { rows: {} };
const out = {
  source: "design-refs/data/vet_clinics.csv",
  geocoder: "Nominatim (© OpenStreetMap contributors, ODbL)",
  retrieved_at: cache.retrieved_at ?? new Date().toISOString().slice(0, 10),
  rows: {},
};

for (const row of rows) {
  if (cache.rows?.[row.id] && cache.rows[row.id].address_raw === row.address_raw) {
    out.rows[row.id] = cache.rows[row.id];
    continue;
  }
  try {
    out.rows[row.id] = await geocodeRow(row);
    process.stdout.write(".");
  } catch (e) {
    console.error(`\nERROR on row ${row.id}: ${e.message}\n(Is nominatim.openstreetmap.org reachable from this network?)`);
    writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
    process.exit(1);
  }
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");

const all = Object.values(out.rows);
const by = (k) => all.reduce((m, r) => ((m[r[k] ?? "-"] = (m[r[k] ?? "-"] ?? 0) + 1), m), {});
console.log(`\nPlacement: ${JSON.stringify(by("placement"))}  Status: ${JSON.stringify(by("geocode_status"))}`);
const flagged = all.filter((r) => r.needs_check || r.placement !== "map");
console.log(`\nRows needing a human check (${flagged.length}):`);
for (const r of flagged) console.log(`  #${r.id} ${r.name} | ${r.address_raw || "(no address)"} → ${r.placement}${r.geocode_status ? ` / ${r.geocode_status}` : ""}${r.reason ? ` (${r.reason})` : ""}`);
