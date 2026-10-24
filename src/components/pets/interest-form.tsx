"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch, type FieldErrors } from "react-hook-form";
import { submitInterest } from "@/app/[locale]/pets/[code]/actions";
import { Button } from "@/components/ui/button";
import { CONTACT_METHODS, EXPERIENCE, interestSchema, type InterestInput } from "@/lib/pets/interest-schema";

const FIELD_ORDER = ["name", "contactMethod", "contactValue", "ward", "experience", "motivation", "consent"] as const;
const inputClass =
  "block min-h-12 w-full rounded-sm border-2 border-border bg-white px-4 text-ink aria-invalid:border-danger";

type Props = {
  petCode: string;
  petName: string;
  partnerName: string;
  /** `sent` tells the parent to start a fresh form next time. */
  onDone: (sent: boolean) => void;
  onSent?: () => void;
};

export function InterestForm({ petCode, partnerName, onDone, onSent }: Props) {
  const t = useTranslations("interest");
  const [sent, setSent] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<InterestInput>({
    resolver: zodResolver(interestSchema),
    mode: "onTouched", // validate when leaving a field, not on every keystroke
    defaultValues: { petCode, contactMethod: "zalo", consent: false as unknown as true },
    shouldFocusError: false,
  });
  const method = useWatch({ control, name: "contactMethod" }) ?? "zalo";
  const errorKeys = FIELD_ORDER.filter((k) => errors[k]);

  // After a failed submit, move focus to the error summary (prompt §12).
  useEffect(() => {
    if (submitCount > 0 && errorKeys.length > 0) summaryRef.current?.focus();
  }, [submitCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = handleSubmit(async (values) => {
    const result = await submitInterest(values);
    if (result.ok) {
      setSent(true);
      onSent?.();
    }
    else for (const f of result.fields) setError(f as keyof InterestInput, { message: "required" });
  });

  const msg = (e: FieldErrors<InterestInput>[keyof InterestInput]) =>
    e?.message ? t(`errors.${e.message as "required" | "phone" | "email" | "consent"}`) : undefined;
  const fieldLabel = (k: (typeof FIELD_ORDER)[number]) =>
    k === "contactValue"
      ? t(`contactValue.${method}`)
      : k === "consent"
        ? t("consentLabel")
        : t(k === "motivation" ? "motivation" : k);
  const err = (name: keyof InterestInput) =>
    errors[name] ? (
      <p id={`${name}-error`} className="font-semibold text-danger">
        {msg(errors[name])}
      </p>
    ) : null;
  const aria = (name: keyof InterestInput) => ({
    "aria-invalid": errors[name] ? (true as const) : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  if (sent) {
    const steps = ["sent", "reviewing", "interview", "approved", "handover"] as const;
    return (
      <div role="status" className="space-y-5" data-testid="interest-success">
        <p className="flex items-center gap-3 text-xl font-bold text-success">
          <CircleCheck aria-hidden="true" className="size-7" />
          {t("successTitle")}
        </p>
        <p className="rounded-md bg-cream-50 p-4 font-semibold text-warning">{t("successDemo")}</p>
        <p>{t("successNext")}</p>
        <ol className="flex flex-wrap items-center gap-2">
          {steps.map((s, i) => (
            <li
              key={s}
              className={`rounded-full px-3 py-1 text-sm font-bold ${i === 0 ? "bg-blue-600 text-white" : "bg-cream-50 text-muted"}`}
            >
              {i + 1}. {t(`steps.${s}`)}
            </li>
          ))}
        </ol>
        <Button type="button" variant="secondary" onClick={() => onDone(true)}>
          {t("close")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <p>{t("intro", { partner: partnerName })}</p>
      <p className="text-sm text-muted">{t("requiredHint")}</p>

      {/* The summary is for failed submits only; while typing, errors stay inline. */}
      {submitCount > 0 && errorKeys.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-md border-2 border-danger p-4 outline-none">
          <p className="font-bold text-danger">{t("errorSummary", { count: errorKeys.length })}</p>
          <ul className="mt-2 list-disc ps-5">
            {errorKeys.map((k) => (
              <li key={k}>
                <a href={`#interest-${k}`}>
                  <strong>{fieldLabel(k).replace(/[?:]$/, "")}:</strong> {msg(errors[k])}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <input type="hidden" {...register("petCode")} />

      <div className="space-y-2">
        <label htmlFor="interest-name" className="block font-bold">
          {t("name")}
        </label>
        <input id="interest-name" autoComplete="name" className={inputClass} {...aria("name")} {...register("name")} />
        {err("name")}
      </div>

      <fieldset className="space-y-2" id="interest-contactMethod">
        <legend className="mb-1 font-bold">{t("contactMethod")}</legend>
        <div className="flex flex-wrap gap-2">
          {CONTACT_METHODS.map((m) => (
            <label
              key={m}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border-2 border-border px-4 has-checked:border-blue-600 has-checked:bg-blue-100"
            >
              <input type="radio" value={m} className="size-4 accent-blue-600" {...register("contactMethod")} />
              {t(m)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <label htmlFor="interest-contactValue" className="block font-bold">
          {t(`contactValue.${method}`)}
        </label>
        <input
          id="interest-contactValue"
          type={method === "email" ? "email" : "tel"}
          inputMode={method === "email" ? "email" : "tel"}
          autoComplete={method === "email" ? "email" : "tel"}
          className={inputClass}
          {...aria("contactValue")}
          {...register("contactValue")}
        />
        {err("contactValue")}
      </div>

      <div className="space-y-2">
        <label htmlFor="interest-ward" className="block font-bold">
          {t("ward")}
        </label>
        <input id="interest-ward" autoComplete="address-level3" className={inputClass} {...aria("ward")} {...register("ward")} />
        {err("ward")}
      </div>

      <fieldset className="space-y-2" id="interest-experience" {...aria("experience")}>
        <legend className="mb-1 font-bold">{t("experience")}</legend>
        <div className="flex flex-wrap gap-2">
          {EXPERIENCE.map((x) => (
            <label
              key={x}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border-2 border-border px-4 has-checked:border-blue-600 has-checked:bg-blue-100"
            >
              <input type="radio" value={x} className="size-4 accent-blue-600" {...register("experience")} />
              {t(`exp${x[0].toUpperCase()}${x.slice(1)}` as "expNone" | "expPast" | "expNow")}
            </label>
          ))}
        </div>
        {err("experience")}
      </fieldset>

      <div className="space-y-2">
        <label htmlFor="interest-motivation" className="block font-bold">
          {t("motivation")}
        </label>
        <textarea id="interest-motivation" rows={3} className={`${inputClass} py-3`} {...register("motivation")} />
      </div>

      <div className="space-y-2">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            id="interest-consent"
            type="checkbox"
            className="mt-1 size-5 shrink-0 cursor-pointer accent-blue-600"
            {...aria("consent")}
            {...register("consent")}
          />
          <span>{t("consent", { partner: partnerName })}</span>
        </label>
        {err("consent")}
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          <Send aria-hidden="true" />
          {isSubmitting ? t("sending") : t("submit")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => onDone(false)}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
