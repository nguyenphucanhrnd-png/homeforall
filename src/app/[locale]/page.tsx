import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { SCENES, type SceneId } from "@/components/landing/scenes";
import {
  DoorsScene,
  FactsScene,
  FinalScene,
  HeroScene,
  JourneyScene,
  NetworkScene,
  PartnersScene,
  PetsScene,
  StoriesScene,
  TrustScene,
} from "@/components/landing/sections";
import { StoryShell } from "@/components/landing/story-shell";
import type { Locale } from "@/i18n/routing";
import { getPlateSources } from "@/world/plate-sources";

/**
 * Landing: the journey of Miu (Master Prompt v4). Every scene is server-rendered
 * HTML; the shell adds Lenis, GSAP and the plate canvas only when the device and
 * the visitor's preferences allow it. Static mode tells the same story in stills.
 */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const sources = getPlateSources();

  return (
    // One boundary so the shell hydrates with every scene present (pins need them).
    <Suspense fallback={<HeroScene locale={locale} sources={sources} />}>
      <Story locale={locale} />
    </Suspense>
  );
}

async function Story({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "landing" });
  const sources = getPlateSources();
  const sceneLabels = Object.fromEntries(SCENES.map((id) => [id, t(`scenes.${id}`)])) as Record<SceneId, string>;

  return (
    <StoryShell sources={sources} locale={locale} sceneLabels={sceneLabels} navLabel={t("sceneNav")} reduceLabel={t("reduceEffects")}>
      <HeroScene locale={locale} sources={sources} />
      <DoorsScene locale={locale} sources={sources} />
      <PetsScene locale={locale} />
      <JourneyScene locale={locale} sources={sources} />
      <TrustScene locale={locale} />
      <FactsScene locale={locale} sources={sources} />
      <NetworkScene locale={locale} sources={sources} />
      <StoriesScene locale={locale} />
      <PartnersScene locale={locale} />
      <FinalScene locale={locale} sources={sources} />
    </StoryShell>
  );
}
