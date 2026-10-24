"use client";

import { Send, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { addUpdate, deleteMyReport, markAnimalLeft } from "../../actions";

/** Reporter actions; the secret token is the only credential. */
export function TrackControls({ token }: { token: string }) {
  const t = useTranslations("report");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState(false);

  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      setError(false);
      try {
        await fn();
        router.refresh();
      } catch {
        setError(true);
      }
    });

  if (deleted) {
    return (
      <p role="status" className="rounded-lg bg-white p-6 font-bold shadow-soft">
        {t("track.deleted")}
      </p>
    );
  }

  return (
    <section aria-labelledby="track-update" className="space-y-4 rounded-lg bg-white p-6 shadow-soft">
      <h2 id="track-update" className="text-xl font-bold">
        {t("track.update")}
      </h2>
      <form className="space-y-3" action={(fd) => run(() => addUpdate(token, fd))}>
        <label htmlFor="track-text" className="block font-bold">
          {t("track.updateText")}
        </label>
        <textarea
          id="track-text"
          name="text"
          rows={3}
          maxLength={280}
          required
          className="block w-full rounded-sm border-2 border-border bg-white px-4 py-3"
        />
        <label htmlFor="track-photo" className="block font-bold">
          {t("track.updatePhoto")}
        </label>
        <input id="track-photo" name="photo" type="file" accept="image/*" className="block" />
        <Button type="submit" disabled={pending}>
          <Send aria-hidden="true" />
          {t("track.send")}
        </Button>
      </form>
      <div className="flex flex-wrap gap-3 border-t border-border pt-4">
        <Button type="button" variant="secondary" disabled={pending} onClick={() => run(() => markAnimalLeft(token))}>
          {t("track.left")}
        </Button>
        <Button
          type="button"
          variant="emergency"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(t("track.deleteConfirm"))) return;
            start(async () => {
              const res = await deleteMyReport(token);
              if (res.ok) setDeleted(true);
              else setError(true);
            });
          }}
        >
          <Trash2 aria-hidden="true" />
          {t("track.delete")}
        </Button>
      </div>
      {error && (
        <p role="alert" className="font-semibold text-danger">
          {t("errors.generic")}
        </p>
      )}
    </section>
  );
}
