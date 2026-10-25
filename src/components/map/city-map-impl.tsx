"use client";

import L from "leaflet";
import "leaflet.markercluster";
import "./leaflet.css";
import { useEffect, useRef, useState } from "react";
import { PHONE_QUERY } from "@/world/world.config";
import type { MapSpot, CityMapProps } from "./city-map";

// Leaflet is loaded only on pages that show a map (next/dynamic, ssr: false).
// DEMO tiles: OpenStreetMap Germany's community server. tile.openstreetmap.org
// is blocked on the team's network; CARTO basemaps now return "API key
// required". Community servers are not for production: a provider must be
// chosen and approved before launch (see CLAUDE.md → Maps).
const TILE_URL = "https://tile.openstreetmap.de/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors (tiles: openstreetmap.de)';
export const HCMC_CENTRE: [number, number] = [10.78, 106.7];

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function markerIcon(spot: MapSpot, label: string, selected: boolean) {
  const count =
    spot.layer === "foster" && spot.count ? `<span class="hfa-marker-count">${spot.count}</span>` : "";
  return L.divIcon({
    className: "hfa-marker-wrap",
    html: `<button type="button" class="hfa-marker hfa-${spot.layer}${spot.precision === "district" ? " hfa-district" : ""}${selected ? " is-selected" : ""}" aria-label="${esc(label)}" data-spot="${esc(spot.id)}">${count}</button>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

export default function CityMapImpl({
  spots,
  pilotZones = [],
  labels,
  interactive = true,
  selectedId,
  onSelect,
  pin,
  onPinChange,
  className,
  height = 560,
}: CityMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const cluster = useRef<L.MarkerClusterGroup | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const pinMarker = useRef<L.Marker | null>(null);
  const zones = useRef<L.LayerGroup | null>(null);
  const pinChange = useRef(onPinChange);
  const reduced = typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Phones: the map must not trap page scrolling. It starts locked behind a
  // "tap to interact" overlay, and shows no popups (pages use a bottom sheet).
  const [phone] = useState(() => typeof window !== "undefined" && matchMedia(PHONE_QUERY).matches);
  const [locked, setLocked] = useState(phone && interactive);

  // Create the map once.
  useEffect(() => {
    if (!el.current || map.current) return;
    const markerMap = markers.current;
    const m = L.map(el.current, {
      center: HCMC_CENTRE,
      zoom: 12,
      zoomControl: interactive,
      dragging: interactive && !phone,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive && !phone,
      touchZoom: interactive && !phone,
      boxZoom: interactive,
      keyboard: interactive,
      zoomAnimation: !reduced,
      fadeAnimation: !reduced,
      markerZoomAnimation: !reduced,
      attributionControl: true,
    });
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 18 }).addTo(m);
    zones.current = L.layerGroup().addTo(m);
    cluster.current = L.markerClusterGroup({
      showCoverageOnHover: false,
      animate: !reduced,
      maxClusterRadius: 40,
      iconCreateFunction: (c) =>
        L.divIcon({
          className: "hfa-marker-wrap",
          html: `<button type="button" class="hfa-cluster" aria-label="${esc(labels.cluster(c.getChildCount()))}">${c.getChildCount()}</button>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
    });
    m.addLayer(cluster.current);
    map.current = m;
    // Collapsible containers (phones) and late layout: keep the tiles in sync with the box.
    const ro = new ResizeObserver(() => m.invalidateSize({ animate: false }));
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
      markerMap.clear();
      pinMarker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the map is created once; props are applied below
  }, []);

  // Spots → markers.
  useEffect(() => {
    const c = cluster.current;
    if (!c) return;
    c.clearLayers();
    markers.current.clear();
    for (const s of spots) {
      const marker = L.marker([s.lat, s.lng], {
        icon: markerIcon(s, labels.marker(s), s.id === selectedId),
        keyboard: false, // the inner <button> is the focusable control
        title: s.name,
      });
      if (!phone) marker.bindPopup(labels.popup(s), { maxWidth: 280, autoPan: !reduced });
      marker.on("click", () => onSelect?.(s.id));
      markers.current.set(s.id, marker);
      c.addLayer(marker);
    }
  }, [spots, labels, onSelect, selectedId, reduced, phone]);

  // Pilot zones as circles.
  useEffect(() => {
    const z = zones.current;
    if (!z) return;
    z.clearLayers();
    for (const p of pilotZones) {
      L.circle([p.lat, p.lng], {
        radius: p.radius,
        color: "#C2410C",
        weight: 2,
        dashArray: "6 6",
        fillColor: "#FF993D",
        fillOpacity: 0.08,
        interactive: false,
      })
        .bindTooltip(p.name, { permanent: true, direction: "center", className: "hfa-zone-label" })
        .addTo(z);
    }
  }, [pilotZones]);

  // Selection from the list: centre and open the popup.
  useEffect(() => {
    const m = map.current;
    const marker = selectedId ? markers.current.get(selectedId) : undefined;
    if (!m || !marker || !cluster.current) return;
    cluster.current.zoomToShowLayer(marker, () => {
      if (!phone) marker.openPopup();
    });
  }, [selectedId, phone]);

  function unlock() {
    const m = map.current;
    if (m) {
      m.dragging.enable();
      m.touchZoom.enable();
      m.doubleClickZoom.enable();
    }
    setLocked(false);
  }

  // Draggable pin (report flow). The handler lives in a ref so map clicks always
  // reach the latest callback, and a click can place the very first pin.
  useEffect(() => {
    pinChange.current = onPinChange;
  }, [onPinChange]);

  const pinMode = Boolean(onPinChange);
  useEffect(() => {
    const m = map.current;
    if (!m || !pinMode) return;
    const onClick = (e: L.LeafletMouseEvent) => pinChange.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    m.on("click", onClick);
    return () => {
      m.off("click", onClick);
    };
  }, [pinMode]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!pin) {
      pinMarker.current?.remove();
      pinMarker.current = null;
      return;
    }
    if (!pinMarker.current) {
      pinMarker.current = L.marker([pin.lat, pin.lng], {
        draggable: true,
        keyboard: true,
        title: labels.pin,
        alt: labels.pin,
        icon: L.divIcon({
          className: "hfa-marker-wrap",
          html: `<span class="hfa-pin" aria-hidden="true"></span>`,
          iconSize: [34, 44],
          iconAnchor: [17, 42],
        }),
      }).addTo(m);
      pinMarker.current.on("dragend", () => {
        const ll = pinMarker.current!.getLatLng();
        pinChange.current?.({ lat: ll.lat, lng: ll.lng });
      });
    } else {
      pinMarker.current.setLatLng([pin.lat, pin.lng]);
    }
    if (!m.getBounds().pad(-0.2).contains([pin.lat, pin.lng]))
      m.setView([pin.lat, pin.lng], Math.max(m.getZoom(), 15), { animate: !reduced });
  }, [pin, labels.pin, reduced]);

  const box = (
    <div
      ref={el}
      role="region"
      aria-label={labels.region}
      className={className}
      style={{ height, width: "100%", borderRadius: 16, overflow: "hidden" }}
    />
  );
  // Desktop/tablet render exactly the map box; only phones get the wrapper + overlay.
  if (!phone || !interactive) return box;
  return (
    <div className="relative">
      {box}
      {locked && (
        <button
          type="button"
          onClick={unlock}
          className="absolute inset-0 z-[600] flex cursor-pointer items-end justify-center rounded-2xl bg-ink/10 p-4"
        >
          <span className="inline-flex min-h-11 items-center rounded-full bg-white px-4 font-bold text-ink shadow-lift">
            {labels.interact ?? "Tap to interact"}
          </span>
        </button>
      )}
    </div>
  );
}
