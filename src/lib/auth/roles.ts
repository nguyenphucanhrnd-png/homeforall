export const APP_ROLES = [
  "admin",
  "rescue_partner",
  "vet_partner",
  "foster",
  "volunteer",
  "adopter",
  "sponsor",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}

/** Where each role's dashboard lives. Order = which one opens first after login. */
const DASHBOARDS: ReadonlyArray<readonly [AppRole, string]> = [
  ["admin", "/admin"],
  ["rescue_partner", "/dashboard/rescue"],
  ["vet_partner", "/dashboard/vet"],
  ["foster", "/dashboard/foster"],
  ["volunteer", "/dashboard/foster"],
  ["sponsor", "/dashboard/sponsor"],
  ["adopter", "/dashboard/adopter"],
];

export function dashboardPathFor(roles: readonly AppRole[]): string {
  return DASHBOARDS.find(([role]) => roles.includes(role))?.[1] ?? "/dashboard/adopter";
}

export function dashboardRole(path: string): AppRole[] {
  return DASHBOARDS.filter(([, p]) => p === path).map(([role]) => role);
}

/** Only allow same-site relative redirects (blocks `//evil.com` and `https://…`). */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
