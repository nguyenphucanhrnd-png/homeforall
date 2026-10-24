// "Chỉ đường" links to public places only. Pure: used by server and client.
// Vets/stations: name + public business address (the map app resolves the place).
// Real rescue organisations: their public name (e.g. a rescue café). Other rescue
// points: their ward-level position. Never a report, foster home or volunteer.

const CITY = "Thành phố Hồ Chí Minh";
const base = "https://www.google.com/maps/dir/?api=1&destination=";

export function directionsUrl(t: {
  name: string;
  address?: string | null;
  area?: string | null;
  lat?: number | null;
  lng?: number | null;
  isRealOrg?: boolean;
  layer?: string;
}): string | null {
  if (t.layer === "foster") return null;
  if (t.address) return base + encodeURIComponent([t.name, t.address, t.area, CITY].filter(Boolean).join(", "));
  if (t.isRealOrg && t.layer === "rescue") return base + encodeURIComponent(`${t.name}, ${CITY}`);
  if (t.lat != null && t.lng != null) return `${base}${t.lat.toFixed(5)},${t.lng.toFixed(5)}`;
  return null;
}
