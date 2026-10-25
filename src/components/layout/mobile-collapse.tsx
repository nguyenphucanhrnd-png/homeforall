"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Phones only: a group that starts collapsed behind a toggle. From 768 px the
 * toggle is display:none and both wrappers are display:contents, so the child
 * lays out exactly as if it were a direct child of the parent.
 */
export function MobileCollapse({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={cn("md:contents", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full cursor-pointer items-center justify-between font-bold md:hidden"
      >
        {label}
        <ChevronDown aria-hidden="true" className={cn("size-5 transition-transform", open && "rotate-180")} />
      </button>
      <div id={id} className={cn("md:contents", !open && "max-md:hidden")}>
        {children}
      </div>
    </div>
  );
}
