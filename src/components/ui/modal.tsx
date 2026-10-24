"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  closeLabel: string;
  children: ReactNode;
  className?: string;
};

/**
 * Native <dialog> + showModal(): the browser provides the focus trap, Esc to
 * close and the inert background. We restore focus to the opener on close.
 */
export function Modal({ open, onClose, title, closeLabel, children, className }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Click on the backdrop closes (Esc is the keyboard equivalent, built into <dialog>).
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onClick = (e: MouseEvent) => {
      if (e.target === dialog) dialog.close();
    };
    dialog.addEventListener("click", onClick);
    return () => dialog.removeEventListener("click", onClick);
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => {
        onClose();
        (opener.current as HTMLElement | null)?.focus?.();
      }}
      className={cn(
        "m-auto max-h-[90dvh] w-[min(640px,calc(100vw-32px))] overflow-y-auto rounded-lg bg-white p-0 text-ink shadow-lift backdrop:bg-navy-900/60",
        className,
      )}
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-white px-8 pt-6 pb-4">
        <h2 id={titleId} className="text-2xl font-bold text-blue-800">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label={closeLabel}
          className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-cream-50"
        >
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="px-8 py-6">{children}</div>
    </dialog>
  );
}
