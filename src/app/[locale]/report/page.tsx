import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { JourneyChip } from "@/components/world/journey-chip";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { FEATURE_REPORT } from "@/lib/flags";
import { directionsUrl } from "@/lib/spots/directions";
import { getSpots } from "@/lib/spots/repository";
import { layerOf } from "@/lib/spots/types";
import { ReportExperience, type FallbackVet } from "./report-wizard";

export async function generateMetadata({ params }: PageProps<"/[locale]/report">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "report" });
  return { title: t("title") };
}

/**
 * The site's main feature: a resident sees a stray → nearest rescue points and
 * vets within 2 taps, short instructions, then an optional quick report.
 * Calm and ad-free: no partner or sponsor content on this page.
 */
export default async function ReportPage({ params }: PageProps<"/[locale]/report">) {
  if (!FEATURE_REPORT) notFound();
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "report" });
  const { spots, seeded } = getSpots();

  // Until map positions exist, the team's vet list is shown unsorted with
  // address-based directions (never a guessed coordinate).
  const fallbackVets: FallbackVet[] = seeded
    ? []
    : spots
        .filter((s) => ["vet", "state"].includes(layerOf(s.kind)))
        .map((s) => ({
          id: s.id,
          name: s.name,
          kind: s.kind,
          address: s.address_raw ?? null,
          area: s.legacy_area ?? null,
          directions: s.multi_branch ? null : directionsUrl({ name: s.name, address: s.address_raw, area: s.legacy_area, layer: layerOf(s.kind) }),
        }));

  return (
    <Container className="space-y-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <JourneyChip kind={1} locale={locale} />
          <h1 className="text-4xl font-bold text-blue-800">{t("title")}</h1>
          <p className="text-lg">{t("intro")}</p>
        </div>
        <Link
          href="/help"
          className="inline-flex min-h-12 items-center gap-2 rounded-md border-2 border-danger bg-white px-4 font-bold text-danger no-underline hover:bg-cream-50"
        >
          <TriangleAlert aria-hidden="true" className="size-5" />
          {t("bitten")}
        </Link>
      </header>
      <ReportExperience seeded={seeded} fallbackVets={fallbackVets} />
    </Container>
  );
}
