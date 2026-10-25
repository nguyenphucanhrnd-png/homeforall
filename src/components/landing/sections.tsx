import {
  ArrowRight,
  BookHeart,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  HandHeart,
  HeartHandshake,
  HeartPulse,
  House,
  Lock,
  PawPrint,
  Search,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Container } from "@/components/layout/container";
import { NetworkPreview } from "@/components/map/network-preview";
import { ProposedPartnerCards } from "@/components/partners/proposed-partner-card";
import { PetMedia } from "@/components/pets/pet-media";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { parsePetFilters } from "@/lib/pets/filter";
import { networkItems } from "@/lib/spots/network";
import { listPets } from "@/lib/pets/repository";
import { wardLabel } from "@/lib/pets/wards";
import { cn } from "@/lib/utils";
import { namedStillUrl, stillUrl } from "@/world/plate-sources";
import type { PlateSources } from "@/world/plate-types";
import { DOOR_STILLS, JOURNEY, MOODS, PLATES, SECTION_STILLS, type PlateId, type StillName } from "@/world/world.config";

type P = { locale: Locale; sources: PlateSources };

const sectionBase = "relative scroll-mt-[72px] outline-none";

/** A still frame of a plate as a decorative background (or a flat mood colour). */
function Still({
  sources,
  plate,
  frame,
  className,
  priority,
  sizes = "100vw",
}: {
  sources: PlateSources;
  plate: PlateId;
  frame: "poster" | "last";
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const url = stillUrl(sources, plate, frame);
  const { focal, mood } = PLATES[plate];
  if (!url) return <div aria-hidden="true" className={cn("absolute inset-0", className)} style={{ background: MOODS[mood] }} />;
  return (
    <Image
      src={url}
      alt=""
      aria-hidden="true"
      fill
      priority={priority}
      sizes={sizes}
      className={cn("object-cover", className)}
      style={{ objectPosition: `${focal[0] * 100}% ${focal[1] * 100}%` }}
    />
  );
}

// ─── 1. Hero (s01) ────────────────────────────────────────────────────────────
export async function HeroScene({ locale, sources }: P) {
  const t = await getTranslations({ locale, namespace: "home" });
  return (
    <section id="scene-hero" data-scene="hero" tabIndex={-1} aria-labelledby="hero-title" className={cn(sectionBase, "overflow-hidden")}>
      {/* LCP: the s01 poster. In animated mode the canvas takes over and this fades. */}
      <div className="absolute inset-0 transition-opacity duration-700 group-data-[canvas=ready]/story:opacity-0">
        <Still sources={sources} plate="s01" frame="poster" priority />
      </div>
      {/* Scrim: keeps the copy ≥ 4.5:1 over any frame. */}
      <div aria-hidden="true" className="absolute inset-y-0 left-0 w-full bg-linear-to-r from-cream-50/95 via-cream-50/80 to-transparent lg:w-[62%]" />
      <Container className="relative grid min-h-[calc(100dvh-72px)] grid-cols-12 items-center gap-y-8 lg:gap-x-8 py-16">
        <div className="col-span-12 space-y-6 lg:col-span-6">
          <h1 id="hero-title" data-hero-line className="text-5xl font-bold text-blue-800 xl:text-6xl">
            {t("title")}
          </h1>
          <p data-hero-line className="max-w-[48ch] text-xl text-ink">
            {t("lead")}
          </p>
          <div data-hero-line className="flex flex-wrap gap-4">
            <Button asChild size="lg">
              <Link href="/pets">
                <PawPrint aria-hidden="true" />
                {t("ctaFind")}
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/report">
                <Search aria-hidden="true" />
                {t("ctaReport")}
              </Link>
            </Button>
          </div>
          <p data-hero-line className="flex items-center gap-2 font-semibold text-ink">
            <ShieldCheck aria-hidden="true" className="size-5 text-success" />
            {t("trust")}
          </p>
        </div>
      </Container>
    </section>
  );
}

// ─── 2. Intent doors (each shows a still of where it leads) ──────────────────
// "Thấy bé lạc" comes first: the site's main feature. Its tile is the only use of the report-rescue still.
const DOORS: Array<{ key: "report" | "adopt" | "foster" | "care" | "partner"; href: string; icon: LucideIcon; plate: PlateId; still?: StillName }> = [
  { key: "report", href: "/report", icon: Search, plate: "s03", still: DOOR_STILLS.report },
  { key: "adopt", href: "/pets", icon: House, plate: "s06" },
  { key: "foster", href: "/foster", icon: HandHeart, plate: "s05" },
  { key: "care", href: "/learn", icon: Stethoscope, plate: "s04" },
  { key: "partner", href: "/partners", icon: HeartHandshake, plate: "s08" },
];

export async function DoorsScene({ locale, sources }: P) {
  const t = await getTranslations({ locale, namespace: "landing.doors" });
  return (
    <section id="scene-doors" data-scene="doors" tabIndex={-1} aria-labelledby="doors-title" className={sectionBase}>
      {/* Static mode: s01's last frame, dimmed (the canvas does this when animated). */}
      <div aria-hidden="true" className="absolute inset-0 anim:hidden">
        <Still sources={sources} plate="s01" frame="last" />
        <div className="absolute inset-0 bg-cream-50/60" />
      </div>
      <Container className="relative flex min-h-screen flex-col justify-end gap-10 py-20">
        <h2 id="doors-title" data-reveal className="on-canvas text-4xl font-bold text-blue-800">
          {t("title")}
        </h2>
        <ul className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-5">
          {DOORS.map(({ key, href, icon: Icon, plate, still }, i) => (
            <li key={key} data-mask="arch" className="rounded-t-full rounded-b-lg">
              <Link
                href={href}
                data-door={i}
                className="group/door flex h-full flex-col overflow-hidden rounded-t-full rounded-b-lg bg-white text-ink no-underline shadow-soft transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift focus-visible:-translate-y-1"
              >
                <span className="relative block aspect-[4/3] overflow-hidden rounded-t-full">
                  {still && namedStillUrl(still) ? (
                    <Image
                      src={namedStillUrl(still)!}
                      alt=""
                      aria-hidden="true"
                      fill
                      sizes="320px"
                      className="object-cover transition-transform duration-500 group-hover/door:scale-105"
                    />
                  ) : (
                    <Still
                      sources={sources}
                      plate={plate}
                      frame="last"
                      sizes="320px"
                      className="transition-transform duration-500 group-hover/door:scale-105"
                    />
                  )}
                </span>
                <span className="flex flex-1 flex-col gap-2 p-6">
                  <span className="flex items-center gap-2 font-heading text-2xl font-bold">
                    <Icon aria-hidden="true" className="size-6 text-blue-800" />
                    {t(`${key}.title`)}
                  </span>
                  <span className="text-muted">{t(`${key}.body`)}</span>
                  <ArrowRight
                    aria-hidden="true"
                    className="mt-auto size-5 text-blue-600 transition-transform group-hover/door:translate-x-1"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

// ─── 3. Meet the pets (no plate; the cards are the content) ──────────────────
export async function PetsScene({ locale }: { locale: Locale }) {
  const [t, tp, f, { pets }] = await Promise.all([
    getTranslations({ locale, namespace: "landing.pets" }),
    getTranslations({ locale, namespace: "pets" }),
    getTranslations({ locale, namespace: "pets.filters" }),
    listPets(parsePetFilters({})),
  ]);
  const featured = pets.slice(0, 8);

  return (
    <section id="scene-pets" data-scene="pets" tabIndex={-1} aria-labelledby="pets-title" className={cn(sectionBase, "bg-white")}>
      <div data-hscroll className="flex flex-col justify-center gap-8 overflow-hidden bg-white py-16">
        <Container className="space-y-2">
          <h2 id="pets-title" className="text-4xl font-bold text-blue-800">
            {t("title")}
          </h2>
          <p className="text-lg">{t("lead")}</p>
        </Container>
        <div className="[perspective:1400px]">
          <ul
            data-hscroll-track
            className="flex gap-6 px-[max(24px,calc((100vw-1280px)/2+24px))] still:flex-wrap still:justify-center anim:snap-x anim:scroll-px-6 anim:overflow-x-auto anim:pb-4"
          >
            {featured.map((pet) => (
              <li key={pet.code} data-hcard className="w-[300px] shrink-0 anim:snap-start">
                <Link
                  href={`/pets/${pet.code}`}
                  className="group/card block overflow-hidden rounded-lg bg-cream-50 text-ink no-underline shadow-soft transition-shadow hover:shadow-lift"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <PetMedia
                      pet={pet}
                      alt={tp("photoAlt", { name: pet.name })}
                      sizes="300px"
                      className="transition-transform duration-500 group-hover/card:scale-105"
                    />
                  </div>
                  <div className="space-y-1 p-5">
                    <p className="font-heading text-xl font-bold">{pet.name}</p>
                    <p className="text-sm">
                      {f(pet.species)} · {f(pet.ageRange)} · {wardLabel(pet.ward, locale)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
            <li data-hcard className="w-[300px] shrink-0 anim:snap-start">
              <Link
                href="/pets"
                className="flex h-full min-h-[300px] flex-col justify-center gap-3 rounded-lg bg-blue-600 p-8 text-white no-underline shadow-soft hover:bg-blue-800"
              >
                <PawPrint aria-hidden="true" className="size-10" />
                <span className="font-heading text-2xl font-bold">{t("seeAll")}</span>
                <span>{t("seeAllBody")}</span>
                <ArrowRight aria-hidden="true" className="size-6" />
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

// ─── 4. The journey (pinned; plates s02 → s09) ───────────────────────────────
const STEP_ICONS: Record<string, LucideIcon> = {
  rescue: PawPrint,
  vet: HeartPulse,
  foster: House,
  match: HeartHandshake,
  adopt: BookHeart,
  follow: CalendarCheck,
};

const navButton =
  "inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-md px-3 font-bold text-blue-600 hover:bg-blue-100 hover:text-blue-800";

export async function JourneyScene({ locale, sources }: P) {
  const t = await getTranslations({ locale, namespace: "landing.journey" });
  return (
    <section
      id="scene-journey"
      data-scene="journey"
      tabIndex={-1}
      aria-labelledby="journey-title"
      className={cn(sectionBase, "still:bg-cream-50")}
    >
      <div data-journey className="anim:h-screen">
        <Container className="grid h-full grid-cols-12 items-center gap-y-8 py-16 lg:gap-x-8">
          <div className="col-span-12 space-y-5 rounded-lg anim:bg-white/95 anim:p-8 anim:shadow-lift lg:col-span-5 still:lg:col-span-12">
            <div className="space-y-2">
              <h2 id="journey-title" className="text-4xl font-bold text-blue-800">
                {t("title")}
              </h2>
              <p className="text-lg">{t("lead")}</p>
            </div>

            {/* Journey spine: six labelled steps; the active one is marked while pinned. */}
            <ol aria-label={t("spineLabel")} className="flex gap-1.5 still:hidden">
              {JOURNEY.map((s, i) => (
                <li key={s.id} className="flex-1">
                  <button
                    type="button"
                    data-journey-go={s.n}
                    data-spine-step
                    data-index={i}
                    data-active={i === 0 ? "" : undefined}
                    className="group/spine flex w-full cursor-pointer flex-col items-start gap-1 text-left"
                  >
                    <span className="block h-1.5 w-full rounded-full bg-blue-100 transition-colors group-data-active/spine:bg-orange-500" />
                    <span className="text-xs font-bold text-muted group-data-active/spine:text-ink">
                      {s.n}. {t(`steps.${s.id}.title`)}
                    </span>
                  </button>
                </li>
              ))}
            </ol>

            <ol className="still:grid still:grid-cols-1 still:gap-5 still:md:grid-cols-2 still:xl:grid-cols-3 anim:relative anim:h-[19rem]">
              {JOURNEY.map((s, i) => {
                const Icon = STEP_ICONS[s.id];
                const plate = s.plates[s.plates.length - 1];
                return (
                  <li
                    key={s.id}
                    id={s.hash}
                    data-step
                    data-index={i}
                    data-active={i === 0 ? "" : undefined}
                    className="scroll-mt-24 space-y-3 still:overflow-hidden still:rounded-lg still:bg-white still:shadow-soft anim:absolute anim:inset-0 anim:translate-y-3 anim:opacity-0 anim:transition-[opacity,transform] anim:duration-300 anim:data-active:translate-y-0 anim:data-active:opacity-100 anim:data-active:duration-700"
                  >
                    {/* Static mode: the step's scene as a still. */}
                    <div className="relative aspect-video anim:hidden">
                      <Still sources={sources} plate={plate} frame="last" sizes="(min-width: 1280px) 400px, 50vw" />
                    </div>
                    <div className="space-y-3 still:px-6 still:pb-6">
                      <p className="text-sm font-bold text-orange-700">{t("stepLabel", { n: s.n })}</p>
                      <h3 tabIndex={-1} className="flex items-center gap-3 text-3xl font-bold outline-none">
                        <span className="inline-flex size-12 items-center justify-center rounded-full bg-peach-200">
                          <Icon aria-hidden="true" className="size-6 text-blue-800" />
                        </span>
                        {t(`steps.${s.id}.title`)}
                      </h3>
                      <p className="flex items-center gap-2 font-semibold text-blue-800">
                        <Users aria-hidden="true" className="size-5" />
                        <span>
                          {t("who")}: {t(`steps.${s.id}.who`)}
                        </span>
                      </p>
                      <p>{t(`steps.${s.id}.body`)}</p>
                      <Link
                        href={s.feature.href}
                        aria-label={`${t("goFeature")}: ${t(`cta.${s.feature.ctaKey}`)}`}
                        data-feature-link
                        className="inline-flex min-h-11 items-center gap-2 font-bold"
                      >
                        {t(`cta.${s.feature.ctaKey}`)}
                        <ArrowRight aria-hidden="true" className="size-5" />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Previous / next: the story works without scrolling (v4 §5.2). */}
            <div className="flex justify-between gap-3 still:hidden">
              <button type="button" data-journey-step-rel="-1" className={navButton}>
                <ChevronLeft aria-hidden="true" className="size-5" />
                {t("prev")}
              </button>
              <button type="button" data-journey-step-rel="1" className={navButton}>
                {t("next")}
                <ChevronRight aria-hidden="true" className="size-5" />
              </button>
            </div>
            <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-blue-100 still:hidden">
              <div data-journey-bar className="h-full origin-left rounded-full bg-orange-500" style={{ transform: "scaleX(0)" }} />
            </div>
          </div>
        </Container>
      </div>
    </section>
  );
}

// ─── 5. Why trust us (no plate) ──────────────────────────────────────────────
const TRUST: Array<{ key: "verified" | "screening" | "safe" | "privacy"; icon: LucideIcon }> = [
  { key: "verified", icon: ShieldCheck },
  { key: "screening", icon: ClipboardCheck },
  { key: "safe", icon: ShieldAlert },
  { key: "privacy", icon: Lock },
];

export async function TrustScene({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "landing.trust" });
  return (
    <section id="scene-trust" data-scene="trust" tabIndex={-1} aria-labelledby="trust-title" className={cn(sectionBase, "bg-cream-50")}>
      <Container className="flex flex-col gap-10 py-24">
        <h2 id="trust-title" data-reveal className="text-4xl font-bold text-blue-800">
          {t("title")}
        </h2>
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {TRUST.map(({ key, icon: Icon }) => (
            <li key={key} data-mask className="space-y-3 rounded-lg bg-white p-7 shadow-soft">
              <Icon aria-hidden="true" className="size-9 text-success" />
              <h3 className="text-2xl font-bold">{t(`${key}.title`)}</h3>
              <p className="text-muted">{t(`${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

// ─── 6. Why it matters: s02 still under a navy scrim; sourced facts only ─────
const FACTS = [
  {
    key: "owned",
    url: "https://nongnghiepmoitruong.vn/tphcm-tang-toc-dung-la-chan-phong-benh-dai-trong-cong-dong-d812919.html",
  },
  { key: "bites", url: "https://www.sggp.org.vn/quan-ly-cho-meo-bang-du-lieu-post826472.html" },
  {
    key: "deaths",
    url: "https://vov.vn/xa-hoi/5-nguoi-tai-tphcm-tu-vong-vi-benh-dai-khong-tiem-vac-xin-sau-khi-bi-cho-meo-can-post1317045.vov",
  },
] as const;

export async function FactsScene({ locale, sources }: P) {
  const t = await getTranslations({ locale, namespace: "landing.facts" });
  const still = SECTION_STILLS.facts;
  return (
    <section
      id="scene-facts"
      data-scene="facts"
      tabIndex={-1}
      aria-labelledby="facts-title"
      className={cn(sectionBase, "overflow-hidden bg-navy-900 text-white")}
    >
      <div data-depth="0.08" aria-hidden="true" className="absolute inset-x-0 -inset-y-[8%]">
        <Still sources={sources} plate={still.plate} frame={still.frame} />
      </div>
      {/* Navy scrim: white text stays ≥ 4.5:1 over the brightest part of the plate. */}
      <div aria-hidden="true" className="absolute inset-0 bg-navy-900/85" />
      <Container className="relative flex min-h-[90vh] flex-col justify-center gap-12 py-24">
        <h2 id="facts-title" data-reveal className="text-4xl font-bold text-white">
          {t("title")}
        </h2>
        <ul className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          {FACTS.map(({ key, url }) => (
            <li key={key} data-reveal className="space-y-4 border-t-2 border-peach-300 pt-6">
              <p className="font-heading text-6xl font-bold text-peach-300">{t(`${key}.value`)}</p>
              <p className="text-lg">{t(`${key}.label`)}</p>
              <p className="text-sm">
                {t("sourceLabel")}:{" "}
                <a href={url} rel="noopener" className="inline-flex items-center gap-1 font-semibold text-peach-200 underline">
                  {t(`${key}.source`)}
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

// ─── 7. One network (s08 on the canvas; still in static mode) ────────────────
const ROLES: Array<{ key: "rescue" | "vet" | "foster" | "adopter" | "sponsor"; icon: LucideIcon; href: string }> = [
  { key: "rescue", icon: PawPrint, href: "/partners" },
  { key: "vet", icon: Stethoscope, href: "/learn" },
  { key: "foster", icon: HandHeart, href: "/foster" },
  { key: "adopter", icon: House, href: "/pets" },
  { key: "sponsor", icon: HeartHandshake, href: "/partners" },
];

export async function NetworkScene({ locale, sources }: P) {
  const [t, tn] = await Promise.all([
    getTranslations({ locale, namespace: "landing.network" }),
    getTranslations({ locale, namespace: "network" }),
  ]);
  // s08 is weak and short, so a live (inert) map carries the meaning. Public layers only.
  const previewSpots = networkItems()
    .filter((i) => i.lat !== null && i.lng !== null)
    .map((i) => ({ id: i.id, name: i.name, layer: i.layer, lat: i.lat!, lng: i.lng!, precision: i.precision, count: i.count, isSample: i.isSample }));
  return (
    <section
      id="scene-network"
      data-scene="network"
      tabIndex={-1}
      aria-labelledby="network-title"
      className={cn(sectionBase, "overflow-hidden")}
    >
      <div aria-hidden="true" className="absolute inset-0 anim:hidden">
        <Still sources={sources} plate="s08" frame="last" />
      </div>
      <Container className="relative grid min-h-screen grid-cols-12 items-center gap-y-8 py-20 lg:gap-x-8">
        <div data-network-reveal="2" className="col-span-12 space-y-6 rounded-lg bg-white/95 p-8 shadow-lift lg:col-span-5">
          <div className="space-y-2">
            <h2 id="network-title" className="text-4xl font-bold text-blue-800">
              {t("title")}
            </h2>
            <p className="text-lg">{t("lead")}</p>
          </div>
          <ul className="space-y-1">
            {ROLES.map(({ key, icon: Icon, href }) => (
              <li key={key}>
                <Link href={href} className="flex items-start gap-4 rounded-md p-3 text-ink no-underline hover:bg-cream-50">
                  <Icon aria-hidden="true" className="mt-1 size-6 shrink-0 text-blue-800" />
                  <span>
                    <span className="font-bold">{t(`${key}.title`)}</span>
                    <span className="text-muted"> · {t(`${key}.body`)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div data-network-reveal="1" className="col-span-12 lg:col-span-7">
          <NetworkPreview spots={previewSpots} label={tn("previewLabel")} cta={tn("openMap")} />
        </div>
      </Container>
    </section>
  );
}

// ─── 8. Stories (honest empty state until consented stories exist) ──────────
export async function StoriesScene({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "landing.stories" });
  return (
    <section id="scene-stories" data-scene="stories" tabIndex={-1} aria-labelledby="stories-title" className={cn(sectionBase, "bg-white")}>
      <Container className="space-y-6 py-24">
        <h2 id="stories-title" data-reveal className="text-4xl font-bold text-blue-800">
          {t("title")}
        </h2>
        <div data-mask className="flex items-center gap-6 rounded-lg bg-cream-50 p-10">
          <BookHeart aria-hidden="true" className="size-12 shrink-0 text-orange-700" />
          <p className="max-w-[60ch] text-lg">{t("empty")}</p>
        </div>
      </Container>
    </section>
  );
}

// ─── 9. Partners (confirmed partners only; none yet) ─────────────────────────
export async function PartnersScene({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "landing.partners" });
  return (
    <section
      id="scene-partners"
      data-scene="partners"
      tabIndex={-1}
      aria-labelledby="partners-title"
      className={cn(sectionBase, "bg-white")}
    >
      <Container className="space-y-6 border-t border-border py-20">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 id="partners-title" className="text-4xl font-bold text-blue-800">
              {t("title")}
            </h2>
            <p className="text-lg text-muted">{t("empty")}</p>
          </div>
          <Button asChild variant="secondary" size="lg">
            <Link href="/partners">
              <HeartHandshake aria-hidden="true" />
              {t("cta")}
            </Link>
          </Button>
        </div>
        {/* Proposed partners: never presented as confirmed; honesty note lives in the footer (SHOW_PROTOTYPE_NOTICE). */}
        <ProposedPartnerCards locale={locale} heading />
      </Container>
    </section>
  );
}

// ─── 10. Final call to action (s07 last frame, the warm door) ────────────────
export async function FinalScene({ locale, sources }: P) {
  const t = await getTranslations({ locale, namespace: "landing.final" });
  const still = SECTION_STILLS.final;
  return (
    <section id="scene-final" data-scene="final" tabIndex={-1} aria-labelledby="final-title" className={cn(sectionBase, "overflow-hidden")}>
      <div data-depth="0.06" aria-hidden="true" className="absolute inset-x-0 -inset-y-[6%]">
        <Still sources={sources} plate={still.plate} frame={still.frame} />
      </div>
      <div aria-hidden="true" className="absolute inset-0 bg-linear-to-b from-cream-50/95 via-cream-50/75 to-transparent" />
      <Container className="relative flex min-h-screen flex-col items-center gap-8 pt-24 pb-16 text-center">
        <h2 id="final-title" data-reveal className="max-w-3xl text-5xl font-bold text-blue-800">
          {t("title")}
        </h2>
        <div data-reveal className="flex flex-wrap justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/pets">
              <House aria-hidden="true" />
              {t("adopt")}
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/foster">
              <HandHeart aria-hidden="true" />
              {t("foster")}
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="bg-white">
            <Link href="/partners">
              <HeartHandshake aria-hidden="true" />
              {t("partner")}
            </Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
