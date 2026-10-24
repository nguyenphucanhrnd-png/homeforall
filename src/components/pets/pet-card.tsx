import { CalendarClock, MapPin, ShieldCheck, Syringe, TriangleAlert, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { relativeDays } from "@/lib/format";
import { isDone, isStale, isVaccinated } from "@/lib/pets/filter";
import type { Pet } from "@/lib/pets/types";
import { wardLabel } from "@/lib/pets/wards";
import { PetMedia } from "./pet-media";
import { SaveButton } from "./save-button";
import { StatusChip } from "./status-chip";

export async function PetCard({ pet, now, locale }: { pet: Pet; now: Date; locale: Locale }) {
  const [t, f] = await Promise.all([
    getTranslations({ locale, namespace: "pets" }),
    getTranslations({ locale, namespace: "pets.filters" }),
  ]);
  const stale = isStale(pet, now);

  // At most three badges (prompt §8), most decision-relevant first.
  const badges = [
    isVaccinated(pet) && { icon: Syringe, label: t("badges.vaccinated") },
    isDone(pet, "sterilization") && { icon: ShieldCheck, label: t("badges.sterilized") },
    pet.goodWith.includes("kids") && { icon: Users, label: t("badges.kids") },
  ].filter(Boolean) as { icon: typeof Syringe; label: string }[];

  return (
    <article
      data-testid="pet-card"
      className="group relative flex w-full flex-col overflow-hidden rounded-lg bg-white shadow-soft transition-shadow duration-200 focus-within:shadow-lift hover:shadow-lift has-[h3_a:focus-visible]:outline-3 has-[h3_a:focus-visible]:outline-offset-4 has-[h3_a:focus-visible]:outline-ring"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <PetMedia
          pet={pet}
          alt={t("photoAlt", { name: pet.name })}
          sizes="(min-width: 1280px) 300px, (min-width: 640px) 50vw, 100vw"
          className="transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none"
        />
        <SaveButton code={pet.code} name={pet.name} className="absolute top-3 right-3 z-10" />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <StatusChip status={pet.status} label={t(`status.${pet.status}`)} className="self-start" />
        <h3 className="text-2xl font-bold text-ink">
          <Link
            href={`/pets/${pet.code}`}
            aria-label={t("card.view", { name: pet.name })}
            className="text-ink no-underline outline-none after:absolute after:inset-0 after:content-['']"
          >
            {pet.name}
          </Link>
        </h3>
        <p className="font-semibold text-ink">
          {f(pet.species)} · {f(pet.ageRange)} · {f(pet.sex)}
        </p>
        <p className="flex items-center gap-1.5 text-muted">
          <MapPin aria-hidden="true" className="size-4" />
          {wardLabel(pet.ward, locale)}
        </p>
        {badges.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {badges.slice(0, 3).map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-1 rounded-sm bg-cream-50 px-2 py-1 text-sm font-semibold text-ink">
                <Icon aria-hidden="true" className="size-4 text-blue-800" />
                {label}
              </li>
            ))}
          </ul>
        )}
        <p className={`mt-auto flex items-center gap-1.5 pt-2 text-sm font-semibold ${stale ? "text-warning" : "text-muted"}`}>
          {stale ? (
            <TriangleAlert aria-hidden="true" className="size-4" />
          ) : (
            <CalendarClock aria-hidden="true" className="size-4" />
          )}
          {stale ? t("card.stale") : t("card.updated", { time: relativeDays(pet.lastConfirmedAt, now, locale) })}
        </p>
      </div>
    </article>
  );
}
