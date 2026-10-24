"use client";

import { Info, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { directionsUrl } from "@/lib/spots/directions";
import { cn } from "@/lib/utils";
import { CityMap, type MapLabels, type MapSpot } from "./city-map";

export type NetworkItem = {
  id: string;
  name: string;
  kind: string;
  layer: MapSpot["layer"];
  ward: string | null;
  area: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  precision: MapSpot["precision"];
  isSample: boolean;
  isRealOrg: boolean;
  count?: number;
  multiBranch?: boolean;
};

const LAYER_KEYS = ["rescue", "vet", "state", "foster", "pilot"] as const;
type LayerKey = (typeof LAYER_KEYS)[number];

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function NetworkExplorer({
  items,
  pilotZones,
  seeded,
  aside,
}: {
  items: NetworkItem[];
  pilotZones: Array<{ name: string; lat: number; lng: number; radius: number }>;
  seeded: boolean;
  aside?: ReactNode;
}) {
  const t = useTranslations("network");
  const params = useSearchParams();
  const initialLayer = params.get("layer");
  const [layers, setLayers] = useState<Set<LayerKey>>(
    () => new Set(initialLayer && (LAYER_KEYS as readonly string[]).includes(initialLayer) ? [initialLayer as LayerKey] : LAYER_KEYS),
  );
  const [ward, setWard] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const wards = useMemo(() => [...new Set(items.map((i) => i.ward).filter(Boolean) as string[])].sort(), [items]);
  const filtered = useMemo(
    () => items.filter((i) => layers.has(i.layer) && (!ward || i.ward === ward)),
    [items, layers, ward],
  );
  const mapSpots: MapSpot[] = useMemo(
    () =>
      filtered
        .filter((i) => i.lat !== null && i.lng !== null)
        .map((i) => ({ id: i.id, name: i.name, layer: i.layer, lat: i.lat!, lng: i.lng!, precision: i.precision, count: i.count, isSample: i.isSample })),
    [filtered],
  );
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const factLine = useCallback(
    (i: NetworkItem) => {
      if (i.layer === "foster") return t("lines.foster", { count: i.count ?? 3 });
      if (i.multiBranch) return t("lines.chain");
      if (i.precision === "district") return t("lines.district");
      if (i.layer === "vet" || i.layer === "state") return t("lines.vet");
      return i.isRealOrg ? t("lines.realOrg") : t("lines.rescue");
    },
    [t],
  );
  const kindLabel = useCallback((i: NetworkItem) => (i.isRealOrg && i.layer === "rescue" ? t("realOrg") : t(`kinds.${i.kind}`)), [t]);

  const labels: MapLabels = useMemo(
    () => ({
      region: t("mapRegion"),
      pin: "",
      cluster: (n) => t("cluster", { count: n }),
      marker: (s) => {
        const i = byId.get(s.id)!;
        return `${i.name}, ${kindLabel(i)}${i.ward ? `, ${i.ward}` : ""}`;
      },
      popup: (s) => {
        const i = byId.get(s.id)!;
        const dir = directionsUrl(i);
        return `<div class="hfa-popup"><p class="hfa-popup-kind">${esc(kindLabel(i))}</p><p class="hfa-popup-name">${esc(i.name)}</p>${
          i.address ? `<p>${esc(i.address)}${i.area ? `, ${esc(i.area)}` : ""}</p>` : i.ward ? `<p>${esc(i.ward)}</p>` : ""
        }<p class="hfa-popup-line">${esc(factLine(i))}</p>${
          dir ? `<p><a class="hfa-popup-dir" href="${esc(dir)}" target="_blank" rel="noopener noreferrer">${esc(t("directions"))} ↗</a></p>` : ""
        }</div>`;
      },
    }),
    [t, byId, kindLabel, factLine],
  );

  const toggle = (l: LayerKey) =>
    setLayers((cur) => {
      const next = new Set(cur);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      return next;
    });

  const onMapItems = filtered.filter((i) => i.lat !== null);
  const listOnly = filtered.filter((i) => i.lat === null);

  return (
    <div className="grid grid-cols-12 items-start gap-y-6 lg:gap-x-6">
      <div className="col-span-12 flex flex-wrap items-center gap-3 rounded-lg bg-white p-4 shadow-soft">
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="sr-only">{t("layers")}</legend>
          {LAYER_KEYS.map((l) => (
            <label
              key={l}
              className={cn(
                "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border-2 px-3 text-sm font-bold",
                layers.has(l) ? "border-blue-600 bg-blue-100 text-blue-800" : "border-border bg-white text-muted",
              )}
            >
              <input type="checkbox" checked={layers.has(l)} onChange={() => toggle(l)} className="size-4 accent-blue-600" />
              <span aria-hidden="true" className={cn("size-3 rounded-full", l === "pilot" ? "border-2 border-dashed border-orange-700" : `hfa-${l}`)} />
              {t(l)}
            </label>
          ))}
        </fieldset>
        <label className="ms-auto flex items-center gap-2 text-sm font-bold">
          {t("ward")}
          <select value={ward} onChange={(e) => setWard(e.target.value)} className="min-h-10 rounded-sm border-2 border-border bg-white px-2">
            <option value="">{t("allWards")}</option>
            {wards.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section aria-labelledby="network-list" className="col-span-12 space-y-3 lg:col-span-3">
        <h2 id="network-list" className="text-xl font-bold">
          {t("listTitle", { count: filtered.length })}
        </h2>
        <ul className="max-h-[600px] space-y-2 overflow-y-auto pe-1" data-testid="network-list">
          {onMapItems.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => setSelected(i.id)}
                aria-current={selected === i.id ? "true" : undefined}
                data-item={i.id}
                className={cn(
                  "flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-md border-2 bg-white p-3 text-left",
                  selected === i.id ? "border-blue-600" : "border-transparent shadow-soft",
                )}
              >
                <span className="flex items-center gap-2 text-xs font-bold text-muted">
                  <span aria-hidden="true" className={cn("size-2.5 rounded-full", `hfa-${i.layer}`)} />
                  {kindLabel(i)}
                </span>
                <span className="font-bold">{i.name}</span>
                <span className="text-sm text-muted">{i.address ?? i.ward ?? i.area}</span>
              </button>
            </li>
          ))}
          {listOnly.length > 0 && (
            <li className="pt-2 text-xs font-bold text-muted" aria-hidden="true">
              {t("listOnly")}
            </li>
          )}
          {listOnly.map((i) => (
            <li key={i.id} data-item={i.id} data-list-only className="rounded-md bg-cream-50 p-3">
              <span className="block text-xs font-bold text-muted">{kindLabel(i)}</span>
              <span className="block font-bold">{i.name}</span>
              <span className="block text-sm text-muted">{[i.address, i.area].filter(Boolean).join(", ") || factLine(i)}</span>
            </li>
          ))}
          {filtered.length === 0 && <li className="text-muted">{t("empty")}</li>}
        </ul>
      </section>

      <div className="col-span-12 space-y-3 lg:col-span-6">
        <CityMap
          spots={mapSpots}
          pilotZones={layers.has("pilot") ? pilotZones : []}
          labels={labels}
          selectedId={selected}
          onSelect={setSelected}
          height={600}
        />
        {!seeded && (
          <p className="flex items-start gap-2 rounded-md bg-cream-50 p-3 text-sm font-semibold text-warning">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {t("notSeeded")}
          </p>
        )}
        <p className="flex items-start gap-2 text-sm text-muted">
          <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t("unverifiedNote")} {t("privacy")}
        </p>
      </div>

      {aside && <aside className="col-span-12 lg:col-span-3">{aside}</aside>}
    </div>
  );
}
