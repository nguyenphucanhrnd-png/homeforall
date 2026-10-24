import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AccessDenied } from "@/components/dashboard/access-denied";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { Container } from "@/components/layout/container";
import { ReportInbox } from "@/components/reports/report-inbox";
import { routing, type Locale } from "@/i18n/routing";
import { hasAnyRole, requireViewer } from "@/lib/auth/guard";
import { dashboardRole, type AppRole } from "@/lib/auth/roles";
import { forGroup } from "@/lib/reports/store";
import { reportTargets } from "@/lib/spots/repository";

const AREAS = ["rescue", "vet", "foster", "adopter", "sponsor"] as const;
type Area = (typeof AREAS)[number];

const isArea = (v: string): v is Area => (AREAS as readonly string[]).includes(v);

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => AREAS.map((area) => ({ locale, area })));
}

export const metadata: Metadata = { robots: { index: false } };

export default async function AreaDashboardPage({ params }: PageProps<"/[locale]/dashboard/[area]">) {
  const { locale: rawLocale, area } = await params;
  const locale = rawLocale as Locale;
  if (!isArea(area)) notFound();
  setRequestLocale(locale);

  const allowed = dashboardRole(`/dashboard/${area}`);
  const t = await getTranslations({ locale, namespace: "roles" });

  return (
    <Container className="space-y-8 py-14">
      <h1 className="text-4xl font-bold text-blue-800">{allowed.map((r) => t(r)).join(" / ")}</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <Gate locale={locale} area={area} allowed={allowed} />
      </Suspense>
    </Container>
  );
}

async function Gate({ locale, area, allowed }: { locale: Locale; area: Area; allowed: AppRole[] }) {
  const viewer = await requireViewer(locale, `/dashboard/${area}`);
  if (!hasAnyRole(viewer, [...allowed, "admin"])) return <AccessDenied locale={locale} />;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  if (area === "rescue") {
    // Found-animal inbox. Admins see every group's inbox; group membership
    // (spot_members) arrives with the database, until then partners see a note.
    const spots = viewer.roles.includes("admin") ? reportTargets().filter((s) => forGroup(s.id).length > 0) : [];
    return (
      <div className="space-y-10" data-testid="dashboard-rescue">
        {spots.length === 0 && <p className="max-w-2xl rounded-lg bg-white p-10 text-muted shadow-soft">{t("inboxEmpty")}</p>}
        {spots.map((s) => (
          <ReportInbox key={s.id} spotId={s.id} locale={locale} />
        ))}
      </div>
    );
  }
  return (
    <div className="max-w-2xl rounded-lg bg-white p-10 shadow-soft" data-testid={`dashboard-${area}`}>
      <p className="text-muted">{t("placeholder")}</p>
    </div>
  );
}
