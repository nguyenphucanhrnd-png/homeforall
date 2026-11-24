import { Crosshair, HandHeart, HeartHandshake, House, Search, type LucideIcon } from "lucide-react";

export type EntryIntentId = "report" | "nearest" | "adopt" | "help" | "partner";

export type EntryIntent = {
  id: EntryIntentId;
  /** Locale-less path; next-intl's <Link> adds /vi or /en. */
  href: string;
  /** Urgent options come first and use the accent style. */
  urgent: boolean;
  icon: LucideIcon;
};

/**
 * Options of the "What do you need today?" dialog, in display order (max 5).
 * Change order or destinations here only; labels live in messages → entryIntent.options.<id>.
 */
export const ENTRY_INTENTS: readonly EntryIntent[] = [
  { id: "report", href: "/report", urgent: true, icon: Search },
  // /report opens on the location bar: "Use my location" only on tap, ward fallback, 3 nearest rescue + vets.
  { id: "nearest", href: "/report#nearest", urgent: true, icon: Crosshair },
  { id: "adopt", href: "/pets", urgent: false, icon: House },
  // /foster is the "Nuôi tạm & Tình nguyện" hub (links on to /volunteer).
  { id: "help", href: "/foster", urgent: false, icon: HandHeart },
  { id: "partner", href: "/partners#become", urgent: false, icon: HeartHandshake },
];
