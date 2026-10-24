"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/pets", key: "adopt" },
  { href: "/foster", key: "fosterVolunteer" },
  { href: "/learn", key: "care" },
  { href: "/partners", key: "partners" },
  { href: "/about", key: "about" },
] as const;

export function NavLinks() {
  return <NavList pathname={usePathname()} />;
}

/** Static shell version (no active state) shown until the pathname is known. */
export function NavLinksFallback() {
  return <NavList pathname={null} />;
}

function NavList({ pathname }: { pathname: string | null }) {
  const t = useTranslations("nav");

  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 xl:flex-nowrap">
      {ITEMS.map(({ href, key }) => {
        const active = pathname !== null && (pathname === href || pathname.startsWith(`${href}/`));
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center font-semibold whitespace-nowrap text-ink no-underline decoration-2 underline-offset-8 hover:text-blue-600 hover:underline",
                active && "text-blue-600 underline",
              )}
            >
              {t(key)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
