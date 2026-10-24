import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { Container } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireViewer } from "@/lib/auth/guard";
import { dashboardPathFor } from "@/lib/auth/roles";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  return { title: t("title"), robots: { index: false } };
}

export default async function DashboardPage({ params }: PageProps<"/[locale]/dashboard">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard" });

  return (
    <Container className="space-y-8 py-14">
      <h1 className="text-4xl font-bold text-blue-800">{t("title")}</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <Overview locale={locale} />
      </Suspense>
    </Container>
  );
}

async function Overview({ locale }: { locale: Locale }) {
  const viewer = await requireViewer(locale, "/dashboard");
  const [t, roleName] = await Promise.all([
    getTranslations({ locale, namespace: "dashboard" }),
    getTranslations({ locale, namespace: "roles" }),
  ]);

  return (
    <div className="max-w-2xl space-y-6 rounded-lg bg-white p-10 shadow-soft">
      {viewer.email && <p className="text-muted">{t("signedInAs", { email: viewer.email })}</p>}
      <h2 className="text-2xl font-bold">{t("rolesLabel")}</h2>
      <ul className="space-y-3" data-testid="role-list">
        {viewer.roles.map((role) => (
          <li key={role} className="flex items-center justify-between gap-4 rounded-md border border-border p-4">
            <span className="font-semibold">{roleName(role)}</span>
            <Link href={dashboardPathFor([role])} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              {t("open")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
