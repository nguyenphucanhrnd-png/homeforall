import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseCredentials } from "@/lib/env";

/**
 * Refreshes the auth session cookie on the given response.
 * Skipped for anonymous visitors so browsing stays cheap and cacheable.
 */
export async function refreshSession(request: NextRequest, response: NextResponse) {
  if (!isSupabaseConfigured) return response;
  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  if (!hasAuthCookie) return response;

  const { url, key } = supabaseCredentials();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getClaims() validates the JWT; do not trust getSession() on the server.
  await supabase.auth.getClaims();
  return response;
}
