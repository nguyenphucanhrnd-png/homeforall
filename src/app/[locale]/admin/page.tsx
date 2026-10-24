import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { AccessDenied } from "@/components/dashboard/access-denied";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { Container } from "@/components/layout/container";
import type { Locale } from "@/i18n/routing";
import { hasAnyRole, requireViewer } from "@/lib/auth/guard";

export const metadata: Metadata = { robots: { index: false } };

export default async function AdminPage({ params }: PageProps<"/[locale]/admin">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "roles" });

  return (
    <Container className="space-y-8 py-14">
      <h1 className="text-4xl font-bold text-blue-800">{t("admin")}</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <AdminGate locale={locale} />
      </Suspense>
    </Container>
  );
}

async function AdminGate({ locale }: { locale: Locale }) {
  const viewer = await requireViewer(locale, "/admin");
  if (!hasAnyRole(viewer, ["admin"])) return <AccessDenied locale={locale} />;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  // M1: partner verification queue · M3+: moderation, assisted entry, flags, audit log.
  return (
    <div className="max-w-2xl rounded-lg bg-white p-10 shadow-soft" data-testid="dashboard-admin">
      <p className="text-muted">{t("placeholder")}</p>
    </div>
  );
}
