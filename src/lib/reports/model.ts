// Found-animal reports (prompt bundle §C): types, status machine, retention,
// escalation and duplicate rules. Pure functions: unit-tested, used by the store.

export const REPORT_TYPES = ["sighting", "found"] as const; // still there / I have it
export const REPORT_SPECIES = ["cat", "dog", "other"] as const;
export const CONDITIONS = ["healthy", "thin", "injured", "aggressive", "unknown"] as const;
export const COLLAR = ["yes", "no", "unknown"] as const;
export const CLOSE_REASONS = ["reunited", "rehomed", "not_found", "duplicate", "spam"] as const;

export type ReportType = (typeof REPORT_TYPES)[number];
export type Condition = (typeof CONDITIONS)[number];
export type CloseReason = (typeof CLOSE_REASONS)[number];

export const STATUSES = [
  "submitted",
  "sent_to_groups",
  "claimed",
  "on_the_way",
  "animal_secured",
  "treated_or_fostered",
  "closed",
] as const;
export type ReportStatus = (typeof STATUSES)[number];

/** Allowed status moves. `closed` is terminal (with a reason). */
export const TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  submitted: ["sent_to_groups", "closed"],
  sent_to_groups: ["claimed", "closed"],
  claimed: ["on_the_way", "animal_secured", "sent_to_groups", "closed"], // back to groups if the claimer declines
  on_the_way: ["animal_secured", "closed"],
  animal_secured: ["treated_or_fostered", "closed"],
  treated_or_fostered: ["closed"],
  closed: [],
};

export function canTransition(from: ReportStatus, to: ReportStatus) {
  return TRANSITIONS[from].includes(to);
}

/** Injured or aggressive animals, or a bite, show the safety card first and escalate faster. */
export function isUrgent(r: { condition: Condition; bitten?: boolean }) {
  return r.condition === "injured" || r.condition === "aggressive" || Boolean(r.bitten);
}

// ─── Retention (defaults awaiting the team's approval) ──────────────────────
export const RETENTION = {
  /** Exact coordinates are nulled this many days after a report is closed. */
  nullLocationAfterClosedDays: 30,
  /** The whole report (and its photos) is deleted this many days after closing. */
  deleteAfterClosedDays: 90,
} as const;

// ─── Escalation ───────────────────────────────────────────────────────────────
export const ESCALATE_AFTER_MINUTES = { urgent: 60, normal: 24 * 60 } as const;

// ─── Abuse limits ─────────────────────────────────────────────────────────────
export const RATE_LIMIT = { max: 5, windowMinutes: 60 } as const;
export const DUPLICATE = { radiusMetres: 500, windowHours: 24 } as const;

export type ReportEvent = {
  at: string;
  kind:
    | "submitted"
    | "sent"
    | "claimed"
    | "declined"
    | "status"
    | "escalated"
    | "reporter_update"
    | "animal_left"
    | "message"
    | "closed";
  by: "reporter" | "group" | "system";
  spotId?: string;
  status?: ReportStatus;
  text?: string;
  reason?: string;
  photo?: number;
};

export type Report = {
  id: string;
  code: string; // R-xxxxxx, shown to the reporter
  tokenHash: string; // sha256 of the secret tracking token (the token itself is never stored)
  createdAt: string;
  type: ReportType;
  species: (typeof REPORT_SPECIES)[number];
  condition: Condition;
  bitten: boolean;
  collar: (typeof COLLAR)[number];
  note: string;
  seenAt: string;
  ward: string | null;
  landmark: string;
  /** Exact location: shared only with the selected groups; nulled after closing (RETENTION). */
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  photos: number; // count; files live in private storage
  recipients: Array<{ spotId: string; sentAt: string; state: "pending" | "claimed" | "declined"; reason?: string }>;
  contact: { value: string; consentAt: string } | null; // optional, shared only with selected groups
  status: ReportStatus;
  closeReason?: CloseReason;
  closedAt?: string;
  events: ReportEvent[];
  demo: boolean; // true while every recipient is a demo / non-accepting spot
};

/** Retention pass: null coordinates 30 days after closing, delete after 90. */
export function applyRetention(reports: Report[], now: Date) {
  const day = 86_400_000;
  const kept: Report[] = [];
  const deleted: string[] = [];
  for (const r of reports) {
    if (r.status === "closed" && r.closedAt) {
      const age = (now.getTime() - new Date(r.closedAt).getTime()) / day;
      if (age >= RETENTION.deleteAfterClosedDays) {
        deleted.push(r.id);
        continue;
      }
      if (age >= RETENTION.nullLocationAfterClosedDays && (r.lat !== null || r.lng !== null)) {
        kept.push({ ...r, lat: null, lng: null, accuracyM: null });
        continue;
      }
    }
    kept.push(r);
  }
  return { kept, deleted };
}

/**
 * Unclaimed too long (urgent > 60 min, others > 24 h) → send to the next nearest
 * spot not yet contacted, and notify admins. `nextSpot` returns null when the
 * candidates are exhausted (admins are still notified).
 */
export function escalate(r: Report, now: Date, nextSpot: (excluded: string[]) => string | null) {
  if (r.status !== "sent_to_groups") return null;
  if (r.recipients.some((x) => x.state === "claimed")) return null;
  const lastSent = Math.max(...r.recipients.map((x) => new Date(x.sentAt).getTime()), new Date(r.createdAt).getTime());
  const limit = (isUrgent(r) ? ESCALATE_AFTER_MINUTES.urgent : ESCALATE_AFTER_MINUTES.normal) * 60_000;
  if (now.getTime() - lastSent < limit) return null;
  const spotId = nextSpot(r.recipients.map((x) => x.spotId));
  const at = now.toISOString();
  const updated: Report = {
    ...r,
    recipients: spotId ? [...r.recipients, { spotId, sentAt: at, state: "pending" }] : r.recipients,
    events: [...r.events, { at, kind: "escalated", by: "system", spotId: spotId ?? undefined }],
  };
  return { report: updated, notifyAdmins: true, spotId };
}

/** Possible duplicate: same ward, within 500 m and 24 h of another open report. */
export function findDuplicate(
  candidate: { ward: string | null; lat: number | null; lng: number | null; createdAt: string },
  others: readonly Report[],
  distance: (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => number,
) {
  const t = new Date(candidate.createdAt).getTime();
  return others.find((o) => {
    if (o.status === "closed" || !candidate.ward || o.ward !== candidate.ward) return false;
    if (Math.abs(t - new Date(o.createdAt).getTime()) > DUPLICATE.windowHours * 3_600_000) return false;
    if (candidate.lat === null || candidate.lng === null || o.lat === null || o.lng === null) return true; // same ward, no coords
    return distance({ lat: candidate.lat, lng: candidate.lng }, { lat: o.lat, lng: o.lng }) <= DUPLICATE.radiusMetres;
  });
}
