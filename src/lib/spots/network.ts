import "server-only";
import type { NetworkItem } from "@/components/map/network-explorer";
import { getSpots, getWards } from "./repository";
import { layerOf, onMap } from "./types";

const PILOT_SLUGS = ["dien-hong", "phu-my", "thu-duc"];

/**
 * What the public network map may show. Never: found-animal reports, foster
 * homes or volunteers. Foster areas appear as ward-level counts only, and only
 * when the count is ≥ 3. Hidden rows (doubtful addresses) stay off the map and
 * appear in the side list without coordinates.
 */
export function networkItems(): NetworkItem[] {
  return getSpots()
    .spots.filter((s) => s.kind !== "foster_zone" || (s.count ?? 0) >= 3)
    .map((s) => {
      const placeOnMap = onMap(s);
      return {
        id: s.id,
        name: s.name,
        kind: s.kind,
        layer: layerOf(s.kind),
        ward: s.ward,
        area: s.legacy_area ?? null,
        // Only vets and state stations have a public business address.
        address: s.kind === "vet_hospital" || s.kind === "vet_clinic" || s.kind === "state_station" ? s.address_raw ?? null : null,
        lat: placeOnMap ? s.lat : null,
        lng: placeOnMap ? s.lng : null,
        precision: s.location_precision,
        isSample: s.is_sample,
        isRealOrg: s.is_real_org,
        count: s.kind === "foster_zone" ? s.count : undefined,
        multiBranch: s.multi_branch,
      };
    });
}

/** Pilot areas as circles (ward centroids; radius is indicative, not a boundary). */
export function pilotZones() {
  return getWards()
    .filter((w) => PILOT_SLUGS.includes(w.slug))
    .map((w) => ({ name: w.name, lat: w.centroid.lat, lng: w.centroid.lng, radius: 1100 }));
}
