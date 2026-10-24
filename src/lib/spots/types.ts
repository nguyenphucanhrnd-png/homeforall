// Network-map spots (prompt bundle §A). Mirrors the planned `spots` table.

export const SPOT_KINDS = ["rescue", "vet_hospital", "vet_clinic", "state_station", "foster_zone", "rescue_station"] as const;
export type SpotKind = (typeof SPOT_KINDS)[number];

/** Map layers (chips). Pilot zones are drawn as circles, not spots. */
export const LAYERS = ["rescue", "vet", "state", "foster", "pilot"] as const;
export type Layer = (typeof LAYERS)[number];

export function layerOf(kind: SpotKind): Exclude<Layer, "pilot"> {
  if (kind === "vet_hospital" || kind === "vet_clinic") return "vet";
  if (kind === "state_station") return "state";
  if (kind === "foster_zone") return "foster";
  return "rescue";
}

export type Spot = {
  id: string;
  kind: SpotKind;
  name: string;
  ward: string | null;
  ward_slug: string | null;
  legacy_area?: string | null;
  /** Vets and state stations only: rescue/foster/report locations never carry an address. */
  address_raw?: string | null;
  lat: number | null;
  lng: number | null;
  location_precision: "address" | "ward-approx" | "district" | null;
  geocode_status: string;
  needs_check?: boolean;
  /** "map" = dot on the map; "district" = district-level dot; "list-only"/"hidden" = side list only. */
  placement: "map" | "district" | "list-only" | "hidden";
  multi_branch?: boolean;
  count?: number;
  is_sample: boolean;
  is_real_org: boolean;
  accepts_reports: boolean;
  /** Only contacts found on the organisation's own page or Google Maps listing (with source). Never for vets. */
  contacts?: SpotContact[];
  public_url: string | null;
  source_urls: string[];
  retrieved_at: string;
  verified_at: string | null;
  note?: string | null;
};

export type SpotContact = { type: "phone" | "zalo" | "facebook" | "website"; value: string; source_url: string };

export const onMap = (s: Spot) => s.lat !== null && s.lng !== null && (s.placement === "map" || s.placement === "district");
