import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { safeNextPath } from "@/lib/auth/roles";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/** Magic-link landing. Handles both the PKCE `code` and the `token_hash` email template. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"), "/dashboard");
  const failure = NextResponse.redirect(new URL(`/${routing.defaultLocale}/login?error=link`, origin));
  if (!isSupabaseConfigured) return failure;

  const supabase = await createClient();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing token") };

  if (error) return failure;
  return NextResponse.redirect(new URL(next, origin));
}
