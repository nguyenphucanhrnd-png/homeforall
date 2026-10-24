"use client";

import {
  ArrowLeft,
  ArrowRight,
  Camera,
  ChevronDown,
  CircleCheck,
  Copy,
  Crosshair,
  ExternalLink,
  Globe,
  Info,
  MessageCircle,
  Navigation,
  Phone,
  RotateCcw,
  Send,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CityMap, type MapLabels, type MapSpot } from "@/components/map/city-map";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { clearDraft, loadDraft, saveDraft } from "@/lib/reports/draft";
import { CONDITIONS, REPORT_SPECIES, STATUSES } from "@/lib/reports/model";
import { reportSchema } from "@/lib/reports/schema";
import { cn } from "@/lib/utils";
import { knownWards, locate, nearestHelp, submitReport, type HelpItem, type NearestHelp, type SubmitResult } from "./actions";

// /report, action first: where am I → nearest help (list + map) → what to do
// now → an optional quick report (3 steps, collapsed). Photos are re-encoded in
// the browser (drops EXIF/GPS) and again on the server. No partner content here.

const MAX_PHOTOS = 3;
const MAX_EDGE = 1600;
const MAX_BYTES = 10 * 1024 * 1024;
const STEPS = ["photo", "location", "send"] as const;

type Point = { lat: number; lng: number };
export type FallbackVet = { id: string; name: string; kind: string; address: string | null; area: string | null; directions: string | null };
type Draft = {
  photos: Blob[];
  species: (typeof REPORT_SPECIES)[number] | null;
  condition: (typeof CONDITIONS)[number];
  note: string;
  landmark: string;
  seenAt: string;
  recipients: string[];
  contactEnabled: boolean;
  contact: string;
  contactConsent: boolean;
};
type ErrorKey = "photos" | "species" | "location" | "seenAt" | "consent" | "contact";

const choice =
  "flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border-2 border-border bg-white px-4 has-checked:border-blue-600 has-checked:bg-blue-100 has-focus-visible:outline-2 has-focus-visible:outline-blue-600";
const input = "block min-h-12 w-full rounded-sm border-2 border-border bg-white px-4 text-ink aria-invalid:border-danger";

function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const blank = (): Draft => ({
  photos: [],
  species: null,
  condition: "unknown",
  note: "",
  landmark: "",
  seenAt: "", // set after mount (no clock reads during prerender)
  recipients: [],
  contactEnabled: false,
  contact: "",
  contactConsent: false,
});

const inCity = (p: Point | null) => Boolean(p && p.lat >= 10.3 && p.lat <= 11.4 && p.lng >= 106.3 && p.lng <= 107.2);

/** Decode → resize → WebP. Canvas output carries no EXIF/GPS. */
async function compress(file: File): Promise<Blob> {
  if (file.size > MAX_BYTES) throw new Error("photoTooLarge");
  if (file.type && !file.type.startsWith("image/")) throw new Error("photoType");
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("photoUnreadable"); // e.g. HEIC in a browser that cannot decode it
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
  if (!blob) throw new Error("photoUnreadable");
  return blob;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function ReportExperience({ seeded, fallbackVets }: { seeded: boolean; fallbackVets: FallbackVet[] }) {
  const t = useTranslations("report");
  const locale = useLocale();

  // ── Where ──
  const [point, setPoint] = useState<Point | null>(null);
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const [ward, setWard] = useState("");
  const [wardApprox, setWardApprox] = useState(false);
  const [wards, setWards] = useState<string[]>([]);
  const [locating, setLocating] = useState(false);
  const [geoDenied, setGeoDenied] = useState(false);
  const [help, setHelp] = useState<NearestHelp | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // ── Quick report ──
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(blank);
  const [errors, setErrors] = useState<ErrorKey[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<SubmitResult, { ok: true }> | null>(null);
  const [restored, setRestored] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceAt = useRef<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLElement>(null);
  const ready = useRef(false);
  const touchedRecipients = useRef(false);

  const set = useCallback(<K extends keyof Draft>(k: K, v: Draft[K]) => setD((cur) => ({ ...cur, [k]: v })), []);

  // ── Location ──
  const onPoint = useCallback((p: Point, acc: number | null = null) => {
    setPoint(p);
    setAccuracyM(acc);
    setErrors((e) => e.filter((k) => k !== "location"));
    locate(p).then((res) => {
      if (res) {
        setWard(res.ward);
        setWardApprox(res.approximate);
      }
    });
  }, []);
  const onPinChange = useCallback((p: Point) => onPoint(p), [onPoint]);

  const locateMe = useCallback(() => {
    if (!("geolocation" in navigator)) return setGeoDenied(true);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setGeoDenied(false);
        onPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude }, Math.round(pos.coords.accuracy));
      },
      () => {
        setLocating(false);
        setGeoDenied(true);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }, [onPoint]);

  useEffect(() => {
    let alive = true;
    knownWards().then((w) => alive && setWards(w));
    // Auto-locate only when permission was already granted (no surprise prompt).
    navigator.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((r) => alive && r.state === "granted" && locateMe())
      .catch(() => {});
    loadDraft<Draft>().then((saved) => {
      if (!alive) return;
      if (saved && (saved.photos?.length || saved.species || saved.note)) {
        setD({ ...blank(), ...saved, seenAt: saved.seenAt || nowLocal() });
        setRestored(true);
        setOpen(true);
      }
      ready.current = true;
    });
    return () => {
      alive = false;
    };
  }, [locateMe]);

  // Nearest help whenever the place changes.
  useEffect(() => {
    const p = inCity(point) ? point : null;
    if (!p && !ward) return;
    let alive = true;
    nearestHelp({ point: p, ward: ward || null }).then((h) => {
      if (!alive) return;
      setHelp(h);
      if (!touchedRecipients.current) {
        setD((cur) => ({ ...cur, recipients: h.rescue.filter((s) => s.canReport).map((s) => s.id) }));
      }
    });
    return () => {
      alive = false;
    };
  }, [point, ward]);

  // Draft (on this device only), debounced.
  useEffect(() => {
    if (!ready.current || result) return;
    const id = setTimeout(() => saveDraft(d), 500);
    return () => clearTimeout(id);
  }, [d, result]);

  // ── Photos ──
  const previews = useMemo(() => d.photos.map((b) => URL.createObjectURL(b)), [d.photos]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setPhotoError(null);
    const at = replaceAt.current;
    replaceAt.current = null;
    try {
      const blobs = await Promise.all([...files].slice(0, at === null ? MAX_PHOTOS - d.photos.length : 1).map(compress));
      setD((cur) => {
        const photos = [...cur.photos];
        if (at !== null) photos[at] = blobs[0];
        else photos.push(...blobs);
        return { ...cur, photos: photos.slice(0, MAX_PHOTOS) };
      });
      setErrors((e) => e.filter((k) => k !== "photos"));
    } catch (err) {
      setPhotoError(t(`errors.${(err as Error).message}` as "errors.generic"));
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Steps ──
  function check(s: number): ErrorKey[] {
    const e: ErrorKey[] = [];
    if (s === 0) {
      if (!d.photos.length) e.push("photos");
      if (!d.species) e.push("species");
    }
    if (s === 1) {
      if (!inCity(point) && !ward.trim()) e.push("location");
      if (!d.seenAt) e.push("seenAt");
    }
    if (s === 2) {
      if (d.contactEnabled && (d.contact.trim().length <= 3 || !d.contactConsent)) e.push("contact");
      if (!consent) e.push("consent");
    }
    return e;
  }
  const focusHeading = () => requestAnimationFrame(() => headingRef.current?.focus());
  function go(next: number) {
    if (next > step) {
      const e = check(step);
      setErrors(e);
      if (e.length) return requestAnimationFrame(() => summaryRef.current?.focus());
    }
    setErrors([]);
    setStep(next);
    focusHeading();
  }

  /** Opening the form stamps "seen at" with now (never during prerender). */
  function openForm() {
    setD((cur) => (cur.seenAt ? cur : { ...cur, seenAt: nowLocal() }));
    setOpen(true);
  }

  function reportTo(id: string) {
    touchedRecipients.current = true;
    set("recipients", [id]);
    openForm();
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  }

  async function submit() {
    const e = check(2);
    setErrors(e);
    if (e.length) return requestAnimationFrame(() => summaryRef.current?.focus());
    const exact = inCity(point) ? point : null;
    const data = {
      type: "sighting" as const,
      species: d.species,
      condition: d.condition,
      bitten: false,
      collar: "unknown" as const,
      note: d.note,
      seenAt: new Date(d.seenAt).toISOString(),
      ward: ward.trim() || null,
      landmark: d.landmark,
      lat: exact?.lat ?? null,
      lng: exact?.lng ?? null,
      accuracyM: exact ? accuracyM : null,
      recipients: d.recipients,
      contactEnabled: d.contactEnabled,
      contact: d.contactEnabled ? d.contact : "",
      contactConsent: d.contactEnabled && d.contactConsent,
      consent,
      website: honeypot,
    };
    if (!honeypot && !reportSchema.safeParse(data).success) return setServerError(t("errors.generic"));
    const form = new FormData();
    form.set("data", JSON.stringify(data));
    d.photos.forEach((b, i) => form.append("photos", new File([b], `photo-${i + 1}.webp`, { type: "image/webp" })));
    setSending(true);
    setServerError(null);
    try {
      const res = await submitReport(form);
      if (res.ok) {
        setResult(res);
        await clearDraft();
        focusHeading();
      } else {
        const map: Record<string, string> = {
          rate_limited: "rateLimited",
          photo_too_large: "photoTooLarge",
          photo_type: "photoType",
          photo_unreadable: "photoUnreadable",
          no_photo: "photos",
        };
        setServerError(t(`errors.${map[res.error] ?? "generic"}` as "errors.generic"));
      }
    } catch {
      setServerError(t("errors.generic"));
    } finally {
      setSending(false);
    }
  }

  async function discardDraft() {
    await clearDraft();
    setD({ ...blank(), seenAt: nowLocal() });
    setRestored(false);
    setStep(0);
  }

  // ── Map ──
  const items = useMemo(() => [...(help?.rescue ?? []), ...(help?.vets ?? [])], [help]);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const kind = useCallback((i: { kind: string }) => t(`help.kinds.${i.kind}` as "help.kinds.rescue"), [t]);
  const mapSpots: MapSpot[] = useMemo(
    () => items.map((i) => ({ id: i.id, name: i.name, layer: i.layer, lat: i.lat, lng: i.lng, precision: i.precision, isSample: false })),
    [items],
  );
  const labels: MapLabels = useMemo(
    () => ({
      region: t("help.mapRegion"),
      pin: t("help.you"),
      cluster: (n) => String(n),
      marker: (s) => {
        const i = byId.get(s.id);
        return i ? `${i.name}, ${kind(i)}, ${t(`groups.band.${i.band}`)}` : s.name;
      },
      popup: (s) => {
        const i = byId.get(s.id);
        if (!i) return esc(s.name);
        return `<div class="hfa-popup"><p class="hfa-popup-kind">${esc(kind(i))}</p><p class="hfa-popup-name">${esc(i.name)}</p>${
          i.address ? `<p>${esc(i.address)}</p>` : i.area ? `<p>${esc(i.area)}</p>` : ""
        }<p class="hfa-popup-line">${esc(t(`groups.band.${i.band}`))}</p>${
          i.directions ? `<p><a class="hfa-popup-dir" href="${esc(i.directions)}" target="_blank" rel="noopener noreferrer">${esc(t("help.directions"))} ↗</a></p>` : ""
        }</div>`;
      },
    }),
    [t, byId, kind],
  );

  const errorText = (k: ErrorKey) => t(`errors.${k}`);
  const errorId = (k: ErrorKey) => `report-${k}-error`;
  const fieldErr = (k: ErrorKey) =>
    errors.includes(k) ? (
      <p id={errorId(k)} className="font-semibold text-danger">
        {errorText(k)}
      </p>
    ) : null;
  const aria = (k: ErrorKey) => ({
    "aria-invalid": errors.includes(k) ? (true as const) : undefined,
    "aria-describedby": errors.includes(k) ? errorId(k) : undefined,
  });
  const anchor: Record<ErrorKey, string> = {
    photos: "report-photo-add",
    species: "report-species",
    location: "report-locate",
    seenAt: "report-seen",
    contact: "report-contact",
    consent: "report-consent",
  };
  const fmtWhen = (v: string) =>
    v ? new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(v)) : "";

  // ─── Pieces ─────────────────────────────────────────────────────────────────
  const helpCard = (i: HelpItem) => (
    <li key={i.id} data-help={i.layer} className={cn("space-y-2 rounded-md border-2 bg-white p-4", selected === i.id ? "border-blue-600" : "border-transparent shadow-soft")}>
      <button type="button" onClick={() => setSelected(i.id)} className="block w-full cursor-pointer text-left">
        <span className="flex items-center gap-2 text-xs font-bold text-muted">
          <span aria-hidden="true" className={cn("size-2.5 rounded-full", `hfa-${i.layer}`)} />
          {kind(i)} · <span className="text-ink">{t(`groups.band.${i.band}`)}</span>
        </span>
        <span className="block font-bold">{i.name}</span>
        <span className="block text-sm text-muted">{i.address ?? i.area}</span>
      </button>
      <div className="flex flex-wrap gap-2">
        {i.directions && (
          <a href={i.directions} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <Navigation aria-hidden="true" />
            {t("help.directions")}
            <span className="sr-only">: {i.name}</span>
          </a>
        )}
        {i.canReport && (
          <Button type="button" size="sm" variant="ghost" onClick={() => reportTo(i.id)}>
            <Send aria-hidden="true" />
            {t("help.notify")}
          </Button>
        )}
        {i.contacts.map((c) => {
          const Icon = c.type === "phone" ? Phone : c.type === "zalo" ? MessageCircle : c.type === "facebook" ? ExternalLink : Globe;
          const href = c.type === "phone" ? `tel:${c.value}` : c.type === "zalo" ? `https://zalo.me/${c.value}` : c.value;
          const label = c.type === "phone" ? t("help.call") : c.type === "zalo" ? t("help.message") : t(`help.${c.type}`);
          return (
            <a key={c.type + c.value} href={href} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <Icon aria-hidden="true" />
              {label}
            </a>
          );
        })}
      </div>
    </li>
  );

  const helpSection = (
    <section aria-labelledby="help-title" className="space-y-4" data-testid="nearest-help">
      <h2 id="help-title" className="text-2xl font-bold text-blue-800">
        {t("help.title")}
      </h2>
      {!help ? (
        <p className="rounded-md bg-cream-50 p-4 text-muted">{t("help.needLocation")}</p>
      ) : help.rescue.length + help.vets.length === 0 ? null : (
        <>
          <div className="space-y-2">
            <h3 className="font-bold">{t("help.rescueTitle")}</h3>
            {help.rescue.length > 0 && !help.rescueWithin8 && <p className="text-sm font-semibold text-warning">{t("help.noneNear")}</p>}
            <ul className="space-y-2">{help.rescue.map(helpCard)}</ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold">{t("help.vetTitle")}</h3>
            {help.vets.length > 0 && !help.vetsWithin8 && <p className="text-sm font-semibold text-warning">{t("help.noneNear")}</p>}
            <ul className="space-y-2">{help.vets.map(helpCard)}</ul>
            <p className="text-sm text-muted">{t("help.vetNote")}</p>
          </div>
        </>
      )}
      {!seeded && fallbackVets.length > 0 && (
        <details className="rounded-md bg-white p-4 shadow-soft" open={!help?.vets.length}>
          <summary className="cursor-pointer font-bold">
            {t("help.vetTitle")} ({fallbackVets.length})
          </summary>
          <p className="mt-2 text-sm text-muted">{t("help.unseeded")}</p>
          <ul className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pe-1" data-testid="fallback-vets">
            {fallbackVets.map((v) => (
              <li key={v.id} className="flex flex-wrap items-start justify-between gap-2 rounded-md bg-cream-50 p-3">
                <span>
                  <span className="block text-xs font-bold text-muted">{t(`help.kinds.${v.kind}` as "help.kinds.rescue")}</span>
                  <span className="block font-bold">{v.name}</span>
                  <span className="block text-sm text-muted">{[v.address, v.area].filter(Boolean).join(", ")}</span>
                </span>
                {v.directions && (
                  <a href={v.directions} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                    <Navigation aria-hidden="true" />
                    {t("help.directions")}
                    <span className="sr-only">: {v.name}</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );

  const nowSection = (
    <section aria-labelledby="now-title" className="space-y-4 rounded-lg bg-white p-6 shadow-soft">
      <h2 id="now-title" className="text-2xl font-bold text-blue-800">
        {t("now.title")}
      </h2>
      <ol className="space-y-3">
        {(["s1", "s2", "s3"] as const).map((k, i) => {
          const Icon = [ShieldAlert, Camera, Navigation][i];
          return (
            <li key={k} className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-800">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span className="pt-2 font-semibold">{t(`now.${k}`)}</span>
            </li>
          );
        })}
      </ol>
      <div className="space-y-2 rounded-md border-2 border-danger p-4" data-testid="bite-card">
        <h3 className="flex items-center gap-2 font-bold text-danger">
          <ShieldAlert aria-hidden="true" className="size-5" />
          {t("bite.title")}
        </h3>
        <p>{t("bite.body")}</p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/help" className="font-bold text-blue-600 underline hover:text-blue-800">
            {t("bite.link")}
          </Link>
          <a href="https://www.who.int/news-room/fact-sheets/detail/rabies" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
            {t("bite.who")}
          </a>
        </p>
      </div>
    </section>
  );

  const resultView = result && (() => {
    const link = `${window.location.origin}/${locale}/report/track/${result.token}`;
    const current = STATUSES.indexOf(d.recipients.length ? "sent_to_groups" : "submitted");
    return (
      <div className="space-y-5" data-testid="report-result">
        <h2 ref={headingRef} tabIndex={-1} className="flex items-center gap-3 text-2xl font-bold text-success outline-none">
          <CircleCheck aria-hidden="true" className="size-7" />
          {t("result.title", { code: result.code })}
        </h2>
        <p className="rounded-md bg-cream-50 p-4 font-semibold">{t("result.honest")}</p>
        <p className="font-semibold">{t("result.saveLink")}</p>
        <div className="flex flex-wrap items-center gap-3">
          <input readOnly value={link} aria-label={t("result.open")} className={cn(input, "min-w-0 flex-1 font-mono text-sm")} data-testid="track-link" onFocus={(e) => e.target.select()} />
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            <Copy aria-hidden="true" />
            {copied ? t("result.copied") : t("result.copy")}
          </Button>
        </div>
        <p role="status" className="sr-only">
          {copied ? t("result.copied") : ""}
        </p>
        {result.possibleDuplicate && (
          <p className="flex items-start gap-2 rounded-md bg-blue-100 p-4">
            <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-blue-800" />
            {t("result.duplicate")}
          </p>
        )}
        <div className="space-y-2">
          <h3 className="font-bold">{t("result.timeline")}</h3>
          <ol className="space-y-1.5" data-testid="status-timeline">
            {STATUSES.map((s, i) => (
              <li key={s} aria-current={i === current ? "step" : undefined} className={cn("flex items-center gap-2", i <= current ? "font-bold text-ink" : "text-muted")}>
                <span aria-hidden="true" className={cn("size-3 rounded-full", i <= current ? "bg-success" : "border-2 border-border")} />
                {t(`statuses.${s}`)}
              </li>
            ))}
          </ol>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href={link} className={buttonVariants({ variant: "primary" })}>
            {t("result.open")}
          </a>
          <Link href="/#journey-1" className={buttonVariants({ variant: "ghost" })}>
            {t("result.back")}
          </Link>
        </div>
      </div>
    );
  })();

  const recipientsList = help?.rescue.filter((s) => s.canReport) ?? [];

  const quickReport = (
    <section ref={formRef} aria-labelledby="quick-title" className="scroll-mt-24 space-y-5 rounded-lg bg-white p-6 shadow-lift" data-testid="quick-report">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 id="quick-title" className="text-2xl font-bold text-blue-800">
            {t("quick.title")}
          </h2>
          <p className="text-muted">{t("quick.lead")}</p>
        </div>
        {!result && (
          <Button type="button" variant={open ? "ghost" : "secondary"} aria-expanded={open} aria-controls="quick-body" onClick={() => (open ? setOpen(false) : openForm())}>
            <ChevronDown aria-hidden="true" className={cn("transition-transform", open && "rotate-180")} />
            {open ? t("quick.close") : t("quick.open")}
          </Button>
        )}
      </div>

      {result ? (
        resultView
      ) : (
        <div id="quick-body" hidden={!open} className="space-y-6">
          <ol className="flex flex-wrap gap-2" aria-label={t("stepOf", { n: step + 1 })}>
            {STEPS.map((s, i) => (
              <li
                key={s}
                aria-current={i === step ? "step" : undefined}
                className={cn("rounded-full px-3 py-1 text-sm font-bold", i === step ? "bg-blue-600 text-white" : i < step ? "bg-blue-100 text-blue-800" : "bg-cream-50 text-muted")}
              >
                {i + 1}. {t(`steps.${s}`)}
              </li>
            ))}
          </ol>

          {restored && step === 0 && (
            <p className="flex flex-wrap items-center gap-3 rounded-md bg-cream-50 p-3 text-sm font-semibold">
              {t("result.draftRestored")}
              <button type="button" onClick={discardDraft} className="cursor-pointer text-blue-600 underline hover:text-blue-800">
                {t("result.clearDraft")}
              </button>
            </p>
          )}

          <h3 ref={headingRef} tabIndex={-1} className="text-xl font-bold outline-none">
            <span className="sr-only">{t("stepOf", { n: step + 1 })}: </span>
            {t(`steps.${STEPS[step]}`)}
          </h3>

          {errors.length > 0 && (
            <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-md border-2 border-danger p-4 outline-none" data-testid="report-errors">
              <p className="font-bold text-danger">{t("errorSummary", { count: errors.length })}</p>
              <ul className="mt-2 list-disc ps-5">
                {errors.map((k) => (
                  <li key={k}>
                    <a href={`#${anchor[k]}`}>{errorText(k)}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step === 0 && (
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="font-bold">{t("photo.label")}</p>
                <p className="flex items-start gap-2 text-sm text-muted">
                  <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  {t("photo.privacy")}
                </p>
                {previews.length > 0 && (
                  <ul className="grid grid-cols-3 gap-3" data-testid="report-photos">
                    {previews.map((src, i) => (
                      <li key={src} className="space-y-2">
                        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                        <img src={src} alt={t("photo.alt", { n: i + 1 })} className="aspect-square w-full rounded-md object-cover" />
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="px-2"
                            onClick={() => {
                              replaceAt.current = i;
                              fileRef.current?.click();
                            }}
                          >
                            <RotateCcw aria-hidden="true" />
                            <span className="sr-only">{t("photo.retake")} </span>
                            <span aria-hidden="true" className="max-xl:hidden">
                              {t("photo.retake")}
                            </span>
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="px-2" onClick={() => set("photos", d.photos.filter((_, j) => j !== i))}>
                            <Trash2 aria-hidden="true" />
                            <span className="sr-only">
                              {t("photo.remove")} {t("photo.alt", { n: i + 1 })}
                            </span>
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                  data-testid="report-file"
                  onChange={(e) => onFiles(e.target.files)}
                />
                {d.photos.length < MAX_PHOTOS && (
                  <Button
                    id="report-photo-add"
                    type="button"
                    variant="secondary"
                    {...aria("photos")}
                    onClick={() => {
                      replaceAt.current = null;
                      fileRef.current?.click();
                    }}
                  >
                    <Camera aria-hidden="true" />
                    {t("photo.add")}
                  </Button>
                )}
                {photoError && (
                  <p role="alert" className="font-semibold text-danger">
                    {photoError}
                  </p>
                )}
                {fieldErr("photos")}
              </div>

              <fieldset className="space-y-2" id="report-species" {...aria("species")}>
                <legend className="mb-1 font-bold">{t("species.label")}</legend>
                <div className="flex flex-wrap gap-2">
                  {REPORT_SPECIES.map((v) => (
                    <label key={v} className={choice}>
                      <input
                        type="radio"
                        name="species"
                        checked={d.species === v}
                        onChange={() => {
                          set("species", v);
                          setErrors((e) => e.filter((k) => k !== "species"));
                        }}
                        className="size-4 accent-blue-600"
                      />
                      {t(`species.${v}`)}
                    </label>
                  ))}
                </div>
                {fieldErr("species")}
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="mb-1 font-bold">{t("condition.label")}</legend>
                <div className="flex flex-wrap gap-2">
                  {CONDITIONS.map((v) => (
                    <label key={v} className={choice}>
                      <input type="radio" name="condition" checked={d.condition === v} onChange={() => set("condition", v)} className="size-4 accent-blue-600" />
                      {t(`condition.${v}`)}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-2">
                <label htmlFor="report-note" className="block font-bold">
                  {t("note.label")}
                </label>
                <textarea
                  id="report-note"
                  rows={3}
                  maxLength={280}
                  value={d.note}
                  onChange={(e) => set("note", e.target.value)}
                  aria-describedby="report-note-hint"
                  className={cn(input, "py-3")}
                />
                <p id="report-note-hint" className="text-sm text-muted">
                  {t("note.hint", { left: 280 - d.note.length })}
                </p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <p className="rounded-md bg-cream-50 p-3">
                <strong>{t("confirm.where")}: </strong>
                {ward || (inCity(point) ? t("location.pin") : "—")}
                {accuracyM !== null && inCity(point) ? ` · ${t("location.accuracy", { m: accuracyM })}` : ""}
              </p>
              <p className="text-sm text-muted">{t("location.drag")}</p>
              {fieldErr("location")}
              <div className="space-y-2">
                <label htmlFor="report-landmark" className="block font-bold">
                  {t("location.landmark")}
                </label>
                <input
                  id="report-landmark"
                  value={d.landmark}
                  maxLength={120}
                  onChange={(e) => set("landmark", e.target.value)}
                  aria-describedby="report-landmark-hint"
                  className={input}
                />
                <p id="report-landmark-hint" className="text-sm text-muted">
                  {t("location.landmarkHint")}
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="report-seen" className="block font-bold">
                  {t("location.seenAt")}
                </label>
                <input id="report-seen" type="datetime-local" value={d.seenAt} max={nowLocal()} onChange={(e) => set("seenAt", e.target.value)} className={input} {...aria("seenAt")} />
                {fieldErr("seenAt")}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <fieldset className="space-y-2">
                <legend className="mb-1 font-bold">{t("groups.title")}</legend>
                <p className="text-sm text-muted">{t("groups.intro")}</p>
                {recipientsList.length === 0 ? (
                  <p className="rounded-md bg-cream-50 p-4 font-semibold" data-testid="report-no-groups">
                    {t("groups.none")}
                  </p>
                ) : (
                  <ul className="space-y-2" data-testid="report-groups">
                    {recipientsList.map((s) => (
                      <li key={s.id}>
                        <label htmlFor={`to-${s.id}`} className={cn(choice, "min-h-14 py-2")}>
                          <input
                            id={`to-${s.id}`}
                            type="checkbox"
                            checked={d.recipients.includes(s.id)}
                            onChange={(e) => {
                              touchedRecipients.current = true;
                              set("recipients", e.target.checked ? [...d.recipients, s.id] : d.recipients.filter((id) => id !== s.id));
                            }}
                            className="size-4 shrink-0 accent-blue-600"
                          />
                          <span className="flex flex-col font-bold">
                            {s.name}
                            <span className="text-sm font-normal text-muted">
                              {t(`groups.band.${s.band}`)}
                              {s.area ? ` · ${s.area}` : ""}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </fieldset>

              <div className="space-y-3 border-t border-border pt-5">
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" checked={d.contactEnabled} onChange={(e) => set("contactEnabled", e.target.checked)} className="mt-1 size-5 shrink-0 accent-blue-600" />
                  <span className="font-semibold">{t("groups.contactToggle")}</span>
                </label>
                {d.contactEnabled && (
                  <div className="space-y-3 ps-8">
                    <div className="space-y-2">
                      <label htmlFor="report-contact" className="block font-bold">
                        {t("groups.contact")}
                      </label>
                      <input id="report-contact" value={d.contact} maxLength={120} autoComplete="tel" onChange={(e) => set("contact", e.target.value)} className={input} {...aria("contact")} />
                    </div>
                    <label className="flex cursor-pointer items-start gap-3">
                      <input type="checkbox" checked={d.contactConsent} onChange={(e) => set("contactConsent", e.target.checked)} className="mt-1 size-5 shrink-0 accent-blue-600" />
                      <span>{t("groups.contactConsent")}</span>
                    </label>
                    {fieldErr("contact")}
                  </div>
                )}
              </div>

              <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 rounded-md bg-cream-50 p-4 text-sm" data-testid="report-summary">
                <dt className="font-bold">{t("steps.photo")}</dt>
                <dd>
                  {t("confirm.photos", { count: d.photos.length })} · {d.species ? t(`species.${d.species}`) : ""} · {t(`condition.${d.condition}`)}
                </dd>
                <dt className="font-bold">{t("confirm.where")}</dt>
                <dd>{[ward, d.landmark].filter(Boolean).join(" · ") || (inCity(point) ? t("location.pin") : "")}</dd>
                <dt className="font-bold">{t("confirm.when")}</dt>
                <dd>{fmtWhen(d.seenAt)}</dd>
              </dl>

              {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label htmlFor="report-website">Website</label>
                <input id="report-website" tabIndex={-1} autoComplete="off" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    id="report-consent"
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => {
                      setConsent(e.target.checked);
                      setErrors((x) => x.filter((k) => k !== "consent"));
                    }}
                    className="mt-1 size-5 shrink-0 accent-blue-600"
                    {...aria("consent")}
                  />
                  <span>{t("confirm.consent")}</span>
                </label>
                <p className="ps-8 text-sm text-muted">{t("confirm.legalReview")}</p>
                {fieldErr("consent")}
              </div>
              {serverError && (
                <p role="alert" className="font-semibold text-danger" data-testid="report-server-error">
                  {serverError}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
            {step > 0 && (
              <Button type="button" variant="ghost" onClick={() => go(step - 1)}>
                <ArrowLeft aria-hidden="true" />
                {t("back")}
              </Button>
            )}
            {step < 2 ? (
              <Button type="button" className="ms-auto" onClick={() => go(step + 1)}>
                {t("next")}
                <ArrowRight aria-hidden="true" />
              </Button>
            ) : (
              <Button type="button" className="ms-auto" onClick={submit} disabled={sending}>
                <Send aria-hidden="true" />
                {sending ? t("confirm.sending") : t("confirm.submit")}
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );

  return (
    <div className="grid grid-cols-12 items-start gap-y-6 lg:gap-x-8">
      {/* 1. Location bar */}
      <section aria-labelledby="loc-title" className="col-span-12 flex flex-wrap items-end gap-4 rounded-lg bg-white p-5 shadow-soft" data-testid="location-bar">
        <h2 id="loc-title" className="sr-only">
          {t("locBar.title")}
        </h2>
        <div className="space-y-1">
          <Button id="report-locate" type="button" variant="secondary" onClick={locateMe} disabled={locating}>
            <Crosshair aria-hidden="true" />
            {locating ? t("locBar.locating") : t("locBar.useMine")}
          </Button>
        </div>
        <div className="min-w-[220px] flex-1 space-y-1">
          <label htmlFor="report-ward" className="block text-sm font-bold">
            {t("locBar.ward")}
          </label>
          {wards.length > 0 ? (
            <select
              id="report-ward"
              value={wards.includes(ward) ? ward : ""}
              onChange={(e) => {
                setWard(e.target.value);
                setWardApprox(false);
                setPoint(null);
                setAccuracyM(null);
              }}
              className={input}
            >
              <option value="">{t("locBar.wardChoose")}</option>
              {wards.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="report-ward"
              value={ward}
              maxLength={80}
              autoComplete="address-level3"
              placeholder={t("locBar.wardManual")}
              onChange={(e) => {
                setWard(e.target.value);
                setWardApprox(false);
              }}
              className={input}
            />
          )}
        </div>
        <p role="status" className="basis-full text-sm" data-testid="report-accuracy">
          {geoDenied ? (
            <span className="font-semibold text-warning">{t("locBar.denied")}</span>
          ) : inCity(point) ? (
            <span className="font-semibold">
              {ward && wardApprox ? t("locBar.wardApprox", { ward }) : ward}
              {accuracyM !== null ? `${ward ? " · " : ""}${t("locBar.accuracy", { m: accuracyM })}` : ""}
            </span>
          ) : (
            <span className="text-muted">{t("locBar.privacy")}</span>
          )}
        </p>
      </section>

      {/* 2–4. Nearest help, what to do now, quick report */}
      <div className="col-span-12 space-y-6 lg:col-span-5">
        {helpSection}
        {nowSection}
        {quickReport}
      </div>

      <div className="col-span-12 space-y-3 lg:sticky lg:top-24 lg:order-none lg:col-span-7">
        <CityMap spots={mapSpots} labels={labels} pin={inCity(point) ? point : null} onPinChange={onPinChange} selectedId={selected} onSelect={setSelected} height={560} />
        <p className="flex items-start gap-2 text-sm text-muted">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t("location.drag")} {t("locBar.privacy")}
        </p>
      </div>
    </div>
  );
}

