# Phase R0 audit (Master Prompt v4)

Date: 2026-10-24 · Build audited: production build on `localhost:3001` · Screenshots (1440 px, static mode): `docs/audit/*.png` (git-ignored) · Raw data: `docs/audit/routes.json`

No code was changed during this audit.

## 0. Headline findings

1. **The 3D world exists, but you were shown static mode.** The landing has a React Three Fiber canvas (procedural clay house, cat, dog, journey stations, camera path). It is switched off when the window is **< 768 px wide** or the OS asks for **reduced motion** (Windows: Settings → Accessibility → Visual effects → *Animation effects* off). Measured: 900 / 1280 / 1440 px → `full` mode, 1 canvas; 700 px or reduced motion → `static`, 0 canvases. The brief's "no `<canvas>`" observation matches a narrow window, which also explains the header overflow you saw.
2. **v4 changes the rendering approach** from procedural R3F to pre-rendered **plates** (WebP frame sequences of AI clay video). No plates exist yet; only a 10 s 1280×720 montage reference is available (see §3.4).
3. **8 routes required by v4 do not exist:** `/volunteer`, `/map`, `/events`, `/stories`, `/donate`, `/register`, `/care`, `/partners/[slug]`.
4. **The story spine is missing outside the landing:** no journey chip, no scene headers, no "Quay lại hành trình", no hash links (`/#journey-n`), no "Đi tới tính năng" links from journey steps.
5. **Database is still deferred** (your decision 2026-10-24): only the foundation migration exists (profiles, roles, organisations, members, flags, audit log) with PGlite RLS tests. All journeys run on demo data and nothing is stored.

## 1. Route inventory

| Route | HTTP | State | v4 role (§5.3) |
|---|---|---|---|
| `/vi`, `/en` | 200 | Landing, 10 scenes, R3F world in Full/Lite, static fallback | Cinematic landing |
| `/vi/pets` | 200 | **Working**: filters in URL, sort, stale ranking, 12 demo cards, save heart | s06 header, chip 4/6 (missing) |
| `/vi/pets/[code]` | 200 | **Working**: gallery + lightbox, health timeline, verified popover, stay-safe, share, report, Express interest (demo) | mood strip, chip 4/6 (missing) |
| `/vi/help` | 200 | Structure only; first-aid text is a marked placeholder; no partner triage data | no header, chip "Cần giúp ngay" (missing) |
| `/vi/login` | 200 | Magic-link form; shows "not connected" (no Supabase) | s07 door header (missing) |
| `/vi/foster` | 200 | "Being built" stub | s05 header, chip 3/6 |
| `/vi/learn` | 200 | Stub (nav label "Chăm sóc") | s04 header, chip 2/6 |
| `/vi/partners` | 200 | Stub | s08 header, network chip |
| `/vi/about` | 200 | Stub | s01 header |
| `/vi/dashboard`, `/dashboard/[area]`, `/admin` | 200 | Role-gated shells (redirect to login when anonymous) | no header |
| `/vi/dev/typography` | 404 in prod | Dev-only font check | — |
| `/vi/volunteer`, `/map`, `/events`, `/stories`, `/donate`, `/register`, `/care`, `/partners/[slug]` | **404** | Missing | see §5.3 |

## 2. Feature status by v4 flow (§3–4)

| Flow / beat | Exists | Partial | Missing | Blocked by |
|---|---|---|---|---|
| **Adopter** A1 profile from shared link | ✅ (demo data) | | OG image, schema.org | — |
| A2 browse, filters, save | ✅ | save is browser-only | account sync | DB |
| A3 Express interest (stage 1) | | UI + validation, not stored | stage 2, invite | DB |
| A4 status tracker, thread, withdraw | | | ✗ | DB |
| A6 after-adoption checklist, check-ins | | | ✗ | DB |
| **Rescue** R1 partner application | | | ✗ | — (UI can be built) |
| R2 60-s add-pet + share card | | | ✗ | — |
| R3 "Hôm nay" inbox, triage templates | | | ✗ | — |
| R4 handover | | | ✗ | — |
| R5 weekly nudge | | stale label + ranking | nudge | DB/email |
| **Foster** F1 form, match, checklist | | | ✗ | — |
| **Volunteer** task board | | | ✗ (no route) | — |
| **Vet** V1 quick-log (code/QR), V2 appointments, V3 clinic profile | | | ✗ | — |
| **Citizen** `/help` | structure | first aid = placeholder | partner triage list | medical reviewer, data |
| **Sponsor** read-only view | | | ✗ | — |
| **Network** `/partners`, `/map`, `/events`, `/donate` | | stubs | 3 routes missing | — |
| **Admin** verification queue etc. | | gated shell | ✗ | — |
| Auth (magic link) + roles | code + RLS tests | | live login untested | Supabase project |

## 3. Scene ↔ feature alignment gaps

1. **Landing journey steps are dead ends:** no "Đi tới tính năng" link, no prev/next buttons, no `#journey-n` anchors.
2. **Doors** link correctly (`/pets`, `/foster`, `/learn`, `/partners`) but show icons, not stills of the scene they lead to.
3. **Network scene** lists roles but links nowhere (`/partners`, `/map`, `/events` not reachable from it).
4. **Inner pages** have no journey chip, no scene header, no way back to the story → every inner page is an "orphan" by v4's rule 2.
5. **Mascots vs listings:** the current landing pet row uses the same procedural illustrations as demo listings; v4 requires Miu and the dog to be mascots only. The landing 3D cat/dog are not shown as listings, so this is fine, but plates must keep the separation.
6. **`world.config.ts` does not exist:** scene, step, route and CTA relations are spread across `landing/config.ts`, `sections.tsx` and message files.

### 3.4 Assets in `HomeForAll_3d_kit/design-refs`
- Found: docs, `make-plates.sh`, 10 reference frames, `_v1-montage-reference.mp4` (10 s, 1280×720). Empty: `mascots/`, `real-photos/`, `moodboard/`. No `sNN-*.mp4` clips → **no real plates**.
- The montage's "connect" segment (frame t05) shows **photorealistic dogs with caption text**. That breaks the plate rules (no photos, no text), so the dev stub must not use it: s06 will be a flat peach fallback.
- The montage has **no s09** (follow-up calendar); s09 falls back to s07 `last`.
- 1280×720 will look soft on 1440–1920 px screens; final clips should be ≥ 1600 px wide.
- `ffmpeg`/`ffprobe` are not installed, so `make-plates.sh` cannot run yet.
- The kit lives outside the repo (`3D web/HomeForAll_3d_kit/`); v4 expects `design-refs/` next to `package.json`.

## 4. Accessibility and performance

| Issue | Severity | Evidence |
|---|---|---|
| Header causes horizontal scroll at narrow widths | High | +104 px at 375 px (+88 px EN); 0 at ≥ 768 px |
| Two header logo images have `alt=""` | Low | Decorative inside a labelled link (valid), but v4 asks for meaningful alts; landing poster/postcards also `alt=""` (decorative, `aria-hidden`) |
| Canvas has no `role="img"` + `aria-label` | Medium | Wrapper is `aria-hidden`; v4 requires labelled canvases |
| Hero LCP is the logo PNG, not a plate poster | Medium | No plates yet |
| Unknown pet code returns HTTP 200 (renders not-found + `noindex`) | Low | Streaming inside Suspense |
| Lighthouse budgets never measured | Medium | No Lighthouse CI yet |
| axe: no serious/critical issues on audited pages | — | e2e suite (46 tests) |
| Keyboard focus never fully hidden (WCAG 2.2) | — | Fixed and tested 2026-10-24 |

## 5. Proposed order and disagreements

**Order:** R1 world foundation → R2 landing story → R3 scene headers + missing pages → R4 core journeys (on demo data until the DB is connected) → R5 overlays and polish. Same as the brief.

**Disagreements / decisions to confirm**
1. **Dev stub plates:** cut from the montage by time; s06 = flat peach (montage segment has real-dog photos + text), s09 = s07 `last`. Marked `DEV STUB`, excluded from production builds.
2. **Persistent world across routes (§5.4):** recommend per-page Scene Headers (still images) instead of one root-level canvas. Lower memory, simpler, and inner pages are meant to be calm anyway.
3. **Retire the procedural R3F world** once the plate engine works (v4 replaces it). R3F stays only for the step-4 photo cards. There is no git commit yet, so I recommend a baseline commit first to keep a way back.
4. **Routes:** keep `/learn` as "Chăm sóc" (no `/care` duplicate). `/register` is redundant with magic-link login: propose `/register` → same page as `/login` with different copy. Both need your OK (renaming routes).
5. **ffmpeg:** needed for your `make-plates.sh`. Recommend installing it system-wide (free, open source).
6. **Verified badge copy** ("what was checked") needs the team's real verification procedure; it stays generic until then.

## 6. Addendum: media folder contract (v4.1, 2026-10-24 evening)

**Step 0 report.** Project root `C:\j4f\3D web\homeforall` has `package.json`, `design-refs/`, `public/`. `hfa_media.py check`: master `design-refs/video/master.mp4` is **1280×720 @ 24 fps, 30.0 s: NOT 4K**; plates s01–s09 and 10 stills exist (interim, 1280 px, generated by the script); timecodes valid (9 clips, 10 stills). No Gemini sparkle visible in the 10 stills or 18 sampled plate frames (logo corner checked at 3× zoom). `all` was not re-run: outputs already match the master and timecodes.

**Follow-ups**
- Needs a true 4K master (`design-refs/video/master-4k.mp4`, README §4), then `python design-refs/scripts/hfa_media.py all`. The code reads widths from `manifest.json`; nothing is hard-coded.
- s05 (1.9 s), s07 (2.1 s) and s08 (1.2 s, weak) are short; the engine stretches them over scroll and holds last frames.
- Asset terms for the Gemini master are **not yet checked** (`design-refs/CREDITS.md`).

**Distinct stills: gaps to decide**
| Route | Still | Note |
|---|---|---|
| /pets, /foster, /volunteer, /learn, /stories, /partners, /about, /login | pets-header, foster-header, volunteer-header, care-header, stories-header, partners-header, about-hero, login-door | one each, unit-tested as distinct |
| /map, /events, /donate | none yet → s08 last / s08 poster / s09 last | **no dedicated stills**; s08 frames look alike. Add three `still` lines to `master-timecodes.txt` (your call) |
| `adopt-door` | reserved | for the application stage 2 / status tracker page (R4) |
| `help-calm` | unused | `/help` must stay scene-free (story rule 4). Keep unused, or use it elsewhere? |

**Changed because of v4.1**: the DEV STUB and `make-dev-stub.sh` were removed (only `hfa_media.py` may produce media); the decode cache is now a byte budget (200 MB full, 120 MB lite; measured peak 197 MB over a full down-and-up scroll); scene headers use named stills via `next/image` (native 1280 px, never upscaled).
