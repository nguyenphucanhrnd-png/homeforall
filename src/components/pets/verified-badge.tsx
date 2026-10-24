import { CircleHelp, ShieldCheck } from "lucide-react";
import { useId } from "react";

/**
 * "Đã xác minh" with an explanation popover (prompt §6, §12). Uses the native
 * popover API: works without JS, Esc and outside-click close it.
 */
export function VerifiedBadge({ label, why, explanation }: { label: string; why: string; explanation: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-sm font-bold text-success ring-1 ring-success/40 ring-inset">
        <ShieldCheck aria-hidden="true" className="size-4" />
        {label}
      </span>
      <button
        type="button"
        popoverTarget={`verified-${id}`}
        className="inline-flex min-h-11 cursor-pointer items-center gap-1 text-sm font-semibold text-blue-600 underline underline-offset-4"
      >
        <CircleHelp aria-hidden="true" className="size-4" />
        {why}
      </button>
      <span
        id={`verified-${id}`}
        popover="auto"
        role="note"
        className="m-auto max-w-sm rounded-md bg-white p-5 text-ink shadow-lift backdrop:bg-navy-900/20"
      >
        {explanation}
      </span>
    </span>
  );
}
