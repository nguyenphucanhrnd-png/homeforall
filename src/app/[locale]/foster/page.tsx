import { HandHeart, HeartHandshake } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { SceneHeader } from "@/components/world/scene-header";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { FosterForm } from "./foster-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/foster">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t("fosterVolunteer") };
}

/** Journey beat 3 (s05 amber): offer a foster spot in about a minute (journey F1). */
export default async function FosterPage({ params }: PageProps<"/[locale]/foster">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [nav, t] = await Promise.all([
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "foster" }),
  ]);
  const what = t.raw("what") as string[];
  const steps = t.raw("steps") as string[];
  const faq = t.raw("faq") as Array<{ q: string; a: string }>;

  return (
    <>
      <SceneHeader route="/foster" locale={locale} title={nav("fosterVolunteer")} />
      <Container className="relative grid grid-cols-12 items-start gap-y-6 pb-20 lg:gap-x-8">
        <section
          aria-labelledby="foster-form-title"
          className="col-span-12 space-y-4 rounded-lg bg-white p-8 shadow-lift lg:order-2 lg:col-span-6"
        >
          <h2 id="foster-form-title" className="flex items-center gap-2 text-3xl font-bold text-blue-800">
            <HandHeart aria-hidden="true" className="size-7" />
            {t("formTitle")}
          </h2>
          <p className="text-muted">{t("formIntro")}</p>
          <FosterForm />
        </section>

        <div className="col-span-12 space-y-6 lg:order-1 lg:col-span-6">
          <section aria-labelledby="foster-what" className="space-y-3 rounded-lg bg-white p-8 shadow-soft">
            <h2 id="foster-what" className="text-2xl font-bold">
              {t("whatTitle")}
            </h2>
            <ul className="list-disc space-y-2 ps-5">
              {what.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="foster-steps" className="space-y-3 rounded-lg bg-white p-8 shadow-soft">
            <h2 id="foster-steps" className="text-2xl font-bold">
              {t("stepsTitle")}
            </h2>
            <ol className="space-y-3">
              {steps.map((line, i) => (
                <li key={line} className="flex gap-3">
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-peach-200 font-bold">
                    {i + 1}
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="foster-faq" className="space-y-3 rounded-lg bg-white p-8 shadow-soft">
            <h2 id="foster-faq" className="text-2xl font-bold">
              {t("faqTitle")}
            </h2>
            {faq.map((item) => (
              <details key={item.q} className="group rounded-md border border-border p-4">
                <summary className="cursor-pointer font-bold">{item.q}</summary>
                <p className="mt-2">{item.a}</p>
              </details>
            ))}
          </section>

          <div className="flex flex-wrap items-center gap-4 rounded-lg bg-blue-100 p-6">
            <p className="font-semibold text-blue-800">{t("cantFoster")}</p>
            <Button asChild variant="secondary">
              <Link href="/volunteer">
                <HeartHandshake aria-hidden="true" />
                {t("goVolunteer")}
              </Link>
            </Button>
          </div>
        </div>
      </Container>
    </>
  );
}
