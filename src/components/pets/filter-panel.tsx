"use client";

import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import { AGE_RANGES, GOOD_WITH, SEXES, SIZES, SPECIES } from "@/lib/pets/types";
import { WARD_SLUGS } from "@/data/wards";
import { WardFilter } from "./ward-filter";

type Option = { value: string; label: string };

/**
 * A plain GET form, so filtering works without JavaScript. With JS, every
 * change updates the URL in place (deep-linkable, back button friendly).
 */
export function FilterPanel({
  partners,
  activeCount,
  wardCounts,
}: {
  partners: Option[];
  activeCount: number;
  /** Pets per ward under the other current filters (ward group excluded). */
  wardCounts: Record<string, number>;
}) {
  const t = useTranslations("pets.filters");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const form = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  // false during SSR / no-JS, true once hydrated: hides the manual "Apply" button.
  const enhanced = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Ward selection comes from the URL (`?ward=a,b`); a pending choice shows instantly
  // until the URL catches up (keyed to the params it was made from).
  const base = params.toString();
  const urlWards = useMemo(
    () => [...new Set(params.getAll("ward").flatMap((v) => v.split(",")))].filter((w) => WARD_SLUGS.has(w)),
    [params],
  );
  const [pendingWards, setPendingWards] = useState<{ base: string; list: string[] } | null>(null);
  const wards = pendingWards && pendingWards.base === base ? pendingWards.list : urlWards;

  function apply(nextWards: string[] = wards) {
    if (!form.current) return;
    const data = new FormData(form.current);
    const next = new URLSearchParams();
    for (const [key, value] of data)
      if (key !== "ward" && typeof value === "string" && value !== "") next.append(key, value);
    const sort = params.get("sort");
    if (sort) next.set("sort", sort);
    // Wards as one readable, shareable parameter: ?ward=an-khanh,an-phu (OR within the group).
    const parts = [
      nextWards.length ? `ward=${nextWards.map(encodeURIComponent).join(",")}` : "",
      next.toString(),
    ].filter(Boolean);
    const query = parts.join("&");
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  function setWards(list: string[]) {
    setPendingWards({ base, list });
    apply(list);
  }

  // Reset in place (no remount) so keyboard focus stays where it was.
  function clear() {
    if (!form.current) return;
    for (const el of form.current.elements) {
      if (el instanceof HTMLInputElement && el.type === "checkbox") el.checked = false;
      if (el instanceof HTMLSelectElement) el.value = "";
    }
    setWards([]);
  }

  const checked = (name: string, value: string) => params.getAll(name).includes(value);
  const group = (name: string, legend: string, options: Option[]) => (
    <fieldset className="space-y-2">
      <legend className="mb-2 font-heading text-lg font-bold">{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className="flex min-h-10 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            name={name}
            value={o.value}
            defaultChecked={checked(name, o.value)}
            className="size-5 cursor-pointer accent-blue-600"
          />
          <span>{o.label}</span>
        </label>
      ))}
    </fieldset>
  );
  const opts = (values: readonly string[]) => values.map((v) => ({ value: v, label: t(v) }));

  return (
    <form
      ref={form}
      method="get"
      onChange={() => apply()}
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      aria-busy={pending}
      className="space-y-6 rounded-lg bg-white p-6 shadow-soft"
    >
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <SlidersHorizontal aria-hidden="true" className="size-5 text-blue-800" />
        {t("title")}
      </h2>
      {group("species", t("species"), opts(SPECIES))}
      <WardFilter selected={wards} counts={wardCounts} onChange={setWards} enhanced={enhanced} />
      {group("age", t("age"), opts(AGE_RANGES))}
      {group("size", t("size"), opts(SIZES))}
      {group("sex", t("sex"), opts(SEXES))}
      {group("good", t("goodWith"), opts(GOOD_WITH))}
      <fieldset className="space-y-2">
        <legend className="mb-2 font-heading text-lg font-bold">{t("health")}</legend>
        {(["vaccinated", "sterilized"] as const).map((name) => (
          <label key={name} className="flex min-h-10 cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              name={name}
              value="1"
              defaultChecked={params.get(name) === "1"}
              className="size-5 cursor-pointer accent-blue-600"
            />
            <span>{t(name)}</span>
          </label>
        ))}
      </fieldset>
      <div className="space-y-2">
        <label htmlFor="filter-partner" className="block font-heading text-lg font-bold">
          {t("partner")}
        </label>
        <select
          id="filter-partner"
          name="partner"
          defaultValue={params.get("partner") ?? ""}
          className="min-h-11 w-full cursor-pointer rounded-sm border-2 border-border bg-white px-3"
        >
          <option value="">{t("anyPartner")}</option>
          {partners.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {!enhanced && (
        <Button type="submit" variant="secondary" className="w-full">
          {t("apply")}
        </Button>
      )}
      {activeCount > 0 && (
        <Button type="button" variant="ghost" onClick={clear} className="w-full">
          {t("clear", { count: activeCount })}
        </Button>
      )}
    </form>
  );
}
