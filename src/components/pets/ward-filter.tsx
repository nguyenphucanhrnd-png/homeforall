"use client";

import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useMemo, useRef, useState } from "react";
import { foldVi, HCMC_WARDS, wardBySlug } from "@/data/wards";
import { cn } from "@/lib/utils";

/** How many wards the collapsed group shows (alphabetical). */
export const WARDS_SHOWN = 6;

const option = "flex min-h-10 cursor-pointer items-center gap-3 max-md:min-h-11";

/**
 * "Khu vực" group of the pet filter: the first 6 wards alphabetically, then
 * "Xem thêm (n)" expands in place to a searchable, scrollable list of all wards.
 * Multi-select (OR). Selections outside the first 6 show as removable chips.
 * State is the URL (`?ward=a,b`): `onChange` hands the new list to the filter form.
 */
export function WardFilter({
  selected,
  counts,
  onChange,
  enhanced,
}: {
  selected: string[];
  counts: Record<string, number>;
  onChange: (next: string[]) => void;
  /** false before hydration / without JS: plain full list inside the GET form. */
  enhanced: boolean;
}) {
  const t = useTranslations("pets.filters");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const panelId = useId();
  const searchId = useId();
  const moreRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const first = HCMC_WARDS.slice(0, WARDS_SHOWN);
  const firstSlugs = new Set(first.map((w) => w.slug));
  const extra = selected.filter((s) => !firstSlugs.has(s));
  const matches = useMemo(() => {
    const q = foldVi(query);
    return q ? HCMC_WARDS.filter((w) => foldVi(w.name).includes(q)) : HCMC_WARDS;
  }, [query]);

  const toggle = (slug: string, on: boolean) =>
    onChange(on ? [...selected, slug] : selected.filter((s) => s !== slug));

  const box = (w: { slug: string; name: string }) => (
    <label key={w.slug} className={option}>
      <input
        type="checkbox"
        name="ward"
        value={w.slug}
        checked={selected.includes(w.slug)}
        onChange={(e) => {
          e.stopPropagation(); // the form's own onChange would re-apply without the ward list
          toggle(w.slug, e.target.checked);
        }}
        className="size-5 shrink-0 cursor-pointer accent-blue-600"
      />
      <span className="min-w-0 flex-1">{w.name}</span>
      <span className="text-sm text-muted" aria-hidden="true">
        {counts[w.slug] ?? 0}
      </span>
      <span className="sr-only">({t("wardCount", { count: counts[w.slug] ?? 0 })})</span>
    </label>
  );

  // Without JS the GET form needs every option: render the full list.
  if (!enhanced) {
    return (
      <fieldset className="space-y-2">
        <legend className="mb-2 font-heading text-lg font-bold">{t("ward")}</legend>
        <div className="max-h-80 space-y-2 overflow-y-auto pe-1">{HCMC_WARDS.map(box)}</div>
      </fieldset>
    );
  }

  function expand() {
    setOpen(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  }
  function collapse() {
    setOpen(false);
    setQuery("");
    requestAnimationFrame(() => moreRef.current?.focus());
  }

  // Selected wards that are not rendered as checkboxes right now still submit with the form.
  const rendered = new Set((open ? matches : first).map((w) => w.slug));
  const hidden = selected.filter((s) => !rendered.has(s));

  return (
    <fieldset className="space-y-2" data-testid="ward-filter">
      <legend className="mb-2 font-heading text-lg font-bold">{t("ward")}</legend>

      {(extra.length > 0 || selected.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 pb-1">
          {extra.length > 0 && <span className="sr-only">{t("wardSelected")}:</span>}
          {extra.map((slug) => (
            <button
              key={slug}
              type="button"
              onClick={() => toggle(slug, false)}
              aria-label={t("wardRemove", { ward: wardBySlug(slug)?.name ?? slug })}
              className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full bg-blue-100 px-3 text-sm font-semibold text-blue-800 hover:bg-blue-100/70 max-md:min-h-11"
            >
              {wardBySlug(slug)?.name ?? slug}
              <X aria-hidden="true" className="size-4" />
            </button>
          ))}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="inline-flex min-h-9 cursor-pointer items-center text-sm font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-800 max-md:min-h-11"
            >
              {t("wardClear")}
            </button>
          )}
        </div>
      )}

      {hidden.map((slug) => (
        <input key={slug} type="hidden" name="ward" value={slug} />
      ))}

      {!open && <div className="space-y-2">{first.map(box)}</div>}

      <div id={panelId} hidden={!open} className="space-y-3">
        {open && (
          <>
            <div className="space-y-1">
              <label htmlFor={searchId} className="sr-only">
                {t("wardSearch")}
              </label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
                />
                <input
                  ref={searchRef}
                  id={searchId}
                  type="search"
                  value={query}
                  placeholder={t("wardSearch")}
                  aria-describedby={`${searchId}-hint`}
                  autoComplete="off"
                  onChange={(e) => {
                    e.stopPropagation(); // typing is not a filter change
                    setQuery(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault();
                    if (e.key === "Escape" && query) {
                      e.preventDefault();
                      e.stopPropagation();
                      setQuery("");
                    }
                  }}
                  className="min-h-11 w-full rounded-sm border-2 border-border bg-white ps-9 pe-3"
                />
              </div>
              <p id={`${searchId}-hint`} className="text-xs text-muted">
                {t("wardSearchHint")}
              </p>
            </div>
            <div
              className="max-h-80 space-y-2 overflow-y-auto overscroll-contain pe-1 max-md:max-h-none"
              data-testid="ward-list"
            >
              {matches.length ? matches.map(box) : <p className="text-muted">{t("wardNoMatch")}</p>}
            </div>
          </>
        )}
      </div>

      <button
        ref={moreRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? collapse() : expand())}
        className={cn(
          "inline-flex min-h-10 cursor-pointer items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 max-md:min-h-11",
        )}
      >
        {open ? t("wardLess") : t("wardMore", { count: HCMC_WARDS.length - WARDS_SHOWN })}
        {open ? (
          <ChevronUp aria-hidden="true" className="size-4" />
        ) : (
          <ChevronDown aria-hidden="true" className="size-4" />
        )}
      </button>
    </fieldset>
  );
}
