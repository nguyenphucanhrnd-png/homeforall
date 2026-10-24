"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  FOSTER_DURATIONS,
  FOSTER_SIZES,
  FOSTER_SPECIES,
  fosterOfferSchema,
  type FosterOfferInput,
} from "@/lib/foster/offer-schema";
import { submitFosterOffer } from "./actions";

const choice =
  "flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border-2 border-border bg-white px-4 has-checked:border-blue-600 has-checked:bg-blue-100";
const input =
  "block min-h-12 w-full rounded-sm border-2 border-border bg-white px-4 text-ink aria-invalid:border-danger";

const SPECIES_LABEL = { cat: "speciesCat", dog: "speciesDog", any: "speciesAny" } as const;
const SIZE_LABEL = { small: "sizeSmall", medium: "sizeMedium", large: "sizeLarge" } as const;
const DURATION_LABEL = { under2w: "d1", "2to8w": "d2", over2m: "d3" } as const;

export function FosterForm() {
  const t = useTranslations("foster");
  const e = useTranslations("interest.errors");
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FosterOfferInput>({
    resolver: zodResolver(fosterOfferSchema),
    mode: "onTouched",
    defaultValues: { species: "any", sizes: [], consent: false as unknown as true },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await submitFosterOffer(values);
    if (result.ok) setSent(true);
    else for (const f of result.fields) setError(f as keyof FosterOfferInput, { message: "required" });
  });

  const msg = (err: FieldErrors<FosterOfferInput>[keyof FosterOfferInput]) => {
    const m = err?.message;
    if (!m) return null;
    return m === "contact" ? e("phone") : m === "consent" ? e("consent") : e("required");
  };
  const err = (name: keyof FosterOfferInput) =>
    errors[name] ? (
      <p id={`foster-${name}-error`} className="font-semibold text-danger">
        {msg(errors[name])}
      </p>
    ) : null;
  const aria = (name: keyof FosterOfferInput) => ({
    "aria-invalid": errors[name] ? (true as const) : undefined,
    "aria-describedby": errors[name] ? `foster-${name}-error` : undefined,
  });

  if (sent) {
    return (
      <div role="status" data-testid="foster-success" className="space-y-3">
        <p className="flex items-center gap-3 text-xl font-bold text-success">
          <CircleCheck aria-hidden="true" className="size-7" />
          {t("successTitle")}
        </p>
        <p className="rounded-md bg-cream-50 p-4 font-semibold text-warning">{t("successDemo")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5" aria-labelledby="foster-form-title">
      <fieldset className="space-y-2" {...aria("species")}>
        <legend className="mb-1 font-bold">{t("species")}</legend>
        <div className="flex flex-wrap gap-2">
          {FOSTER_SPECIES.map((v) => (
            <label key={v} className={choice}>
              <input type="radio" value={v} className="size-4 accent-blue-600" {...register("species")} />
              {t(SPECIES_LABEL[v])}
            </label>
          ))}
        </div>
        {err("species")}
      </fieldset>

      <fieldset className="space-y-2" {...aria("sizes")}>
        <legend className="mb-1 font-bold">{t("size")}</legend>
        <div className="flex flex-wrap gap-2">
          {FOSTER_SIZES.map((v) => (
            <label key={v} className={choice}>
              <input type="checkbox" value={v} className="size-4 accent-blue-600" {...register("sizes")} />
              {t(SIZE_LABEL[v])}
            </label>
          ))}
        </div>
        {err("sizes")}
      </fieldset>

      <fieldset className="space-y-2" {...aria("duration")}>
        <legend className="mb-1 font-bold">{t("duration")}</legend>
        <div className="flex flex-wrap gap-2">
          {FOSTER_DURATIONS.map((v) => (
            <label key={v} className={choice}>
              <input type="radio" value={v} className="size-4 accent-blue-600" {...register("duration")} />
              {t(DURATION_LABEL[v])}
            </label>
          ))}
        </div>
        {err("duration")}
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="foster-ward" className="block font-bold">
            {t("ward")}
          </label>
          <input
            id="foster-ward"
            autoComplete="address-level3"
            className={input}
            {...aria("ward")}
            {...register("ward")}
          />
          {err("ward")}
        </div>
        <div className="space-y-2">
          <label htmlFor="foster-from" className="block font-bold">
            {t("from")}
          </label>
          <input id="foster-from" type="date" className={input} {...aria("from")} {...register("from")} />
          {err("from")}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="foster-contact" className="block font-bold">
          {t("contactValue")}
        </label>
        <input
          id="foster-contact"
          autoComplete="tel"
          className={input}
          {...aria("contact")}
          {...register("contact")}
        />
        {err("contact")}
      </div>

      <div className="space-y-2">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-5 shrink-0 accent-blue-600"
            {...aria("consent")}
            {...register("consent")}
          />
          <span>{t("consent")}</span>
        </label>
        {err("consent")}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        <Send aria-hidden="true" />
        {isSubmitting ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}
