import { getTranslations } from "next-intl/server";
import { LogoFull } from "@/components/brand/logo";
import { Link } from "@/i18n/navigation";
import { SHOW_PROTOTYPE_NOTICE } from "@/lib/flags";
import type { Locale } from "@/i18n/routing";
import { Container } from "./container";
import { MobileCollapse } from "./mobile-collapse";

export async function SiteFooter({ locale }: { locale: Locale }) {
  const [t, nav, mobile] = await Promise.all([
    getTranslations({ locale, namespace: "footer" }),
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "mobile" }),
  ]);

  const links = [
    { href: "/report", label: nav("report") },
    { href: "/network", label: t("network") },
    { href: "/pets", label: nav("adopt") },
    { href: "/foster", label: nav("fosterVolunteer") },
    { href: "/learn", label: nav("care") },
    { href: "/partners", label: nav("partners") },
    { href: "/about", label: nav("about") },
    { href: "/help", label: t("help") },
  ] as const;

  return (
    <footer className="mt-24 border-t border-border bg-white">
      <Container className="grid grid-cols-12 gap-y-8 py-12 md:gap-x-8 max-md:gap-y-6 max-md:py-10">
        <div className="col-span-12 space-y-3 md:col-span-5">
          <LogoFull />
          <p className="font-heading text-lg text-ink">{t("tagline")}</p>
          <p className="text-muted">{t("pilot")}</p>
        </div>
        <MobileCollapse label={mobile("footerLinks")} className="max-md:col-span-12">
          <ul className="col-span-12 grid grid-cols-2 gap-x-8 gap-y-2 md:col-span-4 max-md:grid-cols-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-flex min-h-11 items-center font-semibold">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </MobileCollapse>
        <div className="col-span-12 space-y-3 text-muted md:col-span-3">
          <p>{t("nonprofit")}</p>
          <p>{t("privacy")}</p>
          <p>{t("copyright")}</p>
        </div>
        {SHOW_PROTOTYPE_NOTICE && (
          <p data-testid="prototype-notice" className="col-span-12 rounded-md bg-cream-50 p-4 text-sm text-ink">
            {t("prototypeNotice")}
          </p>
        )}
      </Container>
    </footer>
  );
}
