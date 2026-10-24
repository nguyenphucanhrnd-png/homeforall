"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { sendMagicLink } from "./actions";
import { magicLinkSchema, type MagicLinkInput } from "./schema";

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("login");
  const [status, setStatus] = useState<"idle" | "sent" | "failed">("idle");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MagicLinkInput>({ resolver: zodResolver(magicLinkSchema) });

  const onSubmit = handleSubmit(async (values) => {
    const result = await sendMagicLink(values, next);
    setStatus(result.ok ? "sent" : "failed");
  });

  if (status === "sent") {
    return (
      <p role="status" className="flex items-start gap-3 rounded-md bg-white p-5 font-semibold shadow-soft">
        <CircleCheck aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-success" />
        {t("sent")}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="block font-bold">
          {t("email")}
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          aria-invalid={errors.email ? "true" : undefined}
          aria-describedby={errors.email ? "email-error" : undefined}
          className="block min-h-12 w-full rounded-sm border-2 border-border bg-white px-4 text-ink aria-invalid:border-danger"
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" className="font-semibold text-danger">
            {t("emailInvalid")}
          </p>
        )}
      </div>
      {status === "failed" && (
        <p role="alert" className="font-semibold text-danger">
          {t("error")}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        <Mail aria-hidden="true" />
        {isSubmitting ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}
