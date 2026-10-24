"use server";

import { fosterOfferSchema } from "@/lib/foster/offer-schema";

export type FosterResult = { ok: true; demo: true } | { ok: false; fields: string[] };

/** Validates server-side; stores nothing until the database exists (the UI says so). */
export async function submitFosterOffer(input: unknown): Promise<FosterResult> {
  const parsed = fosterOfferSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))] };
  return { ok: true, demo: true };
}
