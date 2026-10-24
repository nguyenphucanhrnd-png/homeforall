"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth/viewer";
import { CLOSE_REASONS, STATUSES, type CloseReason, type ReportStatus } from "@/lib/reports/model";
import { groupAct, ReportError } from "@/lib/reports/store";

// Group inbox actions. A group may act only on reports sent to its own spot
// (the store enforces that too). Who may act for a spot: admins, or anyone on a
// local dev build. Group membership (spot_members) arrives with the database.

const devPages = process.env.NODE_ENV !== "production" || process.env.ENABLE_DEV_PAGES === "true";

async function mayActFor(spotId: string) {
  if (devPages) return true;
  const viewer = await getViewer();
  return Boolean(viewer?.roles.includes("admin")) && spotId.length > 0;
}

export type InboxResult = { ok: true } | { ok: false; error: "forbidden" | "reason_required" | "bad_transition" | "invalid" };

export async function inboxAct(spotId: string, code: string, form: FormData): Promise<InboxResult> {
  if (!(await mayActFor(spotId))) return { ok: false, error: "forbidden" };
  const kind = String(form.get("kind") ?? "");
  try {
    if (kind === "claim") groupAct(spotId, code, { kind: "claim" });
    else if (kind === "decline") groupAct(spotId, code, { kind: "decline", reason: String(form.get("reason") ?? "") });
    else if (kind === "message") {
      const text = String(form.get("text") ?? "").trim();
      if (!text) return { ok: false, error: "invalid" };
      groupAct(spotId, code, { kind: "message", text });
    } else if (kind === "status") {
      const to = String(form.get("to") ?? "") as ReportStatus;
      const reason = String(form.get("closeReason") ?? "") as CloseReason;
      if (!STATUSES.includes(to)) return { ok: false, error: "invalid" };
      groupAct(spotId, code, { kind: "status", to, closeReason: CLOSE_REASONS.includes(reason) ? reason : undefined });
    } else return { ok: false, error: "invalid" };
  } catch (e) {
    if (e instanceof ReportError && ["forbidden", "reason_required", "bad_transition"].includes(e.code)) {
      return { ok: false, error: e.code as "forbidden" };
    }
    throw e;
  }
  revalidatePath("/[locale]/dashboard/[area]", "page");
  revalidatePath("/[locale]/dev/inbox/[spot]", "page");
  return { ok: true };
}
