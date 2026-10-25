"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { CityMap, type MapLabels, type MapSpot } from "./city-map";

/** Desktop height 460px; phones set --hfa-map-h on the wrapper. */
const PREVIEW_HEIGHT = "var(--hfa-map-h, 460px)";

/**
 * Landing preview of the network map: not interactive, the whole card is one
 * link to /network. The map itself is inert (no focusable markers inside a link).
 * Leaflet loads only when the story says so ("hfa:network-map": phase 2 of the
 * pinned "One network" section, or right away in static mode).
 */
export function NetworkPreview({ spots, label, cta }: { spots: MapSpot[]; label: string; cta: string }) {
  const [load, setLoad] = useState(false);
  useEffect(() => {
    if ((window as unknown as { __hfaNetworkMap?: boolean }).__hfaNetworkMap) {
      const id = requestAnimationFrame(() => setLoad(true));
      return () => cancelAnimationFrame(id);
    }
    const on = () => setLoad(true);
    window.addEventListener("hfa:network-map", on, { once: true });
    return () => window.removeEventListener("hfa:network-map", on);
  }, []);

  const labels: MapLabels = useMemo(
    () => ({ region: label, pin: "", marker: (s) => s.name, cluster: (n) => String(n), popup: () => "" }),
    [label],
  );
  return (
    <Link
      href="/network"
      aria-label={label}
      className="group/map relative block overflow-hidden rounded-lg bg-white no-underline shadow-lift"
      data-testid="network-preview"
    >
      <div inert aria-hidden="true" className="pointer-events-none">
        {load ? (
          <CityMap spots={spots} labels={labels} interactive={false} height={PREVIEW_HEIGHT} />
        ) : (
          <div className="w-full bg-blue-100" style={{ height: PREVIEW_HEIGHT }} />
        )}
      </div>
      <span className="absolute right-4 bottom-8 z-[500] inline-flex min-h-11 items-center gap-2 rounded-md bg-orange-500 px-4 font-bold text-ink shadow-soft transition-transform group-hover/map:-translate-y-0.5">
        {cta}
        <ArrowRight aria-hidden="true" className="size-5" />
      </span>
    </Link>
  );
}
