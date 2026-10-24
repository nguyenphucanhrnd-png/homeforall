import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv, type WardShape } from "@/lib/geo/geo";
import type { Spot, SpotKind } from "./types";

// Reads the seed output (scripts/seed-spots.mjs). Until the seed has run
// (geocoding needs network access to Nominatim), vets come straight from the
// team's CSV as list-only rows: never a guessed coordinate.

const ROOT = process.cwd();
const GENERATED = join(ROOT, "src/data/spots.generated.json");
const WARDS = join(ROOT, "src/data/wards.generated.json");
const CSV = join(ROOT, "design-refs/data/vet_clinics.csv");

export type SpotsData = { spots: Spot[]; seeded: boolean; retrievedAt: string | null; geocoder: string | null };

let memo: SpotsData | null = null;

export function getSpots(): SpotsData {
  if (memo) return memo;
  if (existsSync(GENERATED)) {
    const g = JSON.parse(readFileSync(GENERATED, "utf8"));
    memo = { spots: g.spots, seeded: true, retrievedAt: g.retrieved_at ?? null, geocoder: g.geocoder ?? null };
    return memo;
  }
  const rows = existsSync(CSV) ? parseCsv(readFileSync(CSV, "utf8")) : [];
  memo = {
    seeded: false,
    retrievedAt: null,
    geocoder: null,
    spots: rows.map((r) => ({
      id: `csv-${r.id}`,
      kind: r.kind as SpotKind,
      name: r.name,
      ward: null,
      ward_slug: null,
      legacy_area: r.legacy_area || null,
      address_raw: r.address_raw || null,
      lat: null,
      lng: null,
      location_precision: null,
      geocode_status: "not_geocoded",
      needs_check: true,
      placement: "list-only",
      multi_branch: r.multi_branch === "yes",
      is_sample: false,
      is_real_org: true,
      accepts_reports: false,
      public_url: null,
      source_urls: [],
      retrieved_at: "",
      verified_at: null,
      note: r.note || null,
    })),
  };
  return memo;
}

let wardsMemo: WardShape[] | null = null;
export function getWards(): WardShape[] {
  if (wardsMemo) return wardsMemo;
  wardsMemo = existsSync(WARDS) ? JSON.parse(readFileSync(WARDS, "utf8")) : [];
  return wardsMemo!;
}

/**
 * Spots a found-animal report may be sent to: rescue points that accept reports.
 * Real organisations are never contacted through the site (accepts_reports = false
 * until they agree), so today only the sample groups' dashboard inbox receives reports.
 */
export function reportTargets(): Spot[] {
  return getSpots().spots.filter((s) => s.kind === "rescue" && s.accepts_reports && !s.is_real_org && s.lat !== null);
}
