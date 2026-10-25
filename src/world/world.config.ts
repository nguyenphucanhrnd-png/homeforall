// The single source of truth for "one world, one story" (Master Prompt v4 §5.1).
// Scenes (plates), the six journey steps, per-route scene headers and chips,
// and the landing scroll track all live here. Components read this file; none
// hard-code plate ids, step numbers or links.

export type Localized = { vi: string; en: string };

// ─── Plates ───────────────────────────────────────────────────────────────────
export const PLATE_IDS = ["s01", "s02", "s03", "s04", "s05", "s06", "s07", "s08", "s09"] as const;
export type PlateId = (typeof PLATE_IDS)[number];

export const MOODS = {
  cream: "#FFF6EE",
  night: "#0B1F33",
  blue: "#DCEBFA",
  amber: "#F7D2A6",
  peach: "#FDD7B5",
  golden: "#FFD9A0",
  morning: "#FFF1DD",
} as const;
export type Mood = keyof typeof MOODS;

export type PlateSpec = {
  mood: Mood;
  /** Cover-crop focal point, 0–1 in image space (0.5, 0.5 = centre). */
  focal: [number, number];
  /** Used as the canvas aria-label and as alt text for still frames. */
  caption: Localized;
  /** If this plate is missing: show another plate's still, or a flat mood colour (null). */
  fallback: { plate: PlateId; frame: "poster" | "last" } | null;
};

export const PLATES: Record<PlateId, PlateSpec> = {
  s01: {
    mood: "cream",
    focal: [0.55, 0.55],
    caption: {
      vi: "Minh hoạ đất sét: ngôi nhà mái cam, chú chó và mèo Miu ngồi trước cửa",
      en: "Clay illustration: an orange-roofed house with the dog and Miu the cat at the door",
    },
    fallback: null,
  },
  s02: {
    mood: "night",
    focal: [0.4, 0.6],
    caption: {
      vi: "Minh hoạ đất sét: Miu co ro dưới mái tôn trong con hẻm mưa đêm",
      en: "Clay illustration: Miu huddled under a tin awning in a rainy night alley",
    },
    fallback: null,
  },
  s03: {
    mood: "night",
    focal: [0.5, 0.6],
    caption: {
      vi: "Minh hoạ đất sét: một tình nguyện viên mang lồng đến, dấu chân sáng dần",
      en: "Clay illustration: a volunteer arrives with a carrier as paw prints light up",
    },
    fallback: { plate: "s02", frame: "last" },
  },
  s04: {
    mood: "blue",
    focal: [0.5, 0.5],
    caption: {
      vi: "Minh hoạ đất sét: Miu ngồi trên bàn khám ở phòng khám thú y",
      en: "Clay illustration: Miu sits on the exam table at a vet clinic",
    },
    fallback: null,
  },
  s05: {
    mood: "amber",
    focal: [0.55, 0.55],
    caption: {
      vi: "Minh hoạ đất sét: Miu ngủ yên trên ổ nệm ở nhà nuôi tạm",
      en: "Clay illustration: Miu asleep on a cushion bed in a foster home",
    },
    fallback: null,
  },
  s06: {
    mood: "peach",
    focal: [0.5, 0.5],
    caption: {
      vi: "Minh hoạ đất sét: hoàng hôn màu đào, dải trái tim và dấu chân bay trên mái nhà",
      en: "Clay illustration: a peach dusk with a ribbon of hearts and paw prints over the rooftops",
    },
    fallback: null,
  },
  s07: {
    mood: "golden",
    focal: [0.5, 0.55],
    caption: {
      vi: "Minh hoạ đất sét: cánh cửa mở ra ánh sáng ấm, Miu bước vào nhà mới",
      en: "Clay illustration: a door opens onto warm light as Miu walks into a new home",
    },
    fallback: null,
  },
  s08: {
    mood: "night",
    focal: [0.5, 0.5],
    caption: {
      vi: "Minh hoạ đất sét: khu phố lúc hoàng hôn, những vòng cung vàng bắt đầu nối các ngôi nhà",
      en: "Clay illustration: the neighbourhood at dusk as golden arcs begin to connect the houses",
    },
    fallback: null,
  },
  s09: {
    mood: "morning",
    focal: [0.5, 0.5],
    caption: {
      vi: "Minh hoạ đất sét: buổi sáng ở nhà mới, Miu ngồi bên cửa sổ cạnh tấm lịch ba trái tim",
      en: "Clay illustration: morning in the new home, Miu on the windowsill beside a three-heart calendar",
    },
    fallback: { plate: "s07", frame: "last" },
  },
};

// ─── The journey (six steps) ──────────────────────────────────────────────────
export type JourneyStepId = "rescue" | "vet" | "foster" | "match" | "adopt" | "follow";

export type JourneyStep = {
  n: 1 | 2 | 3 | 4 | 5 | 6;
  id: JourneyStepId;
  /** Plates shown during this step, in order, with their share of the step. */
  plates: PlateId[];
  hash: `journey-${number}`;
  /** Payoff page for "Đi tới tính năng" (alignment table, v4 §3). */
  feature: { href: string; ctaKey: string };
};

export const JOURNEY: JourneyStep[] = [
  { n: 1, id: "rescue", plates: ["s02", "s03"], hash: "journey-1", feature: { href: "/report", ctaKey: "rescue" } },
  { n: 2, id: "vet", plates: ["s04"], hash: "journey-2", feature: { href: "/learn#vet", ctaKey: "vet" } },
  { n: 3, id: "foster", plates: ["s05"], hash: "journey-3", feature: { href: "/foster", ctaKey: "foster" } },
  { n: 4, id: "match", plates: ["s06"], hash: "journey-4", feature: { href: "/pets", ctaKey: "match" } },
  { n: 5, id: "adopt", plates: ["s07"], hash: "journey-5", feature: { href: "/pets", ctaKey: "adopt" } },
  { n: 6, id: "follow", plates: ["s09"], hash: "journey-6", feature: { href: "/learn#first-week", ctaKey: "follow" } },
];

/** Tune the journey's length here: every journey length below scales with it. */
export const JOURNEY_SCROLL_MULTIPLIER = 2;
/** Pinned journey length in viewport heights (base 5 vh, v4 §5.2) × multiplier. */
export const JOURNEY_PIN_VH = 5 * JOURNEY_SCROLL_MULTIPLIER;
/** Crossfade between plates outside the journey, in viewport heights of scroll (≈ 400–600 ms). */
export const CROSSFADE_VH = 0.45;
/** Crossfade between journey plates (scaled, so the transition is actually visible). */
export const JOURNEY_CROSSFADE_VH = CROSSFADE_VH * JOURNEY_SCROLL_MULTIPLIER;
/** Each journey step rests on its last frame for this much scroll before moving on. */
export const JOURNEY_HOLD_VH = 0.3;

/** Subtle camera drift on plates (canvas scale 1 → 1 + this), so holds stay alive. */
export const PLATE_DRIFT = 0.03;

/**
 * "One network" (pinned): phase 1 scrubs s08 with the box and map hidden, then the
 * finished picture holds, then map + box reveal and the pin releases.
 */
export const NETWORK_PLAY_VH = 2.5;
export const NETWORK_HOLD_VH = 0.5;
/** Pinned scroll after the reveal starts (content visible) before the page continues. */
export const NETWORK_REVEAL_VH = 0.8;

/**
 * Plate ranges inside the pinned journey, as fractions of the pin (storyboard.md).
 * Step n covers [(n-1)/6, n/6]; step 1 is split between s02 and s03.
 */
export const JOURNEY_TRACK: Array<{ plate: PlateId; from: number; to: number }> = [
  { plate: "s02", from: 0, to: 0.09 },
  { plate: "s03", from: 0.09, to: 1 / 6 },
  { plate: "s04", from: 1 / 6, to: 2 / 6 },
  { plate: "s05", from: 2 / 6, to: 3 / 6 },
  { plate: "s06", from: 3 / 6, to: 4 / 6 },
  { plate: "s07", from: 4 / 6, to: 5 / 6 },
  { plate: "s09", from: 5 / 6, to: 1 },
];

// ─── Landing scroll track (what the fixed canvas shows) ──────────────────────
// Sections without a plate are opaque and simply hide the canvas.
export type LandingSegment = {
  id: string;
  /** Section element id (`scene-…`). */
  section: string;
  plate: PlateId | null;
  /** ScrollTrigger start/end; `endSection` lets a segment span two sections. */
  start: string;
  end: string;
  endSection?: string;
  /** Hold a fixed playhead (0–1) instead of scrubbing. */
  hold?: number;
  /** Dim the plate with its mood colour as t goes from a → b (max alpha). */
  dim?: { from: number; to: number; alpha: number };
  /** Instead of `end`: scrub over this many viewport heights after `start` (inside a pin). */
  scrubVh?: number;
  /** Camera drift runs over this many viewport heights after `start` (scrub + hold). */
  driftVh?: number;
};

export const LANDING_TRACK: LandingSegment[] = [
  {
    id: "hero",
    section: "scene-hero",
    plate: "s01",
    start: "top top",
    endSection: "scene-doors",
    end: "bottom center",
    dim: { from: 0.55, to: 0.9, alpha: 0.55 },
  },
  { id: "pets", section: "scene-pets", plate: null, start: "top top", end: "bottom top" },
  { id: "journey-enter", section: "scene-journey", plate: "s02", start: "top bottom", end: "top top", hold: 0 },
  // The pinned journey itself is driven by JOURNEY_TRACK.
  { id: "trust", section: "scene-trust", plate: null, start: "top top", end: "bottom top" },
  // "One network" is pinned: first frame while it slides in, then phase 1 scrubs s08.
  { id: "network-enter", section: "scene-network", plate: "s08", start: "top bottom", end: "top top", hold: 0 },
  {
    id: "network",
    section: "scene-network",
    plate: "s08",
    start: "top top",
    end: "bottom top",
    scrubVh: NETWORK_PLAY_VH,
    driftVh: NETWORK_PLAY_VH + NETWORK_HOLD_VH,
  },
  { id: "stories", section: "scene-stories", plate: null, start: "top top", end: "bottom top" },
];

/** Section stills that are plain images in every mode (no canvas). */
export const SECTION_STILLS = {
  facts: { plate: "s02" as PlateId, frame: "last" as const },
  final: { plate: "s07" as PlateId, frame: "last" as const },
};

// ─── Named page stills (design-refs/video/master-timecodes.txt) ──────────────
// One distinct frame per page, generated by hfa_media.py into public/assets/stills/.
export const STILLS = [
  "about-hero",
  "help-calm",
  "volunteer-header",
  "care-header",
  "foster-header",
  "pets-header",
  "login-door",
  "adopt-door",
  "stories-header",
  "partners-header",
  "report-rescue",
] as const;
export type StillName = (typeof STILLS)[number];

/** A page's scene: its own named still when there is one, else a plate frame (then a mood colour). */
export type SceneImage = { still?: StillName; plate: PlateId; frame: "poster" | "last" };

// ─── Routes: scene headers, journey chips, the way back ──────────────────────
export type JourneyChipKind = number | "network" | "help";

export type RouteWorld = {
  sceneHeader: SceneImage | null;
  chip: JourneyChipKind | null;
  /** Promise line message key under `world.promise`. */
  promiseKey?: string;
  backToStory: string | null;
};

export const ROUTES: Record<string, RouteWorld> = {
  "/pets": { sceneHeader: { still: "pets-header", plate: "s06", frame: "poster" }, chip: 4, promiseKey: "pets", backToStory: "/#journey-4" },
  "/pets/[code]": { sceneHeader: null, chip: 4, backToStory: "/#journey-4" },
  "/foster": { sceneHeader: { still: "foster-header", plate: "s05", frame: "last" }, chip: 3, promiseKey: "foster", backToStory: "/#journey-3" },
  "/volunteer": { sceneHeader: { still: "volunteer-header", plate: "s03", frame: "last" }, chip: 1, promiseKey: "volunteer", backToStory: "/#journey-1" },
  "/learn": { sceneHeader: { still: "care-header", plate: "s04", frame: "poster" }, chip: 2, promiseKey: "learn", backToStory: "/#journey-2" },
  "/partners": { sceneHeader: { still: "partners-header", plate: "s08", frame: "last" }, chip: "network", promiseKey: "partners", backToStory: "/#scene-network" },
  // No dedicated stills yet for network / events / donate (see docs/AUDIT.md §6): plate frames for now.
  "/network": { sceneHeader: { plate: "s08", frame: "last" }, chip: "network", promiseKey: "map", backToStory: "/#scene-network" },
  "/events": { sceneHeader: { plate: "s08", frame: "poster" }, chip: "network", promiseKey: "events", backToStory: "/#scene-network" },
  "/donate": { sceneHeader: { plate: "s09", frame: "last" }, chip: "network", promiseKey: "donate", backToStory: "/#scene-network" },
  "/stories": { sceneHeader: { still: "stories-header", plate: "s09", frame: "last" }, chip: 6, promiseKey: "stories", backToStory: "/#journey-6" },
  "/about": { sceneHeader: { still: "about-hero", plate: "s01", frame: "last" }, chip: null, promiseKey: "about", backToStory: "/" },
  "/login": { sceneHeader: { still: "login-door", plate: "s07", frame: "poster" }, chip: null, promiseKey: "login", backToStory: null },
  "/help": { sceneHeader: null, chip: "help", backToStory: null },
  // Found-animal report: action first (no scene header pushing help below the fold), calm and ad-free.
  "/report": { sceneHeader: null, chip: 1, promiseKey: "report", backToStory: "/#journey-1" },
};

/** Stills used by a landing door tile. `report-rescue` (s03 at 8.6 s) is reserved for this tile only. */
export const DOOR_STILLS = { report: "report-rescue" } as const satisfies Record<string, StillName>;

/** Stills generated but not yet bound to a route (reserved; see docs/AUDIT.md §6). */
export const RESERVED_STILLS: Record<string, string> = {
  "adopt-door": "application stage 2 / status tracker page (R4)",
  "help-calm": "unused: /help must stay scene-free (story rule 4); confirm with the team",
};

// ─── Hotspots (proposed after plates exist; v4 §6, approval required) ────────
export type Hotspot = { plate: PlateId; x: number; y: number; label: Localized; tip: Localized; href?: string };
export const HOTSPOTS: Hotspot[] = [];
