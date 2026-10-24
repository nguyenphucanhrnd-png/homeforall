import { CircleCheck, CircleDashed } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/format";
import { coreCareProgress } from "@/lib/pets/filter";
import { HEALTH_EVENTS, type Pet } from "@/lib/pets/types";

/** Health timeline + progress ring. The ring is information, not a score (prompt §8). */
export async function HealthTimeline({ pet, locale }: { pet: Pet; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "petProfile" });
  const { done, total } = coreCareProgress(pet);
  const events = [...pet.health].sort(
    (a, b) => HEALTH_EVENTS.indexOf(a.type) - HEALTH_EVENTS.indexOf(b.type),
  );

  const r = 34;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="grid grid-cols-1 items-start gap-8 sm:grid-cols-[auto_1fr]">
      <figure className="flex w-36 flex-col items-center gap-2 text-center">
        <svg viewBox="0 0 80 80" className="size-28 -rotate-90" aria-hidden="true">
          <circle cx="40" cy="40" r={r} fill="none" stroke="var(--blue-100)" strokeWidth="8" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="var(--success)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(done / total) * circumference} ${circumference}`}
          />
        </svg>
        <figcaption className="text-sm font-bold">{t("healthProgress", { done, total })}</figcaption>
      </figure>
      <div className="space-y-3">
        <ol className="space-y-2">
          {events.map((e) => (
            <li key={e.type} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md border border-border bg-white px-4 py-3">
              <span className="flex items-center gap-2 font-semibold">
                {e.date ? (
                  <CircleCheck aria-hidden="true" className="size-5 text-success" />
                ) : (
                  <CircleDashed aria-hidden="true" className="size-5 text-muted" />
                )}
                {t(`healthEvents.${e.type}`)}
              </span>
              <span className={e.date ? "text-success" : "text-muted"}>
                {e.date ? t("done", { date: formatDate(e.date, locale) }) : t("planned")}
              </span>
            </li>
          ))}
        </ol>
        <p className="text-sm text-muted">{t("healthNote")}</p>
      </div>
    </div>
  );
}
