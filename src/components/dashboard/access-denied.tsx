import { ShieldX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export async function AccessDenied({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "dashboard" });
  return (
    <div role="alert" className="max-w-2xl space-y-4 rounded-lg bg-white p-10 shadow-soft">
      <ShieldX aria-hidden="true" className="size-10 text-danger" />
      <h2 className="text-3xl font-bold">{t("accessDeniedTitle")}</h2>
      <p className="text-muted">{t("accessDeniedBody")}</p>
      <Button asChild variant="secondary">
        <Link href="/dashboard">{t("backToDashboard")}</Link>
      </Button>
    </div>
  );
}
