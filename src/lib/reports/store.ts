import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { haversine, nearest } from "@/lib/geo/geo";
import { reportTargets } from "@/lib/spots/repository";
import {
  applyRetention,
  canTransition,
  escalate,
  findDuplicate,
  type CloseReason,
  type Report,
  type ReportEvent,
  type ReportStatus,
} from "./model";

// DEMO store until the database exists: one JSON file + private photo folder in
// .data/ (git-ignored, outside public/). Same contract as the planned tables
// (supabase/migrations/*_reports.sql): reporter by token only, groups only see
// reports sent to them, nobody reads anonymously.

const DATA = process.env.HFA_DATA_DIR ?? join(process.cwd(), ".data");
const FILE = join(DATA, "reports.json");
const UPLOADS = join(DATA, "uploads");
const ADMIN = join(DATA, "admin-notifications.json");

export const PHOTO_LIMITS = { maxFiles: 3, maxBytes: 10 * 1024 * 1024, maxEdge: 1600 } as const;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function ensure() {
  mkdirSync(UPLOADS, { recursive: true });
}

function load(): Report[] {
  ensure();
  if (!existsSync(FILE)) return [];
  const all: Report[] = JSON.parse(readFileSync(FILE, "utf8")).reports ?? [];
  const { kept, deleted } = applyRetention(all, new Date());
  if (deleted.length || kept.some((r, i) => r !== all[i])) {
    for (const id of deleted) rmSync(join(UPLOADS, id), { recursive: true, force: true });
    save(kept);
  }
  return kept;
}

function save(reports: Report[]) {
  ensure();
  writeFileSync(FILE, JSON.stringify({ reports }, null, 1));
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

function secret(): Buffer {
  if (process.env.REPORT_SIGNING_SECRET) return Buffer.from(process.env.REPORT_SIGNING_SECRET);
  ensure();
  const f = join(DATA, "signing.key");
  if (!existsSync(f)) writeFileSync(f, randomBytes(32).toString("hex"));
  return Buffer.from(readFileSync(f, "utf8"));
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function newCode(existing: Set<string>) {
  for (;;) {
    const bytes = randomBytes(6);
    const code = `R-${[...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("")}`;
    if (!existing.has(code)) return code;
  }
}

// ─── Photos: re-encode, strip ALL metadata (EXIF/GPS), private storage ──────
export async function processPhoto(file: File) {
  if (file.size > PHOTO_LIMITS.maxBytes) throw new ReportError("photo_too_large");
  if (file.type && !ACCEPTED.has(file.type)) throw new ReportError("photo_type");
  const input = Buffer.from(await file.arrayBuffer());
  try {
    // .rotate() applies the EXIF orientation; sharp drops all metadata unless asked to keep it.
    return await sharp(input, { failOn: "error" })
      .rotate()
      .resize({ width: PHOTO_LIMITS.maxEdge, height: PHOTO_LIMITS.maxEdge, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    // e.g. HEIC from an iPhone when the browser did not convert it first
    throw new ReportError("photo_unreadable");
  }
}

export function signPhoto(reportId: string, n: number, ttlSeconds = 600) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = createHmac("sha256", secret()).update(`${reportId}/${n}/${exp}`).digest("base64url");
  return `/api/report-photo?r=${encodeURIComponent(reportId)}&n=${n}&exp=${exp}&sig=${sig}`;
}

export function readSignedPhoto(reportId: string, n: number, exp: number, sig: string): Buffer | null {
  if (!/^[a-z0-9-]+$/i.test(reportId) || !Number.isInteger(n) || n < 1 || n > PHOTO_LIMITS.maxFiles) return null;
  if (exp < Math.floor(Date.now() / 1000)) return null;
  const want = createHmac("sha256", secret()).update(`${reportId}/${n}/${exp}`).digest();
  const got = Buffer.from(sig, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  const f = join(UPLOADS, reportId, `${n}.webp`);
  return existsSync(f) ? readFileSync(f) : null;
}

export class ReportError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────
export type NewReport = Omit<
  Report,
  "id" | "code" | "tokenHash" | "createdAt" | "photos" | "recipients" | "status" | "events" | "demo"
> & { recipientIds: string[] };

export async function createReport(input: NewReport, photos: File[]) {
  const reports = load();
  const targets = new Map(reportTargets().map((s) => [s.id, s]));
  const recipientIds = input.recipientIds.filter((id) => targets.has(id)).slice(0, 3);
  const processed = await Promise.all(photos.slice(0, PHOTO_LIMITS.maxFiles).map(processPhoto));

  const now = new Date().toISOString();
  const token = randomBytes(24).toString("base64url");
  const id = randomBytes(9).toString("hex");
  const code = newCode(new Set(reports.map((r) => r.code)));
  const demo = recipientIds.every((sid) => {
    const s = targets.get(sid)!;
    return s.is_sample || !s.accepts_reports;
  });
  const duplicate = findDuplicate({ ward: input.ward, lat: input.lat, lng: input.lng, createdAt: now }, reports, haversine);

  const report: Report = {
    id,
    code,
    tokenHash: sha256(token),
    createdAt: now,
    type: input.type,
    species: input.species,
    condition: input.condition,
    bitten: input.bitten,
    collar: input.collar,
    note: input.note,
    seenAt: input.seenAt,
    ward: input.ward,
    landmark: input.landmark,
    lat: input.lat,
    lng: input.lng,
    accuracyM: input.accuracyM,
    photos: processed.length,
    recipients: recipientIds.map((spotId) => ({ spotId, sentAt: now, state: "pending" as const })),
    contact: input.contact,
    status: recipientIds.length ? "sent_to_groups" : "submitted",
    events: [
      { at: now, kind: "submitted", by: "reporter" },
      ...recipientIds.map((spotId): ReportEvent => ({ at: now, kind: "sent", by: "system", spotId })),
    ],
    demo,
  };

  mkdirSync(join(UPLOADS, id), { recursive: true });
  processed.forEach((buf, i) => writeFileSync(join(UPLOADS, id, `${i + 1}.webp`), buf));
  save([...reports, report]);
  return { code, token, report, possibleDuplicate: Boolean(duplicate) };
}

// ─── Reporter (by secret token only) ──────────────────────────────────────────
export function getByToken(token: string): Report | null {
  if (!token || token.length < 20) return null;
  const hash = sha256(token);
  return load().find((r) => {
    const a = Buffer.from(r.tokenHash, "hex");
    const b = Buffer.from(hash, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  }) ?? null;
}

function mutate(id: string, fn: (r: Report) => Report | null) {
  const reports = load();
  const i = reports.findIndex((r) => r.id === id);
  if (i < 0) throw new ReportError("not_found");
  const next = fn(reports[i]);
  if (next === null) {
    reports.splice(i, 1);
    rmSync(join(UPLOADS, id), { recursive: true, force: true });
  } else reports[i] = next;
  save(reports);
  return next;
}

export async function reporterUpdate(token: string, text: string, photo: File | null) {
  const r = getByToken(token);
  if (!r) throw new ReportError("not_found");
  let n: number | undefined;
  if (photo && photo.size > 0) {
    if (r.photos >= PHOTO_LIMITS.maxFiles + 3) throw new ReportError("photo_limit");
    const buf = await processPhoto(photo);
    n = r.photos + 1;
    writeFileSync(join(UPLOADS, r.id, `${n}.webp`), buf);
  }
  return mutate(r.id, (x) => ({
    ...x,
    photos: n ?? x.photos,
    events: [...x.events, { at: new Date().toISOString(), kind: "reporter_update", by: "reporter", text: text.slice(0, 280), photo: n }],
  }));
}

export function reporterAnimalLeft(token: string) {
  const r = getByToken(token);
  if (!r) throw new ReportError("not_found");
  return mutate(r.id, (x) => ({ ...x, events: [...x.events, { at: new Date().toISOString(), kind: "animal_left", by: "reporter" }] }));
}

export function reporterDelete(token: string) {
  const r = getByToken(token);
  if (!r) throw new ReportError("not_found");
  mutate(r.id, () => null);
}

// ─── Groups: only reports sent to their spot ──────────────────────────────────
export function forGroup(spotId: string): Report[] {
  runEscalation(new Date());
  return load().filter((r) => r.recipients.some((x) => x.spotId === spotId));
}

export function groupGet(spotId: string, code: string): Report | null {
  return forGroup(spotId).find((r) => r.code === code) ?? null;
}

type GroupAction =
  | { kind: "claim" }
  | { kind: "decline"; reason: string }
  | { kind: "status"; to: ReportStatus; closeReason?: CloseReason }
  | { kind: "message"; text: string };

export function groupAct(spotId: string, code: string, action: GroupAction) {
  const r = groupGet(spotId, code);
  if (!r) throw new ReportError("forbidden"); // not sent to this group (or unknown): indistinguishable
  const at = new Date().toISOString();
  return mutate(r.id, (x) => {
    switch (action.kind) {
      case "claim": {
        if (!canTransition(x.status, "claimed")) throw new ReportError("bad_transition");
        return {
          ...x,
          status: "claimed",
          recipients: x.recipients.map((p) => (p.spotId === spotId ? { ...p, state: "claimed" } : p)),
          events: [...x.events, { at, kind: "claimed", by: "group", spotId }],
        };
      }
      case "decline": {
        if (!action.reason.trim()) throw new ReportError("reason_required");
        const claimedByMe = x.recipients.some((p) => p.spotId === spotId && p.state === "claimed");
        return {
          ...x,
          status: claimedByMe ? "sent_to_groups" : x.status,
          recipients: x.recipients.map((p) => (p.spotId === spotId ? { ...p, state: "declined", reason: action.reason.slice(0, 200) } : p)),
          events: [...x.events, { at, kind: "declined", by: "group", spotId, reason: action.reason.slice(0, 200) }],
        };
      }
      case "status": {
        if (!canTransition(x.status, action.to)) throw new ReportError("bad_transition");
        if (action.to === "closed" && !action.closeReason) throw new ReportError("reason_required");
        return {
          ...x,
          status: action.to,
          closeReason: action.to === "closed" ? action.closeReason : x.closeReason,
          closedAt: action.to === "closed" ? at : x.closedAt,
          events: [...x.events, { at, kind: action.to === "closed" ? "closed" : "status", by: "group", spotId, status: action.to, reason: action.closeReason }],
        };
      }
      case "message":
        return { ...x, events: [...x.events, { at, kind: "message", by: "group", spotId, text: action.text.slice(0, 500) }] };
    }
  });
}

// ─── Escalation (run lazily; a cron job replaces this with the database) ─────
export function runEscalation(now: Date) {
  const reports = load();
  const targets = reportTargets();
  let changed = false;
  const notices: Array<{ at: string; code: string; spotId: string | null }> = [];
  const next = reports.map((r) => {
    const origin = r.lat !== null && r.lng !== null ? { lat: r.lat, lng: r.lng } : null;
    const res = escalate(r, now, (excluded) => {
      if (!origin) return null;
      const pool = targets.filter((s) => !excluded.includes(s.id)) as Array<(typeof targets)[number] & { lat: number; lng: number }>;
      return nearest(pool, origin, 1)[0]?.item.id ?? null;
    });
    if (!res) return r;
    changed = true;
    notices.push({ at: now.toISOString(), code: r.code, spotId: res.spotId });
    return res.report;
  });
  if (changed) {
    save(next);
    const prev = existsSync(ADMIN) ? JSON.parse(readFileSync(ADMIN, "utf8")) : [];
    writeFileSync(ADMIN, JSON.stringify([...prev, ...notices], null, 1));
  }
}

/** Tracking-page view: never exposes other people's data or exact coordinates. */
export function publicView(r: Report) {
  const names = new Map(reportTargets().map((s) => [s.id, s.name]));
  return {
    code: r.code,
    createdAt: r.createdAt,
    type: r.type,
    species: r.species,
    condition: r.condition,
    ward: r.ward,
    status: r.status,
    closeReason: r.closeReason ?? null,
    demo: r.demo,
    photos: Array.from({ length: r.photos }, (_, i) => signPhoto(r.id, i + 1)),
    recipients: r.recipients.map((p) => ({ name: names.get(p.spotId) ?? p.spotId, state: p.state })),
    events: r.events.map((e) => ({ at: e.at, kind: e.kind, by: e.by, status: e.status ?? null, text: e.text ?? null, reason: e.reason ?? null, spot: e.spotId ? (names.get(e.spotId) ?? null) : null })),
  };
}
export type PublicReportView = ReturnType<typeof publicView>;
