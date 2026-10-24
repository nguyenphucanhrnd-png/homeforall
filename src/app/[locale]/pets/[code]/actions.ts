"use server";

import { interestSchema } from "@/lib/pets/interest-schema";

export type InterestResult = { ok: true; demo: true } | { ok: false; fields: string[] };

/**
 * Validates server-side. Nothing is stored or sent while the database is
 * deferred: the UI says so explicitly ("Bản demo…"). M1-DB: insert into
 * `interests` and notify the partner; add Turnstile + rate limiting here.
 */
export async function submitInterest(input: unknown): Promise<InterestResult> {
  const parsed = interestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))] };
  }
  return { ok: true, demo: true };
}
