"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";

export function SortSelect() {
  const t = useTranslations("pets.sort");
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="pet-sort" className="font-semibold">
        {t("label")}
      </label>
      <select
        id="pet-sort"
        value={params.get("sort") === "newest" ? "newest" : "updated"}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value === "newest") next.set("sort", "newest");
          else next.delete("sort");
          const query = next.toString();
          startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
        }}
        className="min-h-11 cursor-pointer rounded-sm border-2 border-border bg-white px-3 font-semibold"
      >
        <option value="updated">{t("updated")}</option>
        <option value="newest">{t("newest")}</option>
      </select>
    </div>
  );
}
