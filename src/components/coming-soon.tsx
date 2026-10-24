import { Hammer } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { SceneHeader } from "@/components/world/scene-header";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { ROUTES } from "@/world/world.config";

/** Honest placeholder for routes that land in later phases, already placed in the world. */
export async function ComingSoon({
  locale,
  heading,
  route,
}: {
  locale: Locale;
  heading: string;
  route: keyof typeof ROUTES;
}) {
  const t = await getTranslations({ locale, namespace: "comingSoon" });
  return (
    <>
      <SceneHeader route={route} locale={locale} title={heading} />
      <Container className="relative pb-20">
        <div className="max-w-2xl space-y-4 rounded-lg bg-white p-10 shadow-lift">
          <Hammer aria-hidden="true" className="size-10 text-orange-700" />
          <p className="font-heading text-2xl font-bold">{t("title")}</p>
          <p className="text-muted">{t("body")}</p>
          <Button asChild variant="secondary">
            <Link href="/">{t("back")}</Link>
          </Button>
        </div>
      </Container>
    </>
  );
}
