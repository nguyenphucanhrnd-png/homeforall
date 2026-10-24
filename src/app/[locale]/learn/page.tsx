import {
  ArrowRight,
  ClipboardList,
  ExternalLink,
  House,
  PawPrint,
  Scissors,
  Stethoscope,
  Syringe,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { SceneHeader } from "@/components/world/scene-header";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const WHO_RABIES = "https://www.who.int/news-room/fact-sheets/detail/rabies";

// Task-based care topics (journey C2). Medical text stays a marked placeholder
// until copied from an authoritative source and signed off by a vet (v4 rule 2).
const TOPICS: Array<{
  id: string;
  key: "vaccination" | "registration" | "sterilization" | "firstWeek" | "found" | "bitten";
  icon: LucideIcon;
  source?: string;
  official?: boolean;
  help?: string;
}> = [
  { id: "vaccination", key: "vaccination", icon: Syringe, source: WHO_RABIES },
  { id: "registration", key: "registration", icon: ClipboardList, official: true },
  { id: "sterilization", key: "sterilization", icon: Scissors },
  { id: "first-week", key: "firstWeek", icon: House },
  { id: "found", key: "found", icon: PawPrint, help: "/help#found" },
  { id: "bitten", key: "bitten", icon: TriangleAlert, help: "/help#bite" },
];

export async function generateMetadata({ params }: PageProps<"/[locale]/learn">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t("care") };
}

/** Journey beat 2 (s04 clinic): care is recorded and verified. */
export default async function LearnPage({ params }: PageProps<"/[locale]/learn">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [nav, t] = await Promise.all([
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "learn" }),
  ]);

  return (
    <>
      <SceneHeader route="/learn" locale={locale} title={nav("care")} />
      <Container className="relative space-y-6 pb-20">
        <p className="rounded-lg bg-white p-6 text-lg shadow-lift">{t("intro")}</p>
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {TOPICS.map(({ id, key, icon: Icon, source, official, help }) => (
            <li
              key={id}
              id={id}
              className="flex scroll-mt-28 flex-col gap-3 rounded-lg bg-white p-6 shadow-soft"
            >
              <Icon aria-hidden="true" className="size-8 text-blue-800" />
              <h2 className="text-2xl font-bold">{t(`topics.${key}`)}</h2>
              {help ? (
                <Link href={help} className="mt-auto inline-flex min-h-11 items-center gap-2 font-bold">
                  {t("goHelp")}
                  <ArrowRight aria-hidden="true" className="size-5" />
                </Link>
              ) : (
                <>
                  <p data-placeholder="medical-review" className="text-muted">
                    {t("pending")}
                  </p>
                  {official && <p className="text-sm text-muted">{t("officialPending")}</p>}
                  {source && (
                    <p className="mt-auto text-sm">
                      {t("sourceLabel")}:{" "}
                      <a
                        href={source}
                        rel="noopener"
                        className="inline-flex items-center gap-1 font-semibold"
                      >
                        WHO
                        <ExternalLink aria-hidden="true" className="size-3.5" />
                      </a>
                    </p>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>

        <section
          id="vet"
          aria-labelledby="vet-title"
          className="flex scroll-mt-28 flex-wrap items-center justify-between gap-4 rounded-lg bg-blue-100 p-8"
        >
          <div className="space-y-2">
            <h2 id="vet-title" className="flex items-center gap-2 text-2xl font-bold text-blue-800">
              <Stethoscope aria-hidden="true" className="size-7" />
              {t("vetTitle")}
            </h2>
            <p className="max-w-[60ch] text-blue-800">{t("vetBody")}</p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/network?layer=vet">{t("vetCta")}</Link>
          </Button>
        </section>
      </Container>
    </>
  );
}
