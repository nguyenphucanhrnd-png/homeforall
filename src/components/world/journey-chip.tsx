import { LifeBuoy, Map, Route, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { useId } from "react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { JOURNEY, type JourneyChipKind } from "@/world/world.config";

type SpineItem = { n: number; title: string; href: string };

/**
 * "Bước 4/6 · Kết nối": tells every page where it sits in Miu's journey (v4
 * story rule 2). Opens the journey spine (native popover, no JS needed) with
 * links back to each step of the pinned story.
 */
export async function JourneyChip({
  kind,
  locale,
  tone = "light",
}: {
  kind: JourneyChipKind;
  locale: Locale;
  tone?: "light" | "onImage";
}) {
  const [t, steps] = await Promise.all([
    getTranslations({ locale, namespace: "world" }),
    getTranslations({ locale, namespace: "landing.journey.steps" }),
  ]);
  const step = typeof kind === "number" ? JOURNEY.find((s) => s.n === kind) : undefined;
  const label = step
    ? t("chipStep", { n: step.n, title: steps(`${step.id}.title`) })
    : kind === "network"
      ? t("chipNetwork")
      : t("chipHelp");

  return (
    <ChipView
      label={label}
      Icon={step ? Route : kind === "network" ? Map : LifeBuoy}
      current={step?.n}
      tone={tone}
      title={t("spineTitle")}
      hint={step ? t("spineHint") : undefined}
      currentLabel={t("current")}
      items={JOURNEY.map((s) => ({ n: s.n, title: steps(`${s.id}.title`), href: `/#${s.hash}` }))}
    />
  );
}

function ChipView({
  label,
  Icon,
  current,
  tone,
  title,
  hint,
  currentLabel,
  items,
}: {
  label: string;
  Icon: LucideIcon;
  current?: number;
  tone: "light" | "onImage";
  title: string;
  hint?: string;
  currentLabel: string;
  items: SpineItem[];
}) {
  const id = `spine-${useId().replace(/:/g, "")}`;
  return (
    <span className="inline-flex">
      <button
        type="button"
        popoverTarget={id}
        data-journey-chip
        className={cn(
          "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-bold shadow-soft ring-1 ring-inset",
          tone === "onImage" ? "bg-white/95 text-ink ring-white/60" : "bg-white text-ink ring-border",
        )}
      >
        <Icon aria-hidden="true" className="size-4 text-orange-700" />
        {label}
      </button>
      <div
        id={id}
        popover="auto"
        className="m-auto w-[min(420px,calc(100vw-32px))] rounded-lg bg-white p-6 text-ink shadow-lift backdrop:bg-navy-900/30"
      >
        <p className="font-heading text-xl font-bold text-blue-800">{title}</p>
        {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
        <ol className="mt-4 space-y-1">
          {items.map((s) => {
            const here = s.n === current;
            return (
              <li key={s.n}>
                <Link
                  href={s.href}
                  aria-current={here ? "step" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-md px-3 text-ink no-underline hover:bg-cream-50",
                    here && "bg-peach-200 font-bold",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                      here ? "bg-orange-500 text-ink" : "bg-blue-100 text-blue-800",
                    )}
                  >
                    {s.n}
                  </span>
                  {s.title}
                  {here && <span className="sr-only">({currentLabel})</span>}
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </span>
  );
}
