import { CircleCheck, Clock, FileSearch, House, Pause, type LucideIcon } from "lucide-react";
import type { PetStatus } from "@/lib/pets/types";
import { cn } from "@/lib/utils";

// Icon + text, never colour alone (prompt §5, §12).
const STYLES: Partial<Record<PetStatus, { icon: LucideIcon; className: string }>> = {
  available: { icon: CircleCheck, className: "bg-white text-success ring-success/40" },
  in_foster: { icon: House, className: "bg-white text-blue-800 ring-blue-800/30" },
  adoption_pending: { icon: FileSearch, className: "bg-white text-warning ring-warning/40" },
  adopted: { icon: CircleCheck, className: "bg-white text-muted ring-border" },
  paused: { icon: Pause, className: "bg-white text-muted ring-border" },
};

export function StatusChip({ status, label, className }: { status: PetStatus; label: string; className?: string }) {
  const { icon: Icon, className: tone } = STYLES[status] ?? { icon: Clock, className: "bg-white text-muted ring-border" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ring-1 ring-inset",
        tone,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
      {label}
    </span>
  );
}

export function DemoTag({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm bg-navy-900 px-2 py-0.5 text-xs font-extrabold tracking-wider text-white uppercase",
        className,
      )}
    >
      {label}
    </span>
  );
}
