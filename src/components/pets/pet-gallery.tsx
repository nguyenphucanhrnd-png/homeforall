"use client";

import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import type { PetLook, Species } from "@/lib/pets/types";
import { cn } from "@/lib/utils";
import { PetIllustration } from "./pet-illustration";

type Props = { name: string; species: Species; look: PetLook; photos: string[] };

/**
 * Large frame + thumbnails; the lightbox is a native dialog with arrow-key
 * navigation. Photos when the pet has them, otherwise three illustration frames.
 */
export function PetGallery({ name, species, look, photos }: Props) {
  const t = useTranslations("petProfile");
  const frames = photos.length > 0 ? photos.length : 3;
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const alt = (n: number) => t(photos.length ? "photoAlt" : "imageAlt", { name, n: n + 1 });
  const step = (d: number) => setActive((i) => (i + d + frames) % frames);

  // Arrow keys page through the lightbox while it is open; buttons remain the primary controls.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setActive((i) => (i + 1) % frames);
      if (e.key === "ArrowLeft") setActive((i) => (i - 1 + frames) % frames);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, frames]);

  const frame = (n: number, sizes: string, className?: string) =>
    photos.length ? (
      <span className={cn("relative block aspect-[4/3] overflow-hidden bg-cream-50", className)}>
        <Image src={photos[n]} alt={alt(n)} fill sizes={sizes} className="object-cover" />
      </span>
    ) : (
      <PetIllustration species={species} look={look} variant={n} title={alt(n)} className={className} />
    );

  return (
    <section aria-label={t("gallery", { name })} className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("openImage", { n: active + 1 })}
        className="group relative block w-full cursor-zoom-in overflow-hidden rounded-lg shadow-soft"
      >
        {frame(active, "(min-width: 1280px) 760px, 100vw")}
        <span className="absolute right-4 bottom-4 inline-flex size-11 items-center justify-center rounded-full bg-white/95 shadow-soft">
          <Expand aria-hidden="true" className="size-5" />
        </span>
      </button>

      {frames > 1 && (
        <ul className="grid grid-cols-3 gap-3 max-md:flex max-md:snap-x max-md:snap-mandatory max-md:overflow-x-auto max-md:pb-1">
          {Array.from({ length: frames }, (_, n) => (
            <li key={n} className="max-md:w-[42%] max-md:shrink-0 max-md:snap-start">
              <button
                type="button"
                onClick={() => setActive(n)}
                aria-label={alt(n)}
                aria-current={n === active ? "true" : undefined}
                className={cn(
                  "block w-full cursor-pointer overflow-hidden rounded-md ring-offset-2 ring-offset-cream-50",
                  n === active ? "ring-3 ring-blue-600" : "opacity-80 hover:opacity-100",
                )}
              >
                {frame(n, "240px")}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("gallery", { name })}
        closeLabel={t("close")}
        className="w-[min(960px,calc(100vw-32px))]"
      >
        <div className="space-y-4">
          {frame(active, "960px", "rounded-md")}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={t("prev")}
              disabled={frames < 2}
              className="inline-flex size-12 cursor-pointer items-center justify-center rounded-full bg-cream-50 hover:bg-blue-100 disabled:invisible"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <p aria-live="polite" className="font-semibold">
              {t("imageOf", { n: active + 1, total: frames })}
            </p>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label={t("next")}
              disabled={frames < 2}
              className="inline-flex size-12 cursor-pointer items-center justify-center rounded-full bg-cream-50 hover:bg-blue-100 disabled:invisible"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
