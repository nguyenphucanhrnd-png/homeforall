import type { Localized } from "./types";

// Pilot zones (prompt §1). Since 1 Jul 2025 HCMC has no district tier, so the
// ward is the location unit; `district` stays only for legacy addresses.
export const WARDS: ReadonlyArray<{ slug: string; label: Localized }> = [
  { slug: "dien-hong", label: { vi: "Phường Diên Hồng", en: "Diên Hồng Ward" } },
  { slug: "phu-my", label: { vi: "Phường Phú Mỹ", en: "Phú Mỹ Ward" } },
  { slug: "thu-duc", label: { vi: "Thủ Đức", en: "Thủ Đức" } },
];

export function wardLabel(slug: string, locale: keyof Localized) {
  return WARDS.find((w) => w.slug === slug)?.label[locale] ?? slug;
}
