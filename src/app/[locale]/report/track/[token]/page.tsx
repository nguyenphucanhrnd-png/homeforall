import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { Container } from "@/components/layout/container";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { STATUSES } from "@/lib/reports/model";
import { getByToken, publicView } from "@/lib/reports/store";
import { cn } from "@/lib/utils";
import { TrackControls } from "./track-controls";

// The secret token is the only key (no account). Never indexed; the token never
// leaves in a Referer header.
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

type Params = PageProps<"/[locale]/report/track/[token]">["params"];

export default async function TrackPage({ params }: PageProps<"/[locale]/report/track/[token]">) {
  return (
    <Container className="max-w-[960px] space-y-8 py-12">
      <Suspense fallback={<div aria-hidden="true" className="h-96 animate-pulse rounded-lg bg-white" />}>
        <Track params={params} />
      </Suspense>
    </Container>
  );
}

async function Track({ params }: { params: Params }) {
  await connection();
  const { locale: raw, token: rawToken } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const token = decodeURIComponent(rawToken);
  const t = await getTranslations({ locale, namespace: "report" });
  const r = getByToken(token);
  if (!r) {
    return (
      <div role="alert" className="space-y-4 rounded-lg bg-white p-10 shadow-soft">
        <p className="text-xl font-bold">{t("track.invalid")}</p>
        <Link href="/report" className="font-bold">
          {t("title")}
        </Link>
      </div>
    );
  }
  const v = publicView(r);
  const fmt = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const current = STATUSES.indexOf(v.status);

  return (
    <>
      <header className="space-y-2">
        <h1 className="text-4xl font-bold text-blue-800">{t("track.title", { code: v.code })}</h1>
        <p className="text-muted">
          {t(`species.${v.species}`)} · {t(`condition.${v.condition}`)}
          {v.ward ? ` · ${v.ward}` : ""} · {fmt.format(new Date(v.createdAt))}
        </p>
        <p className="rounded-md bg-cream-50 p-4 font-semibold">{t("result.honest")}</p>
      </header>

      <div className="grid grid-cols-12 items-start gap-y-6 md:gap-x-8">
        <section aria-labelledby="track-status" className="col-span-12 space-y-3 rounded-lg bg-white p-6 shadow-soft md:col-span-5">
          <h2 id="track-status" className="text-xl font-bold">
            {t("track.status")}
          </h2>
          <ol className="space-y-1.5" data-testid="status-timeline">
            {STATUSES.map((s, i) => (
              <li
                key={s}
                aria-current={i === current ? "step" : undefined}
                className={cn("flex items-center gap-2", i <= current ? "font-bold" : "text-muted")}
              >
                <span aria-hidden="true" className={cn("size-3 rounded-full", i <= current ? "bg-success" : "border-2 border-border")} />
                {t(`statuses.${s}`)}
                {s === "closed" && v.closeReason ? ` (${t(`closeReasons.${v.closeReason}`)})` : ""}
              </li>
            ))}
          </ol>
          <h2 className="pt-3 text-xl font-bold">{t("track.recipients")}</h2>
          <ul className="space-y-1">
            {v.recipients.length === 0 && <li className="text-muted">—</li>}
            {v.recipients.map((p) => (
              <li key={p.name}>
                <span className="font-semibold">{p.name}</span> · {t(`track.states.${p.state}`)}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="track-timeline" className="col-span-12 space-y-3 rounded-lg bg-white p-6 shadow-soft md:col-span-7">
          <h2 id="track-timeline" className="text-xl font-bold">
            {t("track.timeline")}
          </h2>
          <ol className="space-y-3 border-s-2 border-border ps-4">
            {v.events.map((e, i) => (
              <li key={i}>
                <p className="text-sm text-muted">{fmt.format(new Date(e.at))}</p>
                <p className="font-semibold">
                  {t(`track.events.${e.kind}`, { spot: e.spot ?? "" })}
                  {e.status && e.kind === "status" ? `: ${t(`statuses.${e.status}`)}` : ""}
                </p>
                {e.text && <p className="whitespace-pre-line">{e.text}</p>}
                {e.reason && e.kind === "declined" && <p className="text-muted">{e.reason}</p>}
              </li>
            ))}
          </ol>
          {v.photos.length > 0 && (
            <ul className="grid grid-cols-3 gap-3 pt-2">
              {v.photos.map((src, i) => (
                <li key={src}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, private, no-store */}
                  <img src={src} alt={t("photo.alt", { n: i + 1 })} className="aspect-square w-full rounded-md object-cover" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {v.status !== "closed" && <TrackControls token={token} />}
    </>
  );
}
