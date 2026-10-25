import { UNKNOWN_WARD, wardBySlug } from "@/data/wards";
import type { Localized } from "./types";

// Display labels for a ward slug. The ward list itself lives in src/data/wards.ts
// (single source). Since 1 Jul 2025 HCMC has no district tier, so the ward is the
// location unit; `district` stays only for legacy addresses.

/** Pilot-zone slugs still used by non-pet sample data (volunteer tasks, partners). */
const LEGACY: Record<string, Localized> = {
  "dien-hong": { vi: "Phường Diên Hồng", en: "Diên Hồng Ward" },
  "thu-duc": { vi: "Thủ Đức", en: "Thủ Đức" },
};

export function wardLabel(slug: string, locale: keyof Localized) {
  const ward = wardBySlug(slug);
  if (ward) return locale === "vi" ? `Phường ${ward.name}` : `${ward.name} Ward`;
  if (LEGACY[slug]) return LEGACY[slug][locale];
  if (slug === UNKNOWN_WARD) return locale === "vi" ? "Chưa rõ khu vực" : "Area unknown";
  return slug;
}
