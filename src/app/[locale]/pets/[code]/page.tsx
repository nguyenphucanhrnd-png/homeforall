import { CalendarClock, MapPin, ShieldAlert, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Container } from "@/components/layout/container";
import { HealthTimeline } from "@/components/pets/health-timeline";
import { AdoptActions, ReportAction, ShareActions } from "@/components/pets/pet-actions";
import { PetGallery } from "@/components/pets/pet-gallery";
import { SaveButton } from "@/components/pets/save-button";
import { StatusChip } from "@/components/pets/status-chip";
import { VerifiedBadge } from "@/components/pets/verified-badge";
import { RouteMeta } from "@/components/world/scene-header";
import type { Locale } from "@/i18n/routing";
import { publicEnv } from "@/lib/env";
import { formatDate, relativeDays } from "@/lib/format";
import { isStale } from "@/lib/pets/filter";
import { getPet } from "@/lib/pets/repository";
import { wardLabel } from "@/lib/pets/wards";

type Params = PageProps<"/[locale]/pets/[code]">["params"];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, code } = await params;
  const found = await getPet(code);
  if (!found) return {};
  return {
    title: found.pet.name,
    description: found.pet.story[locale as Locale].slice(0, 150),
  };
}

/** Journey A1: arrive from a shared link straight onto the profile. */
export default async function PetProfilePage({ params }: PageProps<"/[locale]/pets/[code]">) {
  return (
    <>
      {/* v4 §5.3: no scene on the profile (photo-first), only a mood strip of beat 4 (peach). */}
      <div
        aria-hidden="true"
        data-mood-strip
        className="h-2 bg-linear-to-r from-peach-300 via-peach-200 to-orange-500"
      />
      <Container className="py-10">
        <Suspense fallback={<ProfileSkeleton />}>
          <Profile params={params} />
        </Suspense>
      </Container>
    </>
  );
}

async function Profile({ params }: { params: Params }) {
  const { locale: rawLocale, code } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const found = await getPet(code);
  if (!found) notFound();
  const { pet, partner, now } = found;

  const [t, tp, f, nav] = await Promise.all([
    getTranslations({ locale, namespace: "petProfile" }),
    getTranslations({ locale, namespace: "pets" }),
    getTranslations({ locale, namespace: "pets.filters" }),
    getTranslations({ locale, namespace: "nav" }),
  ]);
  const stale = isStale(pet, now);
  const shareUrl = new URL(`/${locale}/pets/${pet.code}`, publicEnv.NEXT_PUBLIC_SITE_URL).toString();
  const verified = (
    <VerifiedBadge
      label={t("verified")}
      why={t("verifiedWhy")}
      explanation={t("verifiedExplain", { date: formatDate(partner.verifiedAt, locale) })}
    />
  );

  return (
    <div className="space-y-6">
      <RouteMeta route="/pets/[code]" locale={locale} />
      <Breadcrumbs
        label={t("breadcrumb")}
        items={[{ href: "/", label: t("home") }, { href: "/pets", label: nav("adopt") }, { label: pet.name }]}
      />

      <div className="grid grid-cols-12 items-start gap-y-10 lg:gap-x-10">
        {/* First in DOM so the name is read first; shown on the right on desktop. */}
        <aside className="col-span-12 space-y-5 rounded-lg bg-white p-7 shadow-lift lg:sticky lg:top-24 lg:order-2 lg:col-span-5 xl:col-span-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={pet.status} label={tp(`status.${pet.status}`)} />
            </div>
            <SaveButton code={pet.code} name={pet.name} />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-bold text-blue-800">{pet.name}</h1>
            <p className="text-sm text-muted">
              {t("code")}: <span className="font-bold text-ink">{pet.code}</span>
            </p>
          </div>
          <p className="text-lg font-semibold">
            {f(pet.species)} · {f(pet.ageRange)} · {f(pet.sex)}
          </p>
          <p className="flex items-center gap-1.5">
            <MapPin aria-hidden="true" className="size-5 text-blue-800" />
            {wardLabel(pet.ward, locale)}
          </p>
          <div className="space-y-1 border-t border-border pt-4">
            <p className="text-sm text-muted">{t("caredBy")}</p>
            <p className="font-bold">{partner.name}</p>
            {verified}
          </div>

          {stale ? (
            <p className="flex items-start gap-2 rounded-md bg-cream-50 p-3 text-sm font-semibold text-warning">
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {t("staleWarning")}
            </p>
          ) : (
            <p className="flex items-center gap-2 text-sm font-semibold text-muted">
              <CalendarClock aria-hidden="true" className="size-4" />
              {t("lastConfirmed", { time: relativeDays(pet.lastConfirmedAt, now, locale) })}
            </p>
          )}
          {pet.status === "adoption_pending" && (
            <p className="rounded-md bg-cream-50 p-3 text-sm">{t("pendingNote")}</p>
          )}

          <AdoptActions petCode={pet.code} petName={pet.name} partnerName={partner.name} />
          <div className="border-t border-border pt-4">
            <ShareActions shareUrl={shareUrl} />
          </div>
          <ReportAction />
        </aside>

        <div className="col-span-12 space-y-12 lg:order-1 lg:col-span-7 xl:col-span-8">
          <PetGallery name={pet.name} species={pet.species} look={pet.look} photos={pet.photos} />

          <Section title={t("story")}>
            <p className="max-w-[65ch] text-lg">{pet.story[locale]}</p>
          </Section>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <Section title={t("temperament")}>
              <ul className="flex flex-wrap gap-2">
                {pet.temperament.map((tag) => (
                  <li key={tag.en} className="rounded-full bg-peach-200 px-4 py-1.5 font-semibold">
                    {tag[locale]}
                  </li>
                ))}
              </ul>
            </Section>
            <Section title={t("goodWith")}>
              {pet.goodWith.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {pet.goodWith.map((g) => (
                    <li key={g} className="rounded-full bg-blue-100 px-4 py-1.5 font-semibold text-blue-800">
                      {f(g)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{t("goodWithNone")}</p>
              )}
            </Section>
          </div>

          <Section title={t("idealHome")}>
            <p className="text-lg">{pet.idealHome[locale]}</p>
          </Section>

          <Section title={t("health")}>
            <HealthTimeline pet={pet} locale={locale} />
          </Section>

          <section
            aria-labelledby="stay-safe"
            className="space-y-3 rounded-lg border-2 border-orange-500 bg-white p-7"
          >
            <h2 id="stay-safe" className="flex items-center gap-2 text-2xl font-bold">
              <ShieldAlert aria-hidden="true" className="size-6 text-orange-700" />
              {t("staySafe.title")}
            </h2>
            <ul className="list-disc space-y-1 ps-6">
              <li className="font-semibold">{t("staySafe.noDeposit")}</li>
              <li>{t("staySafe.meet")}</li>
              <li>{t("staySafe.report")}</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-3xl font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function ProfileSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-12 gap-y-10 pt-10 lg:gap-x-10">
      <div className="col-span-12 aspect-[4/3] rounded-lg bg-white shadow-soft lg:col-span-7 xl:col-span-8" />
      <div className="col-span-12 h-[560px] rounded-lg bg-white shadow-soft lg:col-span-5 xl:col-span-4" />
    </div>
  );
}
