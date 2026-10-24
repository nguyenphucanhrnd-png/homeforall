import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Container } from "@/components/layout/container";
import { ReportInbox } from "@/components/reports/report-inbox";
import type { Locale } from "@/i18n/routing";
import { reportTargets } from "@/lib/spots/repository";

export const metadata: Metadata = { robots: { index: false } };

/** Dev-only group inbox (no auth until the database exists). Not served in production. */
export default async function DevInboxPage({ params }: PageProps<"/[locale]/dev/inbox/[spot]">) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DEV_PAGES !== "true") notFound();
  return (
    <Container className="space-y-6 py-12">
      <Suspense>
        <Inbox params={params} />
      </Suspense>
    </Container>
  );
}

async function Inbox({ params }: { params: PageProps<"/[locale]/dev/inbox/[spot]">["params"] }) {
  await connection();
  const { locale, spot } = await params;
  setRequestLocale(locale as Locale);
  if (!reportTargets().some((s) => s.id === spot)) notFound();
  return <ReportInbox spotId={spot} locale={locale as Locale} />;
}
