import { Menu } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { LogoLockup } from "@/components/brand/logo";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { AuthNav, LoginLink } from "./auth-nav";
import { Container } from "./container";
import { ReportLink } from "./emergency-link";
import { LocaleSwitcher, LocaleSwitcherFallback } from "./locale-switcher";
import { MobileMenuBehaviour } from "./mobile-menu";
import { NavLinks, NavLinksFallback } from "./nav-links";

/**
 * Wide (≥ 1280 px): one row, the report button first, before "Nhận nuôi".
 * Narrower: logo + report button + a native <details> menu, so the header
 * never causes horizontal scroll (the full row does not fit at 1024 px).
 * Only one copy of each control is ever displayed (the other is display:none).
 */
export async function SiteHeader({ locale }: { locale: Locale }) {
  const [a11y, nav, mobile] = await Promise.all([
    getTranslations({ locale, namespace: "a11y" }),
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "mobile" }),
  ]);

  // usePathname() is request data on dynamic routes (cacheComponents) → Suspense.
  const navLinks = (
    <Suspense fallback={<NavLinksFallback />}>
      <NavLinks />
    </Suspense>
  );
  const locales = (
    <Suspense fallback={<LocaleSwitcherFallback />}>
      <LocaleSwitcher />
    </Suspense>
  );
  const auth = (
    <Suspense fallback={<LoginLink label={nav("login")} />}>
      <AuthNav locale={locale} />
    </Suspense>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-cream-50/95 backdrop-blur-sm">
      <Container className="relative flex min-h-[72px] flex-nowrap items-center gap-x-4 py-2">
        <Link href="/" className="shrink-0 no-underline max-md:inline-flex max-md:min-h-11 max-md:min-w-11 max-md:items-center">
          <LogoLockup priority alt={a11y("homeLink")} className="max-sm:[&>img:last-child]:hidden" />
        </Link>

        <ReportLink locale={locale} className="ms-auto xl:ms-2" />

        <nav aria-label={a11y("mainNav")} className="me-auto hidden min-w-0 xl:block">
          {navLinks}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-2 xl:flex">
            {locales}
            {auth}
          </div>

          <details id="site-menu" className="group/menu xl:hidden">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md border border-border bg-white px-3 font-bold [&::-webkit-details-marker]:hidden">
              <Menu aria-hidden="true" className="size-5" />
              <span className="max-sm:sr-only">{nav("menu")}</span>
            </summary>
            <div
              data-menu-panel
              className="absolute inset-x-0 top-full space-y-4 border-b border-border bg-cream-50 px-6 py-5 shadow-lift max-md:h-[calc(100dvh-100%)] max-md:space-y-6 max-md:overflow-y-auto max-md:overscroll-contain max-md:px-4 max-md:pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            >
              <button
                type="button"
                data-menu-close
                className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-md border border-border bg-white font-bold md:hidden"
              >
                {mobile("menuClose")}
              </button>
              <nav aria-label={a11y("mainNav")}>{navLinks}</nav>
              <div className="flex flex-wrap items-center gap-3">
                {locales}
                {auth}
                {/* Phones: the landing's page index is portalled in here (story-shell). */}
                <div className="basis-full space-y-2 border-t border-border pt-4 md:hidden [&:not(:has(nav))]:hidden">
                  <p className="font-bold text-muted">{mobile("onThisPage")}</p>
                  <div id="menu-page-index" />
                </div>
              </div>
            </div>
          </details>
          <MobileMenuBehaviour id="site-menu" />
        </div>
      </Container>
    </header>
  );
}
