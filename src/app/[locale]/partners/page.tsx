import { HeartHandshake, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { ProposedPartnerCards } from "@/components/partners/proposed-partner-card";
import { SceneHeader } from "@/components/world/scene-header";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/partners">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t("partners") };
}

/** Network beat (s08): verified partners (none yet) + proposed partners (honesty note: footer). */
export default async function PartnersPage({ params }: PageProps<"/[locale]/partners">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [nav, t, landing] = await Promise.all([
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "proposedPartners" }),
    getTranslations({ locale, namespace: "landing.partners" }),
  ]);

  return (
    <>
      <SceneHeader route="/partners" locale={locale} title={nav("partners")} />
      <Container className="relative space-y-6 pb-20">
        <section
          aria-labelledby="verified-title"
          className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-white p-8 shadow-lift"
        >
          <div className="space-y-2">
            <h2 id="verified-title" className="flex items-center gap-2 text-2xl font-bold text-blue-800">
              <ShieldCheck aria-hidden="true" className="size-7 text-success" />
              {t("verifiedTitle")}
            </h2>
            <p className="max-w-[60ch] text-muted">{t("verifiedEmpty")}</p>
          </div>
          <a
            href="#become"
            className="inline-flex min-h-12 items-center gap-2 rounded-md bg-blue-600 px-6 font-bold text-white no-underline hover:bg-blue-800"
          >
            <HeartHandshake aria-hidden="true" className="size-5" />
            {landing("cta")}
          </a>
        </section>

        <section aria-labelledby="proposed-title" className="space-y-4 rounded-lg bg-white p-8 shadow-soft">
          <h2 id="proposed-title" className="text-2xl font-bold text-blue-800">
            {t("title")}
          </h2>
          <ProposedPartnerCards locale={locale} />
        </section>

        <section
          id="become"
          aria-labelledby="become-title"
          className="scroll-mt-28 space-y-2 rounded-lg bg-blue-100 p-8"
        >
          <h2 id="become-title" className="text-2xl font-bold text-blue-800">
            {landing("cta")}
          </h2>
          <p className="text-blue-800">{landing("empty")}</p>
        </section>
      </Container>
    </>
  );
}
