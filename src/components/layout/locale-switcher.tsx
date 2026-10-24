"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LABELS = { vi: "VI", en: "EN" } as const;
const NAMES = { vi: "Tiếng Việt", en: "English" } as const;

export function LocaleSwitcher() {
  return <Switcher pathname={usePathname()} />;
}

/** Static shell version: links to each locale's home until the pathname is known. */
export function LocaleSwitcherFallback() {
  return <Switcher pathname="/" />;
}

function Switcher({ pathname }: { pathname: string }) {
  const t = useTranslations("a11y");
  const current = useLocale();

  return (
    <nav aria-label={t("languageSwitch")}>
      <ul className="flex items-center rounded-sm border border-border bg-white p-0.5">
        {routing.locales.map((locale) => (
          <li key={locale}>
            <Link
              href={pathname}
              locale={locale}
              lang={locale}
              hrefLang={locale}
              aria-current={locale === current ? "true" : undefined}
              aria-label={NAMES[locale]}
              className={cn(
                "inline-flex min-h-10 min-w-11 items-center justify-center rounded-[10px] px-2 text-sm font-bold no-underline",
                locale === current ? "bg-blue-600 text-white" : "text-ink hover:bg-blue-100",
              )}
            >
              {LABELS[locale]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
