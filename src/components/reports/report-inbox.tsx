import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { TRANSITIONS } from "@/lib/reports/model";
import { forGroup, signPhoto } from "@/lib/reports/store";
import { directionsUrl } from "@/lib/spots/directions";
import { reportTargets } from "@/lib/spots/repository";
import { InboxActions } from "./inbox-actions";

/**
 * A rescue group's inbox: only reports sent to this spot. Exact coordinates and
 * the reporter's contact (if they consented) are shown here and nowhere public.
 */
export async function ReportInbox({ spotId, locale }: { spotId: string; locale: Locale }) {
  const [t, tr] = await Promise.all([
    getTranslations({ locale, namespace: "inbox" }),
    getTranslations({ locale, namespace: "report" }),
  ]);
  const spot = reportTargets().find((s) => s.id === spotId);
  const reports = forGroup(spotId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const fmt = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  });

  return (
    <section aria-labelledby={`inbox-${spotId}`} className="space-y-4" data-testid="report-inbox">
      <h2 id={`inbox-${spotId}`} className="text-2xl font-bold text-blue-800">
        {t("title", { spot: spot?.name ?? spotId })}
      </h2>
      {reports.length === 0 && <p className="rounded-md bg-cream-50 p-4 text-muted">{t("empty")}</p>}
      <ul className="space-y-4">
        {reports.map((r) => {
          const mine = r.recipients.find((p) => p.spotId === spotId);
          const exact = r.lat !== null && r.lng !== null ? directionsUrl({ name: r.code, lat: r.lat, lng: r.lng }) : null;
          return (
            <li key={r.id} data-report={r.code} className="space-y-3 rounded-lg bg-white p-6 shadow-soft">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xl font-bold">
                  {r.code} · {tr(`species.${r.species}`)} · {tr(`condition.${r.condition}`)}
                </p>
                <p className="text-sm text-muted">{fmt.format(new Date(r.createdAt))}</p>
              </div>
              <p>
                <strong>{tr("track.status")}:</strong> {tr(`statuses.${r.status}`)} · <strong>{t("yourState")}:</strong>{" "}
                {tr(`track.states.${mine?.state ?? "pending"}`)}
              </p>
              <p>
                <strong>{tr("confirm.where")}:</strong> {[r.ward, r.landmark].filter(Boolean).join(" · ") || "—"}
                {exact && (
                  <>
                    {" · "}
                    <a href={exact} target="_blank" rel="noopener noreferrer" className="font-bold">
                      {t("exact")}
                      {r.accuracyM ? ` (±${r.accuracyM} m)` : ""}
                    </a>
                  </>
                )}
              </p>
              <p>
                <strong>{tr("confirm.when")}:</strong> {fmt.format(new Date(r.seenAt))}
              </p>
              {r.note && <p className="whitespace-pre-line rounded-md bg-cream-50 p-3">{r.note}</p>}
              {r.contact && (
                <p>
                  <strong>{t("contact")}:</strong> {r.contact.value}
                </p>
              )}
              {r.photos > 0 && (
                <ul className="grid grid-cols-4 gap-2">
                  {Array.from({ length: r.photos }, (_, i) => (
                    <li key={i}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, private, no-store */}
                      <img src={signPhoto(r.id, i + 1)} alt={tr("photo.alt", { n: i + 1 })} className="aspect-square w-full rounded-md object-cover" />
                    </li>
                  ))}
                </ul>
              )}
              {r.status !== "closed" && (
                <InboxActions
                  spotId={spotId}
                  code={r.code}
                  canClaim={TRANSITIONS[r.status].includes("claimed") && mine?.state !== "declined"}
                  canDecline={mine?.state !== "declined"}
                  next={mine?.state === "claimed" ? TRANSITIONS[r.status].filter((s) => s !== "claimed" && s !== "sent_to_groups") : []}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
