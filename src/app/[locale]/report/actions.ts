"use server";

import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { distanceBand, nearest, resolveWard, type DistanceBand } from "@/lib/geo/geo";
import { directionsUrl } from "@/lib/spots/directions";
import { RATE_LIMIT } from "@/lib/reports/model";
import { reportSchema } from "@/lib/reports/schema";
import {
  createReport,
  getByToken,
  ReportError,
  reporterAnimalLeft,
  reporterDelete,
  reporterUpdate,
} from "@/lib/reports/store";
import { getSpots, getWards, reportTargets } from "@/lib/spots/repository";
import { layerOf, onMap, type Spot, type SpotContact, type SpotKind } from "@/lib/spots/types";

type Point = { lat: number; lng: number };

/** Ward from our own cached boundaries: no third-party geocoder at runtime. */
export async function locate(p: Point) {
  const res = resolveWard(p, getWards());
  return res ? { ward: res.ward.name, approximate: res.approximate } : null;
}

export async function knownWards() {
  return getWards().map((w) => w.name).sort();
}

export type HelpItem = {
  id: string;
  name: string;
  kind: SpotKind;
  layer: "rescue" | "vet" | "state";
  /** Ward (or old district) only: rescue groups never get a street address. */
  area: string | null;
  /** Vets and state stations only (public business address from the team's list). */
  address: string | null;
  band: DistanceBand;
  lat: number;
  lng: number;
  precision: Spot["location_precision"];
  directions: string | null;
  canReport: boolean;
  contacts: SpotContact[];
};
export type NearestHelp = { rescue: HelpItem[]; vets: HelpItem[]; rescueWithin8: boolean; vetsWithin8: boolean; origin: Point | null };

const WITHIN_METRES = 8000;

/** The 3 nearest rescue points and 3 nearest vets/state stations. Distances leave the server as bands only. */
export async function nearestHelp(input: { point: Point | null; ward: string | null }): Promise<NearestHelp> {
  const origin = input.point ?? getWards().find((w) => w.name === input.ward)?.centroid ?? null;
  if (!origin) return { rescue: [], vets: [], rescueWithin8: false, vetsWithin8: false, origin: null };
  const targets = new Set(reportTargets().map((s) => s.id));
  const placed = getSpots().spots.filter((s) => onMap(s)) as Array<Spot & { lat: number; lng: number }>;
  const pick = (pool: typeof placed) =>
    nearest(pool, origin, 3).map(({ item, metres }) => {
      const layer = layerOf(item.kind) as HelpItem["layer"];
      const isVet = layer === "vet" || layer === "state";
      const address = isVet ? (item.address_raw ?? null) : null;
      const area = item.ward ?? item.legacy_area ?? null;
      return {
        metres,
        item: {
          id: item.id,
          name: item.name,
          kind: item.kind,
          layer,
          area,
          address,
          band: distanceBand(metres),
          lat: item.lat,
          lng: item.lng,
          precision: item.location_precision,
          directions: directionsUrl({ name: item.name, address, area: item.legacy_area, lat: item.lat, lng: item.lng, isRealOrg: item.is_real_org, layer }),
          canReport: targets.has(item.id),
          contacts: isVet ? [] : (item.contacts ?? []).filter((c) => c.source_url),
        } satisfies HelpItem,
      };
    });
  const rescue = pick(placed.filter((s) => layerOf(s.kind) === "rescue"));
  const vets = pick(placed.filter((s) => ["vet", "state"].includes(layerOf(s.kind))));
  return {
    rescue: rescue.map((r) => r.item),
    vets: vets.map((r) => r.item),
    rescueWithin8: rescue.some((r) => r.metres <= WITHIN_METRES),
    vetsWithin8: vets.some((r) => r.metres <= WITHIN_METRES),
    origin,
  };
}

// ─── Submit ───────────────────────────────────────────────────────────────────
const hits = new Map<string, number[]>();

async function clientKey() {
  const h = await headers();
  const jar = await cookies();
  let device = jar.get("hfa_dev")?.value;
  if (!device) {
    device = randomBytes(12).toString("base64url");
    jar.set("hfa_dev", device, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365, path: "/" });
  }
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  return { ip: createHash("sha256").update(ip).digest("hex").slice(0, 16), device };
}

function rateLimited(keys: string[]) {
  const now = Date.now();
  const windowMs = RATE_LIMIT.windowMinutes * 60_000;
  let limited = false;
  for (const k of keys) {
    const recent = (hits.get(k) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= RATE_LIMIT.max) limited = true;
    hits.set(k, recent);
  }
  if (!limited) for (const k of keys) hits.get(k)!.push(now);
  return limited;
}

export type SubmitResult =
  | { ok: true; code: string; token: string; possibleDuplicate: boolean }
  | { ok: false; error: "invalid" | "rate_limited" | "photo_too_large" | "photo_type" | "photo_unreadable" | "no_photo"; fields?: string[] };

export async function submitReport(form: FormData): Promise<SubmitResult> {
  let data: unknown;
  try {
    data = JSON.parse(String(form.get("data") ?? "{}"));
  } catch {
    return { ok: false, error: "invalid" };
  }
  const parsed = reportSchema.safeParse(data);
  if (!parsed.success) {
    // A filled honeypot looks like a normal validation failure to a bot.
    return { ok: false, error: "invalid", fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))] };
  }
  const photos = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (photos.length === 0) return { ok: false, error: "no_photo", fields: ["photos"] };

  const key = await clientKey();
  if (rateLimited([`ip:${key.ip}`, `dev:${key.device}`])) return { ok: false, error: "rate_limited" };

  const v = parsed.data;
  try {
    const res = await createReport(
      {
        type: v.type,
        species: v.species,
        condition: v.condition,
        bitten: v.bitten,
        collar: v.collar,
        note: v.note,
        seenAt: v.seenAt,
        ward: v.ward,
        landmark: v.landmark,
        lat: v.lat,
        lng: v.lng,
        accuracyM: v.accuracyM,
        contact: v.contactEnabled && v.contactConsent ? { value: v.contact, consentAt: new Date().toISOString() } : null,
        recipientIds: v.recipients,
      },
      photos,
    );
    return { ok: true, code: res.code, token: res.token, possibleDuplicate: res.possibleDuplicate };
  } catch (e) {
    if (e instanceof ReportError && ["photo_too_large", "photo_type", "photo_unreadable"].includes(e.code)) {
      return { ok: false, error: e.code as "photo_too_large" };
    }
    throw e;
  }
}

// ─── Reporter actions (secret token only) ────────────────────────────────────
export async function addUpdate(token: string, form: FormData) {
  const photo = form.get("photo");
  await reporterUpdate(token, String(form.get("text") ?? ""), photo instanceof File && photo.size > 0 ? photo : null);
  return { ok: true as const };
}

export async function markAnimalLeft(token: string) {
  reporterAnimalLeft(token);
  return { ok: true as const };
}

export async function deleteMyReport(token: string) {
  if (!getByToken(token)) return { ok: false as const };
  reporterDelete(token);
  return { ok: true as const };
}
