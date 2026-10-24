import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { Container } from "@/components/layout/container";
import { FilterPanel } from "@/components/pets/filter-panel";
import { PetCard } from "@/components/pets/pet-card";
import { SortSelect } from "@/components/pets/sort-select";
import { Button } from "@/components/ui/button";
import { SceneHeader } from "@/components/world/scene-header";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { countActiveFilters, parsePetFilters } from "@/lib/pets/filter";
import { listPets } from "@/lib/pets/repository";

export async function generateMetadata({ params }: PageProps<"/[locale]/pets">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t("adopt") };
}

/** Journey A2: compare pets. Filters on the left, photo-first grid on the right. */
export default async function PetsPage({ params, searchParams }: PageProps<"/[locale]/pets">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "pets" });

  return (
    <>
      <SceneHeader route="/pets" locale={locale} title={t("title")} />
      <Container className="relative space-y-8 pb-12">
        <Suspense fallback={<ResultsSkeleton />}>
          <Results locale={locale} searchParams={searchParams} />
        </Suspense>
      </Container>
    </>
  );
}

async function Results({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: PageProps<"/[locale]/pets">["searchParams"];
}) {
  const filters = parsePetFilters(await searchParams);
  const [{ pets, partners, now }, t] = await Promise.all([
    listPets(filters),
    getTranslations({ locale, namespace: "pets" }),
  ]);

  return (
    <div className="grid grid-cols-12 gap-y-8 lg:gap-x-8">
      <aside className="col-span-12 lg:col-span-3">
        <FilterPanel
          partners={partners.map((p) => ({ value: p.slug, label: p.name }))}
          activeCount={countActiveFilters(filters)}
        />
      </aside>
      <section aria-labelledby="results-heading" className="col-span-12 space-y-6 lg:col-span-9">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="results-heading" aria-live="polite" className="text-2xl font-bold" data-testid="result-count">
            {t("resultCount", { count: pets.length })}
          </h2>
          <SortSelect />
        </div>
        {pets.length > 0 ? (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {pets.map((pet) => (
              <li key={pet.code} className="flex">
                <PetCard pet={pet} now={now} locale={locale} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-4 rounded-lg bg-white p-10 text-center shadow-soft">
            <SearchX aria-hidden="true" className="mx-auto size-12 text-blue-500" />
            <h3 className="text-2xl font-bold">{t("empty.title")}</h3>
            <p className="text-muted">{t("empty.body")}</p>
            <Button asChild variant="secondary">
              <Link href="/pets">{t("empty.cta")}</Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-12 gap-y-8 lg:gap-x-8">
      <div className="col-span-12 h-[640px] rounded-lg bg-white shadow-soft lg:col-span-3" />
      <div className="col-span-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:col-span-9 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-[440px] rounded-lg bg-white shadow-soft" />
        ))}
      </div>
    </div>
  );
}
