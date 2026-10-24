"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const KEY = "hfa:saved-pets";
const PROMPTED = "hfa:save-prompted";

// Saves live in the browser until accounts exist. The login prompt appears on
// the *second* save, never the first (journey A2).

function read(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function write(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("hfa:saved-changed"));
  } catch {
    /* storage unavailable: saving silently becomes per-page */
  }
}

export function SaveButton({ code, name, className }: { code: string; name: string; className?: string }) {
  const t = useTranslations("pets.save");
  const [saved, setSaved] = useState(false);
  const [prompt, setPrompt] = useState(false);
  const promptId = useId();

  useEffect(() => {
    const sync = () => setSaved(read().includes(code));
    sync();
    window.addEventListener("hfa:saved-changed", sync);
    return () => window.removeEventListener("hfa:saved-changed", sync);
  }, [code]);

  function toggle() {
    const list = read();
    if (list.includes(code)) {
      write(list.filter((c) => c !== code));
      return;
    }
    write([...list, code]);
    let alreadyPrompted = false;
    try {
      alreadyPrompted = localStorage.getItem(PROMPTED) === "1";
      if (list.length >= 1 && !alreadyPrompted) localStorage.setItem(PROMPTED, "1");
    } catch {}
    if (list.length >= 1 && !alreadyPrompted) setPrompt(true);
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        aria-label={saved ? t("saved", { name }) : t("save", { name })}
        aria-describedby={prompt ? promptId : undefined}
        className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/95 text-danger shadow-soft transition-transform duration-150 hover:scale-105 active:scale-95"
      >
        <Heart aria-hidden="true" className={cn("size-5", saved && "fill-current")} />
      </button>
      {prompt && (
        <div
          id={promptId}
          role="status"
          className="absolute top-12 right-0 z-20 w-64 space-y-3 rounded-md bg-white p-4 text-sm shadow-lift"
        >
          <p className="font-semibold text-ink">{t("prompt")}</p>
          <div className="flex gap-2">
            <Link href="/login" className="font-bold">
              {t("promptCta")}
            </Link>
            <button type="button" onClick={() => setPrompt(false)} className="cursor-pointer font-semibold text-muted">
              {t("dismiss")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
