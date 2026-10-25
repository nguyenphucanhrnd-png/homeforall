import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Baloo_2, Nunito } from "next/font/google";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FanhChat } from "@/components/fanh/fanh-chat";
import { RouteFocus } from "@/components/layout/route-focus";
import { MobileCtaBar } from "@/components/layout/mobile-cta-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { routing } from "@/i18n/routing";
import { publicEnv } from "@/lib/env";
import "../globals.css";

// Fredoka has no Vietnamese subset (tone-marked capitals fall back), so headings
// use Baloo 2 as the prompt's §5 fallback. See CLAUDE.md → Typography.
const baloo = Baloo_2({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
  variable: "--font-baloo",
  display: "swap",
});
const nunito = Nunito({
  subsets: ["latin", "vietnamese"],
  variable: "--font-nunito",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(publicEnv.NEXT_PUBLIC_SITE_URL),
    title: { default: t("title"), template: `%s · HomeForAll` },
    description: t("description"),
    alternates: { languages: { vi: "/vi", en: "/en" } },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "a11y" });

  return (
    <html lang={locale} className={`${baloo.variable} ${nunito.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <a
          href="#main"
          className="sr-only z-50 rounded-sm bg-blue-800 px-4 py-3 font-bold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>
          <SiteHeader locale={locale} />
          <main id="main" tabIndex={-1} className="flex-1 outline-none">
            {children}
          </main>
          <SiteFooter locale={locale} />
          <Suspense fallback={null}>
            <RouteFocus />
          </Suspense>
          {/* usePathname() inside: request data on dynamic routes (cacheComponents). */}
          <Suspense fallback={null}>
            <FanhChat />
          </Suspense>
          <Suspense fallback={null}>
            <MobileCtaBar />
          </Suspense>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
