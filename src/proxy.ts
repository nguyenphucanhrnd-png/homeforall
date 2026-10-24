import createIntlMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { refreshSession } from "@/lib/supabase/proxy";

const intl = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const response = intl(request);
  return refreshSession(request, response);
}

export const config = {
  // Skip API routes, the auth callback, Next internals and any path with a file extension.
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
