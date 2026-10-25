"use client";

import { PawPrint } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { MOBILE_STICKY_CTA } from "@/lib/flags";
import { cn } from "@/lib/utils";

/**
 * Phones only (md:hidden): a slim bottom bar to the main feature. Hidden on
 * /report itself, on pet profiles (they have their own action bar) and while the
 * menu is open (CSS: html[data-menu-open]). Its height is published as
 * --mobile-cta-h (globals.css) so fixed controls and the journey sheet sit above it.
 */
export function MobileCtaBar() {
  const t = useTranslations("mobile");
  const pathname = usePathname();
  if (!MOBILE_STICKY_CTA) return null;
  if (pathname.startsWith("/report") || /^\/pets\/[^/]+$/.test(pathname)) return null;
  return (
    <div
      data-mobile-cta
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm md:hidden"
    >
      <Link href="/report" className={cn(buttonVariants({ variant: "primary" }), "w-full")}>
        <PawPrint aria-hidden="true" />
        {t("ctaBar")}
      </Link>
    </div>
  );
}
