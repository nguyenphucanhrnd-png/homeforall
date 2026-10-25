import raw from "../../design-refs/data/wards-hcmc.json";

// The single list of HCMC wards used by the pet filter (design-refs/data/wards-hcmc.json:
// names exactly as the team wrote them, no district; "Tân Quy" and "Tân Quý" are two
// different wards, the second is `tan-quy-2`). Pets reference a ward by `slug`.

export type Ward = { slug: string; name: string };

/** Pets whose ward is not on the list (never dropped; shown as "area unknown"). */
export const UNKNOWN_WARD = "chua-ro";

const collator = new Intl.Collator("vi");

/** Alphabetical in Vietnamese order (Đ after D, tones handled). */
export const HCMC_WARDS: readonly Ward[] = [...(raw as Ward[])].sort((a, b) =>
  collator.compare(a.name, b.name),
);

export const WARD_SLUGS: ReadonlySet<string> = new Set(HCMC_WARDS.map((w) => w.slug));

const BY_SLUG = new Map(HCMC_WARDS.map((w) => [w.slug, w]));
export const wardBySlug = (slug: string) => BY_SLUG.get(slug);

/** Accent-insensitive search key: "Bình Trưng Đông" → "binh trung dong". */
export function foldVi(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/\s+/g, " ").trim();
}
