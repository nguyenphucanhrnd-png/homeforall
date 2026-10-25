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

/** Phones only (≤ 767 px): a slim bottom bar "Phát hiện 1 bé đi lạc" (hidden on /report and while the menu is open). */
export const MOBILE_STICKY_CTA = true;
