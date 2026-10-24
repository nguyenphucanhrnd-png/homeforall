import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/coming-soon";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/events">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("events") };
}

export default async function Page({ params }: PageProps<"/[locale]/events">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "pages" });
  return <ComingSoon locale={locale} heading={t("events")} route="/events" />;
}
