"use client";

import dynamic from "next/dynamic";

export type MapSpot = {
  id: string;
  name: string;
  layer: "rescue" | "vet" | "state" | "foster";
  lat: number;
  lng: number;
  precision: "address" | "ward-approx" | "district" | null;
  count?: number;
  isSample: boolean;
};

export type MapLabels = {
  region: string;
  pin: string;
  marker: (s: MapSpot) => string;
  cluster: (n: number) => string;
  /** Trusted HTML for the popup (built by the caller from our own data, escaped). */
  popup: (s: MapSpot) => string;
  /** Phones: label of the "tap to interact" overlay on interactive maps. */
  interact?: string;
};

export type CityMapProps = {
  spots: MapSpot[];
  pilotZones?: Array<{ name: string; lat: number; lng: number; radius: number }>;
  labels: MapLabels;
  interactive?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  pin?: { lat: number; lng: number } | null;
  onPinChange?: (p: { lat: number; lng: number }) => void;
  className?: string;
  /** px, or any CSS length (e.g. "var(--hfa-map-h, 600px)" so phones can override it in CSS). */
  height?: number | string;
};

/** Leaflet loads only here, after first paint; the skeleton keeps the layout stable (CLS). */
export const CityMap = dynamic(() => import("./city-map-impl"), {
  ssr: false,
  loading: () => <div aria-hidden="true" className="h-full min-h-[360px] w-full animate-pulse rounded-lg bg-blue-100" />,
});
