// Shapes mirror the planned Postgres columns (prompt §9–10) so the demo source
// can be swapped for Supabase without touching the UI.

export const SPECIES = ["cat", "dog"] as const;
export const SEXES = ["male", "female"] as const;
export const AGE_RANGES = ["baby", "young", "adult", "senior"] as const;
export const SIZES = ["small", "medium", "large"] as const;
export const GOOD_WITH = ["kids", "cats", "dogs"] as const;
export const PET_STATUSES = [
  "draft",
  "available",
  "in_foster",
  "adoption_pending",
  "adopted",
  "paused",
  "withdrawn",
] as const;
export const HEALTH_EVENTS = ["checkup", "vaccine_core", "rabies", "deworming", "sterilization"] as const;
/** The four steps the profile's progress ring reports on. */
export const CORE_CARE = ["vaccine_core", "rabies", "deworming", "sterilization"] as const;

export type Species = (typeof SPECIES)[number];
export type Sex = (typeof SEXES)[number];
export type AgeRange = (typeof AGE_RANGES)[number];
export type Size = (typeof SIZES)[number];
export type GoodWith = (typeof GOOD_WITH)[number];
export type PetStatus = (typeof PET_STATUSES)[number];
export type HealthEventType = (typeof HEALTH_EVENTS)[number];

export type Localized = { vi: string; en: string };

export type HealthEvent = {
  type: HealthEventType;
  /** null = planned, not done yet */
  date: Date | null;
  clinic?: string;
};

/** Drives the placeholder illustration (no photos in demo data). */
export type PetLook = {
  coat: string;
  accent: string;
  pattern: "solid" | "tabby" | "patch" | "tuxedo";
  ears?: "pointy" | "floppy";
};

export type Partner = {
  slug: string;
  name: string;
  type: "rescue" | "vet" | "foster_network";
  ward: string;
  verifiedAt: Date;
  isDemo: boolean;
};

export type Pet = {
  code: string; // HFA-0001
  name: string;
  species: Species;
  sex: Sex;
  ageRange: AgeRange;
  size: Size;
  ward: string;
  temperament: Localized[];
  goodWith: GoodWith[];
  story: Localized;
  idealHome: Localized;
  status: PetStatus;
  publishedAt: Date;
  lastConfirmedAt: Date;
  partnerSlug: string;
  health: HealthEvent[];
  look: PetLook;
  /** Photo URLs (first = cover). Empty → the illustration is shown instead. */
  photos: string[];
  isDemo: boolean;
};

export const STALE_AFTER_DAYS = 14;
