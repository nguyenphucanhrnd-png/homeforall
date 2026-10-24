"use server";

import { redirect } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { safeNextPath } from "@/lib/auth/roles";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { magicLinkSchema } from "./schema";

export type MagicLinkResult = { ok: true } | { ok: false; error: "invalid" | "failed" | "not_configured" };

export async function sendMagicLink(input: unknown, next?: string): Promise<MagicLinkResult> {
  if (!isSupabaseConfigured) return { ok: false, error: "not_configured" };
  const parsed = magicLinkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const confirmUrl = new URL("/auth/confirm", publicEnv.NEXT_PUBLIC_SITE_URL);
  confirmUrl.searchParams.set("next", safeNextPath(next, "/dashboard"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: confirmUrl.toString(), shouldCreateUser: true },
  });

  // Same response whether or not the address already has an account.
  if (error) {
    console.error("[auth] signInWithOtp failed", error.status, error.code);
    return { ok: false, error: "failed" };
  }
  return { ok: true };
}

export async function signOut(locale: Locale) {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  const safe = routing.locales.includes(locale) ? locale : routing.defaultLocale;
  redirect(`/${safe}`);
}
