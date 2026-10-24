import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { Container } from "@/components/layout/container";
import { NetworkExplorer } from "@/components/map/network-explorer";
import { ProposedPartnerCards } from "@/components/partners/proposed-partner-card";
import { SceneHeader } from "@/components/world/scene-header";
import type { Locale } from "@/i18n/routing";
import { networkItems, pilotZones } from "@/lib/spots/network";
import { getSpots } from "@/lib/spots/repository";

export async function generateMetadata({ params }: PageProps<"/[locale]/network">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "network" });
  return { title: t("title") };
}

/** Network map (prompt bundle §B): list + map of rescue, vets, state stations, foster counts, pilot areas. */
export default async function NetworkPage({ params }: PageProps<"/[locale]/network">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "network" });
  const { seeded } = getSpots();

  return (
    <>
      <SceneHeader route="/network" locale={locale} title={t("title")} />
      <Container className="relative pb-20">
        <Suspense>
          <NetworkExplorer
            items={networkItems()}
            pilotZones={pilotZones()}
            seeded={seeded}
            aside={
              <section aria-labelledby="sponsors-title" className="space-y-3 rounded-lg bg-white p-5 shadow-soft">
                <h2 id="sponsors-title" className="text-xl font-bold">
                  {t("sponsorsTitle")}
                </h2>
                <ProposedPartnerCards locale={locale} compact />
              </section>
            }
          />
        </Suspense>
      </Container>
    </>
  );
}
