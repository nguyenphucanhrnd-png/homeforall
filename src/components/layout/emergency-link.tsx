import { PawPrint } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * The site's main feature, first in the header: "Phát hiện 1 bé đi lạc" → /report.
 * The single accent button (orange, ink text). /help ("Bị cắn?") is linked from /report and the footer.
 */
export async function ReportLink({ locale, className }: { locale: Locale; className?: string }) {
  const t = await getTranslations({ locale, namespace: "nav" });
  return (
    <Link
      href="/report"
      data-testid="report-link"
      className={cn(buttonVariants({ variant: "primary", size: "sm" }), "whitespace-nowrap", className)}
    >
      <PawPrint aria-hidden="true" />
      {t("report")}
    </Link>
  );
}
