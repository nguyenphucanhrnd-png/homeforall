import { ExternalLink, PawPrint, Phone, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { JourneyChip } from "@/components/world/journey-chip";
import type { Locale } from "@/i18n/routing";

const WHO_RABIES_URL = "https://www.who.int/news-room/fact-sheets/detail/rabies";

export async function generateMetadata({ params }: PageProps<"/[locale]/help">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "help" });
  return { title: t("title") };
}

/**
 * Journey C1. Text-first, high contrast, no motion, no login (principle 5).
 * Medical wording stays a marked placeholder until copied from WHO / Bộ Y tế
 * and signed off by a medical reviewer.
 */
export default async function HelpPage({ params }: PageProps<"/[locale]/help">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "help" });

  const tileClass =
    "flex min-h-40 flex-col justify-center gap-2 rounded-lg border-2 bg-white p-8 no-underline text-ink";

  return (
    <div data-motion="none" className="bg-white">
      <Container className="max-w-[960px] space-y-12 py-14 text-lg">
        <header className="space-y-3">
          <JourneyChip kind="help" locale={locale} />
          <h1 className="text-4xl font-bold text-ink">{t("title")}</h1>
          <p>{t("intro")}</p>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <a href="#bite" className={`${tileClass} border-danger`}>
            <TriangleAlert aria-hidden="true" className="size-9 text-danger" />
            <span className="font-heading text-2xl font-bold">{t("biteTile")}</span>
            <span className="text-muted">{t("biteTileHint")}</span>
          </a>
          <a href="#found" className={`${tileClass} border-blue-600`}>
            <PawPrint aria-hidden="true" className="size-9 text-blue-600" />
            <span className="font-heading text-2xl font-bold">{t("foundTile")}</span>
            <span className="text-muted">{t("foundTileHint")}</span>
          </a>
        </div>

        <section id="bite" aria-labelledby="bite-heading" className="scroll-mt-28 space-y-4">
          <h2 id="bite-heading" className="text-3xl font-bold">
            {t("biteHeading")}
          </h2>
          <p className="flex items-start gap-3 rounded-md border-2 border-danger p-5 font-bold">
            <Phone aria-hidden="true" className="mt-1 size-6 shrink-0 text-danger" />
            {t("emergencyCall")}
          </p>
          <p data-placeholder="medical-review">{t("pendingReview")}</p>
          <p>
            <span className="font-semibold">{t("sourceLabel")}: </span>
            <a href={WHO_RABIES_URL} rel="noopener" className="inline-flex items-center gap-1 font-semibold max-md:min-h-11">
              {t("whoLink")}
              <ExternalLink aria-hidden="true" className="size-4" />
            </a>
          </p>
          <p className="text-muted">{t("clinicsPending")}</p>
          <p className="text-muted">{t("hotlinePending")}</p>
        </section>

        <section id="found" aria-labelledby="found-heading" className="scroll-mt-28 space-y-4">
          <h2 id="found-heading" className="text-3xl font-bold">
            {t("foundHeading")}
          </h2>
          <p data-placeholder="content">{t("foundPending")}</p>
          <Link href="/report" className={buttonVariants({ variant: "primary", size: "lg" })}>
            <PawPrint aria-hidden="true" />
            {t("toReport")}
          </Link>
        </section>
      </Container>
    </div>
  );
}
