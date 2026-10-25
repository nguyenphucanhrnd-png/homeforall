import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getPlateSources, sceneImageUrl } from "@/world/plate-sources";
import { MOODS, PLATES, ROUTES } from "@/world/world.config";
import { HeaderParallax } from "./header-parallax";
import { JourneyChip } from "./journey-chip";

/**
 * Scene Header (v4 §5.3): a still of the page's scene, a gradient scrim for
 * ≥ 4.5:1 text, the journey chip, the promise line and the way back to the
 * story. Page content then overlaps it by 48 px as a calm card surface.
 * Pages without a scene (help, dashboards, pet profile) get the chip only.
 */
export async function SceneHeader({
  route,
  locale,
  title,
  children,
}: {
  route: keyof typeof ROUTES;
  locale: Locale;
  title: string;
  children?: ReactNode;
}) {
  const world = ROUTES[route];
  const t = await getTranslations({ locale, namespace: "world" });
  const promise = world.promiseKey ? t(`promise.${world.promiseKey}`) : null;
  const scene = world.sceneHeader;
  const url = scene ? sceneImageUrl(getPlateSources(), scene) : null;

  const meta = (
    <div className="flex flex-wrap items-center gap-3">
      {world.chip !== null && (
        <JourneyChip kind={world.chip} locale={locale} tone={scene ? "onImage" : "light"} />
      )}
      {world.backToStory && (
        <Link
          href={world.backToStory}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white/95 px-4 text-sm font-bold no-underline shadow-soft max-md:min-h-11"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t("backToStory")}
        </Link>
      )}
    </div>
  );

  if (!scene) {
    return (
      <Container className="space-y-4 pt-10 pb-2">
        {meta}
        <h1 className="text-5xl font-bold text-blue-800">{title}</h1>
        {promise && <p className="max-w-[60ch] text-lg">{promise}</p>}
        {children}
      </Container>
    );
  }

  const { focal, mood } = PLATES[scene.plate];
  return (
    <header
      data-scene-header={scene.still ?? scene.plate}
      className="relative isolate -mb-12 min-h-[40vh] overflow-hidden"
      style={{ background: MOODS[mood] }}
    >
      {url && (
        <HeaderParallax>
          {/* Stills are generated at the master's native width (1280 today): next/image never upscales. */}
          <Image
            src={url}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
            style={{ objectPosition: `${focal[0] * 100}% ${focal[1] * 100}%` }}
          />
        </HeaderParallax>
      )}
      {/* Scrim: cream from the left so the title and promise stay ≥ 4.5:1. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-r from-cream-50/95 via-cream-50/75 to-cream-50/10"
      />
      <Container className="flex min-h-[40vh] flex-col justify-center gap-4 pt-10 pb-20">
        {meta}
        <h1 className="max-w-3xl text-5xl font-bold text-blue-800">{title}</h1>
        {promise && <p className="max-w-[56ch] text-lg font-semibold text-ink">{promise}</p>}
        {children}
      </Container>
    </header>
  );
}

/** Chip + "Quay lại hành trình" only, for routes without a scene (e.g. the pet profile). */
export async function RouteMeta({ route, locale }: { route: keyof typeof ROUTES; locale: Locale }) {
  const world = ROUTES[route];
  const t = await getTranslations({ locale, namespace: "world" });
  return (
    <div className="flex flex-wrap items-center gap-3">
      {world.chip !== null && <JourneyChip kind={world.chip} locale={locale} />}
      {world.backToStory && (
        <Link
          href={world.backToStory}
          className="inline-flex min-h-10 items-center gap-1.5 text-sm font-bold max-md:min-h-11"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t("backToStory")}
        </Link>
      )}
    </div>
  );
}
