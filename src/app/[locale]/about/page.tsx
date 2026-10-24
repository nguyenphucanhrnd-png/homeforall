import { Globe2, Handshake, Info, MapPin, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";
import { SceneHeader } from "@/components/world/scene-header";
import type { Locale } from "@/i18n/routing";
import { SHOW_PROTOTYPE_NOTICE } from "@/lib/flags";

export async function generateMetadata({ params }: PageProps<"/[locale]/about">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t("about") };
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [nav, t, footer] = await Promise.all([
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "about" }),
    getTranslations({ locale, namespace: "footer" }),
  ]);

  return (
    <>
      <SceneHeader route="/about" locale={locale} title={nav("about")} />
      <Container className="relative grid grid-cols-12 gap-y-6 pb-20 lg:gap-x-6">
        {SHOW_PROTOTYPE_NOTICE && (
          <p className="col-span-12 flex items-start gap-3 rounded-lg bg-white p-6 text-lg shadow-soft" data-testid="prototype-notice-about">
            <Info aria-hidden="true" className="mt-1 size-6 shrink-0 text-blue-800" />
            {footer("prototypeNotice")}
          </p>
        )}
        <Card
          className="col-span-12 lg:col-span-7"
          icon={<Globe2 aria-hidden="true" className="size-7 text-blue-800" />}
          title={t("why.title")}
        >
          <p className="text-lg">{t("why.body")}</p>
        </Card>
        <Card
          className="col-span-12 lg:col-span-5"
          icon={<MapPin aria-hidden="true" className="size-7 text-blue-800" />}
          title={t("pilot.title")}
        >
          <p>{t("pilot.body")}</p>
        </Card>
        <Card
          className="col-span-12 lg:col-span-7"
          icon={<Handshake aria-hidden="true" className="size-7 text-blue-800" />}
          title={t("sdg.title")}
        >
          <ul className="list-disc space-y-2 ps-5">
            <li>{t("sdg.sdg15")}</li>
            <li>{t("sdg.sdg17")}</li>
          </ul>
        </Card>
        {/* v4 §11: a visible, honest note that the clay illustrations are AI-generated. */}
        <Card
          id="illustrations"
          className="col-span-12 border-2 border-orange-500 lg:col-span-5"
          icon={<Sparkles aria-hidden="true" className="size-7 text-orange-700" />}
          title={t("art.title")}
        >
          <p>{t("art.body")}</p>
          <p>{t("art.mascots")}</p>
        </Card>
        <p className="col-span-12 text-sm text-muted">{t("review")}</p>
      </Container>
    </>
  );
}

function Card({
  id,
  className,
  icon,
  title,
  children,
}: {
  id?: string;
  className?: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      className={`space-y-3 rounded-lg bg-white p-8 shadow-soft ${className ?? ""}`}
    >
      {icon}
      <h2 id={id ? `${id}-title` : undefined} className="text-2xl font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}
