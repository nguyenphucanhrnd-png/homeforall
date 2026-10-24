import "server-only";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { connection } from "next/server";
import { buildDemoPartners, buildDemoPets } from "./demo-data";
import { filterPets, LISTED_STATUSES, type PetFilters } from "./filter";
import type { Partner, Pet } from "./types";

// Single seam between UI and data. Today: demo fixtures. Later: Supabase
// queries with the same signatures (the DB work was deferred on 2026-10-24).

// Demo photos supplied by the team (rights not verified, git-ignored): used only
// when present on disk, so a fresh checkout falls back to the illustrations.
const DEMO_PHOTOS = join(process.cwd(), "public/assets/demo-pets");
const demoPhoto = (code: string) =>
  existsSync(join(DEMO_PHOTOS, `${code}.webp`)) ? [`/assets/demo-pets/${code}.webp`] : [];

async function snapshot() {
  await connection(); // per request: "last confirmed" is relative to now
  const now = new Date();
  const pets = buildDemoPets(now).map((p) => ({ ...p, photos: demoPhoto(p.code) }));
  return { now, pets, partners: buildDemoPartners(now) };
}

export async function listPets(filters: PetFilters) {
  const { now, pets, partners } = await snapshot();
  return { now, pets: filterPets(pets, filters, now), partners };
}

export async function listPartners(): Promise<Partner[]> {
  return (await snapshot()).partners;
}

export async function getPet(code: string): Promise<{ now: Date; pet: Pet; partner: Partner } | null> {
  const { now, pets, partners } = await snapshot();
  const pet = pets.find((p) => p.code.toLowerCase() === code.toLowerCase());
  const partner = partners.find((o) => o.slug === pet?.partnerSlug);
  if (!pet || !partner || !LISTED_STATUSES.includes(pet.status)) return null;
  return { now, pet, partner };
}
