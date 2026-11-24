// Feature flags. Change a value here to switch a feature (no env magic).

/** The found-animal report flow (/report). */
export const FEATURE_REPORT = true;

/** Any public list or map of reports. Stays OFF: live locations of free-roaming animals are never published. */
export const FEATURE_PUBLIC_REPORT = false;

/**
 * One site-wide honesty note (footer + /about) instead of per-item "demo" labels:
 * some pet profiles, map points, contacts and partner content are sample data or proposals.
 */
export const SHOW_PROTOTYPE_NOTICE = true;

/**
 * "What do you need today?" entry dialog on the home page (first visit per session).
 * On by default; set NEXT_PUBLIC_ENTRY_INTENT=off (or false/0) to disable it without removing code.
 */
export const FEATURE_ENTRY_INTENT = !["off", "false", "0"].includes(
  (process.env.NEXT_PUBLIC_ENTRY_INTENT ?? "").trim().toLowerCase(),
);
