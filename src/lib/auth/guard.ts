import "server-only";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { AppRole } from "./roles";
import { getViewer, type Viewer } from "./viewer";

/** Redirects anonymous visitors to /login and brings them back afterwards. */
export async function requireViewer(locale: Locale, returnTo: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    return redirect({ href: { pathname: "/login", query: { next: `/${locale}${returnTo}` } }, locale });
  }
  return viewer;
}

export function hasAnyRole(viewer: Viewer, roles: readonly AppRole[]) {
  return roles.some((r) => viewer.roles.includes(r));
}
