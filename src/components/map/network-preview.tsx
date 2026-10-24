"use client";

import { ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { CityMap, type MapLabels, type MapSpot } from "./city-map";

/**
 * Landing preview of the network map: not interactive, the whole card is one
 * link to /network. The map itself is inert (no focusable markers inside a link).
 */
export function NetworkPreview({ spots, label, cta }: { spots: MapSpot[]; label: string; cta: string }) {
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
        <CityMap spots={spots} labels={labels} interactive={false} height={460} />
      </div>
      <span className="absolute right-4 bottom-8 z-[500] inline-flex min-h-11 items-center gap-2 rounded-md bg-orange-500 px-4 font-bold text-ink shadow-soft transition-transform group-hover/map:-translate-y-0.5">
        {cta}
        <ArrowRight aria-hidden="true" className="size-5" />
      </span>
    </Link>
  );
}
