"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { inboxAct } from "@/app/[locale]/report/inbox-actions";
import { Button } from "@/components/ui/button";
import { CLOSE_REASONS, type ReportStatus } from "@/lib/reports/model";

const field = "block min-h-11 w-full rounded-sm border-2 border-border bg-white px-3";

/** Claim / decline (reason required) / status / message, for one report in a group inbox. */
export function InboxActions({
  spotId,
  code,
  canClaim,
  canDecline,
  next,
}: {
  spotId: string;
  code: string;
  canClaim: boolean;
  canDecline: boolean;
  next: ReportStatus[];
}) {
  const t = useTranslations("inbox");
  const tr = useTranslations("report");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [to, setTo] = useState<ReportStatus | "">("");

  const send = (fd: FormData) =>
    start(async () => {
      setError(null);
      const res = await inboxAct(spotId, code, fd);
      if (res.ok) router.refresh();
      else setError(t(`errors.${res.error}`));
    });
  const one = (kind: string) => {
    const fd = new FormData();
    fd.set("kind", kind);
    send(fd);
  };

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-end gap-3">
        {canClaim && (
          <Button type="button" size="sm" disabled={pending} onClick={() => one("claim")}>
            {t("claim")}
          </Button>
        )}
        {next.length > 0 && (
          <form action={send} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="kind" value="status" />
            <label className="text-sm font-bold">
              {t("setStatus")}
              <select name="to" value={to} onChange={(e) => setTo(e.target.value as ReportStatus)} className={field} required>
                <option value="">—</option>
                {next.map((s) => (
                  <option key={s} value={s}>
                    {tr(`statuses.${s}`)}
                  </option>
                ))}
              </select>
            </label>
            {to === "closed" && (
              <label className="text-sm font-bold">
                {t("closeReason")}
                <select name="closeReason" className={field} required>
                  <option value="">—</option>
                  {CLOSE_REASONS.map((c) => (
                    <option key={c} value={c}>
                      {tr(`closeReasons.${c}`)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Button type="submit" size="sm" variant="secondary" disabled={pending}>
              {t("save")}
            </Button>
          </form>
        )}
      </div>
      {canDecline && (
        <form action={send} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="kind" value="decline" />
          <label className="min-w-[240px] flex-1 text-sm font-bold">
            {t("declineReason")}
            <input name="reason" required maxLength={200} className={field} />
          </label>
          <Button type="submit" size="sm" variant="ghost" disabled={pending}>
            {t("decline")}
          </Button>
        </form>
      )}
      <form action={send} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="kind" value="message" />
        <label className="min-w-[240px] flex-1 text-sm font-bold">
          {t("message")}
          <input name="text" required maxLength={500} className={field} />
        </label>
        <Button type="submit" size="sm" variant="ghost" disabled={pending}>
          {t("send")}
        </Button>
      </form>
      {error && (
        <p role="alert" className="font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
