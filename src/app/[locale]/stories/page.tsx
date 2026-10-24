import { BookHeart, PawPrint, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { SceneHeader } from "@/components/world/scene-header";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: PageProps<"/[locale]/stories">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("stories") };
}

/** Journey beat 6 (s09): the first homes. Honest empty state until consented stories exist. */
export default async function StoriesPage({ params }: PageProps<"/[locale]/stories">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [pages, t] = await Promise.all([
    getTranslations({ locale, namespace: "pages" }),
    getTranslations({ locale, namespace: "storiesPage" }),
  ]);

  return (
    <>
      <SceneHeader route="/stories" locale={locale} title={pages("stories")} />
      <Container className="relative grid grid-cols-12 gap-y-6 pb-20 lg:gap-x-6">
        <section className="col-span-12 flex flex-col items-start gap-4 rounded-lg bg-white p-10 shadow-lift lg:col-span-7">
          <BookHeart aria-hidden="true" className="size-12 text-orange-700" />
          <p className="max-w-[55ch] text-lg">{t("empty")}</p>
          <Button asChild>
            <Link href="/pets">
              <PawPrint aria-hidden="true" />
              {t("cta")}
            </Link>
          </Button>
        </section>
        <section
          aria-labelledby="consent-title"
          className="col-span-12 space-y-3 rounded-lg bg-white p-10 shadow-soft lg:col-span-5"
        >
          <ShieldCheck aria-hidden="true" className="size-9 text-success" />
          <h2 id="consent-title" className="text-2xl font-bold">
            {t("consentTitle")}
          </h2>
          <p>{t("consent")}</p>
        </section>
      </Container>
    </>
  );
}
