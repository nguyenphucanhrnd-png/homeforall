import { z } from "zod";
import {
  AGE_RANGES,
  CORE_CARE,
  GOOD_WITH,
  SEXES,
  SIZES,
  SPECIES,
  STALE_AFTER_DAYS,
  type Pet,
  type PetStatus,
} from "./types";

const DAY = 86_400_000;

/** Statuses a public visitor can browse. */
export const LISTED_STATUSES: readonly PetStatus[] = ["available", "in_foster", "adoption_pending"];

const many = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]))
    .transform((list) => list.filter((x): x is T[number] => (values as readonly string[]).includes(x)));

const flag = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (Array.isArray(v) ? v[0] : v) === "1");

/** Every filter lives in the URL (deep-linkable, prompt §8). Unknown values are dropped, not errors. */
export const petFiltersSchema = z.object({
  species: many(SPECIES),
  ward: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v])),
  age: many(AGE_RANGES),
  size: many(SIZES),
  sex: many(SEXES),
  good: many(GOOD_WITH),
  vaccinated: flag,
  sterilized: flag,
  partner: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (Array.isArray(v) ? v[0] : v) || undefined),
  sort: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => ((Array.isArray(v) ? v[0] : v) === "newest" ? "newest" : "updated") as "newest" | "updated"),
});

export type PetFilters = z.output<typeof petFiltersSchema>;

export function parsePetFilters(params: Record<string, string | string[] | undefined>): PetFilters {
  return petFiltersSchema.parse(params);
}

export function countActiveFilters(f: PetFilters) {
  return (
    f.species.length +
    f.ward.length +
    f.age.length +
    f.size.length +
    f.sex.length +
    f.good.length +
    Number(f.vaccinated) +
    Number(f.sterilized) +
    Number(Boolean(f.partner))
  );
}

export function isDone(pet: Pet, type: Pet["health"][number]["type"]) {
  return pet.health.some((e) => e.type === type && e.date !== null);
}

export function isVaccinated(pet: Pet) {
  return isDone(pet, "vaccine_core") && isDone(pet, "rabies");
}

export function coreCareProgress(pet: Pet) {
  return { done: CORE_CARE.filter((t) => isDone(pet, t)).length, total: CORE_CARE.length };
}

export function isStale(pet: Pet, now: Date) {
  return now.getTime() - pet.lastConfirmedAt.getTime() > STALE_AFTER_DAYS * DAY;
}

function matches(pet: Pet, f: PetFilters) {
  const inList = <T,>(list: readonly T[], value: T) => list.length === 0 || list.includes(value);
  return (
    LISTED_STATUSES.includes(pet.status) &&
    inList(f.species, pet.species) &&
    inList(f.ward, pet.ward) &&
    inList(f.age, pet.ageRange) &&
    inList(f.size, pet.size) &&
    inList(f.sex, pet.sex) &&
    f.good.every((g) => pet.goodWith.includes(g)) &&
    (!f.vaccinated || isVaccinated(pet)) &&
    (!f.sterilized || isDone(pet, "sterilization")) &&
    (!f.partner || pet.partnerSlug === f.partner)
  );
}

/** Filters, then sorts; listings unconfirmed for 14+ days always rank below fresh ones (R5). */
export function filterPets(pets: readonly Pet[], f: PetFilters, now: Date): Pet[] {
  const key = f.sort === "newest" ? "publishedAt" : "lastConfirmedAt";
  return pets
    .filter((p) => matches(p, f))
    .sort((a, b) => {
      const stale = Number(isStale(a, now)) - Number(isStale(b, now));
      return stale !== 0 ? stale : b[key].getTime() - a[key].getTime();
    });
}
