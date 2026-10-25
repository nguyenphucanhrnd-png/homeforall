"use client";

import { Check, Flag, HandHeart, House, Link2, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Link } from "@/i18n/navigation";
import { InterestForm } from "./interest-form";

type Props = { petCode: string; petName: string; partnerName: string; shareUrl: string };

/** Primary action + secondary actions for the sticky profile card (journeys A1, A3). */
export function AdoptActions({ petCode, petName, partnerName }: Omit<Props, "shareUrl">) {
  const t = useTranslations("petProfile");
  const ti = useTranslations("interest");
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // The form stays mounted while the dialog is closed, so nothing typed is lost
  // if it is dismissed by accident. It starts fresh only after a successful send.
  function close(wasSent = sent) {
    setOpen(false);
    if (wasSent) {
      setSent(false);
      setFormKey((k) => k + 1);
    }
  }

  return (
    <div
      data-sticky-actions
      className="space-y-3 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:flex max-md:gap-2 max-md:space-y-0 max-md:border-t max-md:border-border max-md:bg-white/95 max-md:px-4 max-md:pt-2 max-md:pb-[max(0.5rem,env(safe-area-inset-bottom))] max-md:backdrop-blur-sm"
    >
      <Button size="lg" className="w-full max-md:min-h-12 max-md:flex-1 max-md:px-3 max-md:text-base" onClick={() => setOpen(true)} data-testid="adopt-cta">
        <House aria-hidden="true" />
        {t("adoptCta")}
      </Button>
      <Button asChild variant="secondary" className="w-full max-md:min-h-12 max-md:flex-1 max-md:px-3 max-md:text-base">
        <Link href="/foster">
          <HandHeart aria-hidden="true" />
          {t("fosterCta")}
        </Link>
      </Button>
      <Modal open={open} onClose={() => close()} title={ti("title", { name: petName })} closeLabel={ti("close")}>
        <InterestForm
          key={formKey}
          petCode={petCode}
          petName={petName}
          partnerName={partnerName}
          onSent={() => setSent(true)}
          onDone={(wasSent) => close(wasSent)}
        />
      </Modal>
    </div>
  );
}

/** Copy link + Facebook. Zalo has no verified web share mechanism yet, so we guide users to paste the link. */
export function ShareActions({ shareUrl }: { shareUrl: string }) {
  const t = useTranslations("petProfile");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt(t("copyLink"), shareUrl);
    }
  }

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 font-bold">
        <Share2 aria-hidden="true" className="size-5" />
        {t("share")}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={copy}>
          {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
          <span aria-live="polite">{copied ? t("copied") : t("copyLink")}</span>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener">
            {t("shareFacebook")}
          </a>
        </Button>
      </div>
      <p className="text-sm text-muted">{t("shareZaloHint")}</p>
    </div>
  );
}

export function ReportAction() {
  const t = useTranslations("petProfile");
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const reasons = ["scam", "wrong", "adopted", "other"] as const;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-muted underline underline-offset-4 hover:text-danger"
      >
        <Flag aria-hidden="true" className="size-4" />
        {t("report")}
      </button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setDone(false);
        }}
        title={t("reportTitle")}
        closeLabel={t("close")}
      >
        {done ? (
          <p role="status" className="font-semibold">
            {t("reportDone")}
          </p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setDone(true);
            }}
          >
            <p>{t("reportIntro")}</p>
            <fieldset className="space-y-2">
              <legend className="sr-only">{t("reportTitle")}</legend>
              {reasons.map((r, i) => (
                <label key={r} className="flex min-h-11 cursor-pointer items-center gap-3">
                  <input type="radio" name="reason" value={r} required={i === 0} className="size-5 accent-blue-600" />
                  {t(`reportReasons.${r}`)}
                </label>
              ))}
            </fieldset>
            <Button type="submit" variant="secondary">
              {t("reportSubmit")}
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}
