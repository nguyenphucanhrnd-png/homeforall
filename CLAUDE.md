# HomeForAll: working notes for Claude Code

Nonprofit web platform for Ho Chi Minh City connecting rescue groups, vets, volunteers, fosters, adopters, owners and sponsors: "from rescue to forever home". Desktop-first website, Vietnamese default + English. The full brief is the "Super Prompt v3"; this file keeps the rules that must survive every session.

## Design principles

1. One page, one job, one primary action.
2. Browse without an account; ask for one only when the user wants to *do* something.
3. Proof next to the claim: verified badge, health timeline, "last confirmed" on the card.
4. Partner effort must be lower than a Facebook post.
5. Calm in emergencies: `/help` is text-first, high contrast, no motion (`data-motion="none"`).
6. Immersion for the story (landing), calm for the tools (every functional page).
7. Every effect has a static equivalent (reduced motion, low-end hardware, no WebGL).

Design from journeys, not tables: for each page ask who arrives, what they want, what they feel, and what the one next step is.

## Never invent facts

No fake statistics, testimonials, partners, sponsors or adoptable pets. Sample content keeps an internal flag (`is_demo` for pets/tasks, `is_sample` for spots) that is **never rendered**: no visible "demo" anywhere. One site-wide honesty note replaces per-item labels: `SHOW_PROTOTYPE_NOTICE` in `src/lib/flags.ts` (default `true`), shown in the footer and on `/about`. Keep "Chưa xác nhận" for unknown health/age fields (data honesty). Medical or legal text must be copied from an authoritative source and linked, or shipped as a marked placeholder (`data-placeholder="medical-review"`). Sponsors appear only when `sponsor_status = 'confirmed'`.

## Stack

Next.js 16 (App Router, `cacheComponents` on) · TypeScript strict · Tailwind v4 (tokens in `src/app/globals.css`) · next-intl (`/vi`, `/en`) · Supabase (Postgres + Auth + Storage + RLS) · react-hook-form + zod · Vitest + PGlite (RLS tests) · Playwright + axe.
Later: Lenis + GSAP ScrollTrigger + R3F (landing only, lazy chunk).

### Next 16 specifics
- See `AGENTS.md`: read `node_modules/next/dist/docs/` before using an unfamiliar Next API.
- `src/proxy.ts` (not `middleware.ts`) runs next-intl, then refreshes the Supabase session **only if an `sb-` cookie exists**.
- With `cacheComponents`, anything reading cookies (`getViewer`, `requireViewer`) must render inside `<Suspense>`. Pages stay statically prerendered around it.
- Pass `locale` explicitly: `getTranslations({ locale, namespace })` and call `setRequestLocale(locale)` in every page.

## Colour and type rules

- Tokens only. Tailwind's default palette is removed (`--color-*: initial`), so `bg-red-500` will not compile into anything.
- Primary CTA: `orange-500` + `ink` text. **Never white on orange (2.59:1).** Secondary: `blue-600` + white. Ghost: `blue-600` text, hover `blue-100` bg **with `blue-800` text** (blue-600 on blue-100 is 4.30:1).
- Never `blue-600` text on `navy-900` (3.2:1). Use white or peach-200 in dark chapters.
- Status chips always carry icon + text. Lucide icons only, no emoji.
- `tests/tokens.test.ts` checks every used text/background pair ≥ 4.5:1. Add a row when you add a pairing.
- **Typography:** headings **Baloo 2**, body **Nunito**, both with the `vietnamese` subset. *Fredoka was rejected:* Google Fonts ships it only as hebrew/latin/latin-ext, so tone-marked capitals (Ắ, Ợ, Ỹ…) fall back to a system font. The e2e test `heading and body fonts cover Vietnamese glyphs` guards this; `/vi/dev/typography` shows the comparison.
- Body ≥ 16px; headings `text-wrap: balance`; allow +30% length for Vietnamese.

## Layout rules

- Container 1280px max, 24px gutter, 12-column grid. Design at 1440, check 1280 and 1920 (e2e checks no horizontal scroll at all three).
- Header must stay one row at 1280px (e2e guarded).
- Functional pages: light effects only (fade-up, hover zoom, subtle header parallax). Pinning only on the landing, max 3 pinned sections.
- Persistent emergency entry in the header → `/help` in one click from every page.

## Images

- `next/image` with explicit dimensions; AVIF/WebP; preload only the hero poster.
- Real pets: partner photos with permission only. Decorative: Unsplash/Pexels/own, recorded in `public/assets/CREDITS.md`. No Pinterest sources, no AI photos of real adoptable pets.
- Alt text in VI and EN; defined aspect ratio everywhere.

## Auth and roles

- Login: Supabase email magic link (`/[locale]/login` → `/auth/confirm`). Handles PKCE `code` and `token_hash`.
- Roles live in `public.user_roles` (multi-role). New users get `adopter` automatically. Only admins grant roles. Partner roles also need `org_members` rows.
- Dashboards: `/dashboard` (role list), `/dashboard/{rescue|vet|foster|adopter|sponsor}`, `/admin`. Gate with `requireViewer` + `hasAnyRole`; RLS is the real guard.
- `scripts/dev-role-users.ts` creates one demo user per role and prints login links (dev/staging only).

## Database

- Migrations in `supabase/migrations/` (timestamped). Every table: RLS on, explicit grants, indexes on FKs/status/timestamps, `created_at/updated_at`, `deleted_at` where soft delete applies.
- Helper functions `has_role`, `is_admin`, `is_org_member`, `is_org_manager` are `SECURITY DEFINER` with `search_path = ''`.
- Trigger functions that check `current_user` must be **SECURITY INVOKER** (inside a definer function `current_user` is the owner).
- Audit: `write_audit()` trigger appends to `audit_log` (admin-read only, no update/delete).
- RLS tests run the real migrations in PGlite (`tests/db/harness.ts`): `as(db, { role, userId }, fn)` runs as `anon`/`authenticated` and rolls back.

## Status machines (implement in M1/M3; keep in sync with SQL)

- Pet: `draft → available → in_foster → adoption_pending → adopted`, plus `paused`, `withdrawn` (reason). Every change writes an audit row.
- Application: `interest_sent → invited → submitted → under_review → interview → approved | rejected | withdrawn`. Reviewer notes private.
- Appointment: `requested → confirmed → completed | cancelled`.
- Partner: `pending → verified | rejected`. Campaign sponsor: `target | negotiating | confirmed` (only `confirmed` public).

## Commands

`npm run dev` · `npm run check` (typecheck + lint + test + build) · `npm run e2e` (after `npm run build`) · `npm test`.

## Brand

- Official logo: `public/brand/logo-source.png` (keep unchanged). Transparent cut-outs + favicons come from `scripts/brand/make-logo-assets.py` (Pillow). Components: `LogoLockup` (header), `LogoFull` (footer).
- Logo colours are the tokens: cat `#3690D5` = `blue-500` (**decorative only**: neither ink nor white text reaches 4.5:1 on it), heart `#03508A` = `blue-800`, arm `#FFC18D` = `peach-300`, "for" `#FF993D` = `orange-500`.

## Data layer (UI-first phase)

- **Decision 2026-10-24:** database and SMTP are deferred; UI is built first. All pet data goes through `src/lib/pets/repository.ts` (`listPets`, `getPet`, `listPartners`). Today it reads demo fixtures (`demo-data.ts`); later the same functions query Supabase. UI never imports fixtures directly.
- Demo fixtures use "days ago" offsets, so "last confirmed" stays realistic. Two listings are deliberately stale (> 14 days) to exercise R5 ranking.
- Demo pets show team-supplied photos from `public/assets/demo-pets/<code>.webp` when the file exists (git-ignored, rights not verified, see CREDITS.md); otherwise `PetIllustration`. `PetMedia` picks between them. Real listings: partner photos with consent only.
- `submitInterest` validates with the shared zod schema but stores nothing; the success state says nothing was passed on yet.

## Navigation (2026-10-25)
Header order: logo · **"Phát hiện 1 bé đi lạc"** (EN "Found a stray?", the single orange accent button, ink text, → `/report`) · Nhận nuôi · Nuôi tạm & Tình nguyện · Chăm sóc · Đối tác · Về dự án. The inline nav shows from `xl` (1280 px); below that a `<details>` menu, so the header never scrolls sideways. `/help` ("Bị cắn?") is linked prominently from the top of `/report`, from its bite card, and from the footer. Landing doors: "Thấy bé lạc" first (still `report-rescue`, s03 at 8.6 s; **only this tile uses it**, `DOOR_STILLS`); hero secondary CTA and journey step 1 also go to `/report`.

## /report (main feature)
- Flags: `FEATURE_REPORT` on, `FEATURE_PUBLIC_REPORT` off (`src/lib/flags.ts` + `feature_flags` seed). Never publish a list/map of reports or live locations of free-roaming animals.
- Page order: location bar (Geolocation; auto-runs only if permission is already granted; ward dropdown fallback, ward resolved locally from `wards.generated.json`, no runtime geocoder) → nearest help (3 rescue + 3 vets/state stations, distance **bands** computed server-side, "Chỉ đường", "Báo cho nhóm này" only where `accepts_reports`, contacts only when verified with `source_url`; if nothing within 8 km say so) → "Làm gì ngay" (3 steps) + bite card (/help + WHO link, no medical specifics) → "Gửi báo cáo nhanh" (collapsed, 3 steps) → result (code, one-time token link, timeline, honest line).
- Server actions: `src/app/[locale]/report/actions.ts` (`nearestHelp`, `submitReport` with honeypot + rate limit 5/h per IP hash and device cookie, reporter update/left/delete by token). Group actions: `inbox-actions.ts` (claim, decline with reason, status, message). Inbox UI: `src/components/reports/report-inbox.tsx`, shown in `/dashboard/rescue` (admins: all; partners once `spot_members` exists) and on the dev-only `/dev/inbox/[spot]`.
- Store: `src/lib/reports/store.ts` is a JSON file + private photo folder in `.data/` (git-ignored) with the same contract as `supabase/migrations/20261025000001_spots_reports.sql` (RLS: reporter by token RPC only, groups only reports sent to their spot, admins all, no anonymous read). Photos: client canvas re-encode + server sharp re-encode to WebP ≤ 1600 px, all metadata dropped, served only via HMAC-signed short-lived URLs (`/api/report-photo`). Retention: lat/lng nulled 30 days after closing, report deleted after 90 (`RETENTION` / `report_settings`, awaiting approval). Escalation: unclaimed urgent > 60 min, others > 24 h → next nearest group + admin notification.
- Draft: IndexedDB on the device (`src/lib/reports/draft.ts`), cleared after sending. Tracking page `/report/track/[token]`: noindex, `referrer: no-referrer`.
- No partner or sponsor content anywhere on `/report`.

## Spots and maps
- Model `src/lib/spots/types.ts` (mirrors table `spots`): `kind`, `ward`, `legacy_area`, `address_raw` (vets/stations only), `lat/lng`, `location_precision`, `placement`, `is_sample` (internal), `is_real_org`, `multi_branch`, `accepts_reports` (default false; real orgs stay false until they agree), `contacts` (verified only), `source_urls`.
- Scripts (run once the network can reach Nominatim; ≤ 1 req/s, descriptive User-Agent, cached, never at runtime): `npm run geo:vets` → `design-refs/data/vet_clinics.geocoded.json` (street match inside HCMC, else district fallback; doubtful rows snapped to ward level by the seed); `npm run seed:spots` → `src/data/spots.generated.json` + `wards.generated.json` (deterministic, seed 20261116: 4 sample rescue points per pilot ward + 16 in other wards named "Điểm cứu hộ {phường}", 6 foster zones as counts, real orgs WagWel/ARC/Laws For Paws/RAD7 at ward level, all CSV vets; shared places get a 30 m offset). Until then `/network` and `/report` show the CSV vets as a list with address-based directions; **coordinates are never guessed**.
- `CityMap` (`src/components/map/`): Leaflet + markercluster via `next/dynamic` (`ssr: false`), CSS vendored in `leaflet.css` (Turbopack cannot resolve Leaflet's image URLs). Markers are real `<button>`s: 16 px circles with a white ring (orange rescue, blue vet, darker blue state, peach foster counts), growing on hover/focus; popover = name, kind, address (vets) / ward, "Chỉ đường". Tiles: `tile.openstreetmap.de` for now (openstreetmap.org is DNS-blocked on the team network; CARTO needs an API key). Pick and approve a production tile provider before launch.
- `/network` = full map + list + layer chips + "Đối tác đề xuất" panel; landing `scene-network` has an inert preview linking to `/network`.

## Partners ("Đối tác đề xuất")
- `src/lib/partners/proposed.ts` (`status: proposed|confirmed`, `logoPermission: none|confirmed`), cards in `src/components/partners/proposed-partner-card.tsx`, sources in `docs/SOURCES.md`. Shown on `/partners`, landing `scene-partners`, `/network` panel; never in `/report`. No "demo" word and no per-card disclaimer (the site-wide notice covers it). Production renders a logo only when both fields are `confirmed`, else the brand name as text. Logos: `npm run images:partners` from `partner_logo/` (git-ignored; originals never modified).

## Fanh the vet (AI assistant)
- `src/components/fanh/fanh-chat.tsx`, mounted in the layout. **UI only**: replies are a fixed "still being built" message with links to /learn and /help. Not shown on /help. Always shows the "does not replace a vet" disclaimer. When wired to a model: keep medical answers sourced, route bites/emergencies to /help, never claim to diagnose.

## Gotchas found so far

- With `cacheComponents`, `usePathname()`/`useSearchParams()` in client components are request data on dynamic routes → wrap in `<Suspense>` with a static fallback (see `NavLinksFallback`, `LocaleSwitcherFallback`).
- `notFound()` inside a streamed `<Suspense>` renders the not-found UI with `noindex`, but the HTTP status stays 200.
- Zod object `.superRefine` does not run while any other field is invalid; use the `when` option for cross-field checks users should see on the first submit.
- Never remount a form to resync filters (`key=`): it drops keyboard focus. Reset inputs in place.

## One world, one story (Master Prompt v4)

**Governing sentence:** each scene promises, each feature delivers, and the visitor always knows which step of Miu's journey they are in.

### Story rules
1. Scene = promise, feature = payoff: never show a scene without a doorway to its feature.
2. Every page declares its place: journey chip ("Bước 3/6 · Nuôi tạm", "Toàn mạng lưới" or "Cần giúp ngay").
3. Continuity of mood: a feature page's header is a still of the scene that promised it.
4. Calm where work happens: landing = cinematic; functional pages = still scene header; dashboards and `/help` = no scene.
5. Always a way back: "Quay lại hành trình" → `/#journey-n` or `/#scene-network`.
6. The story works without effects: everything is in the DOM; static mode shows stills.
7. Truth first: facts keep source + year. Miu and the dog are **mascots, never listings**.

### Where things live
- `src/world/world.config.ts`: **single source of truth**: plates (mood, focal, caption, fallback), the six journey steps (plates, hash, payoff link), `JOURNEY_TRACK` (plate ranges in the pin), `LANDING_TRACK` (what the canvas shows per section), `ROUTES` (scene header, chip, promise, way back), `HOTSPOTS` (empty until approved). Unit-tested (`world.config.test.ts`).
- `src/world/plate-engine.ts`: ScrollPlate engine (2D canvas, cover-fit with focal point, LRU of 24 decoded ImageBitmaps, compressed-blob cache, direction-aware prefetch, nearest-frame fallback, crossfades).
- `src/world/plate-sources.ts` (server): reads `public/assets/plates/sNN/manifest.json`; also resolves named page stills. Missing plates fall back per config (never block the page).
- `src/components/landing/story-shell.tsx`: mode detection, Lenis ↔ ScrollTrigger, segment proxies with `scrub: 1`, the journey pin (id `journey-pin`), prev/next + `#journey-n`, scene dots, Reduce-effects toggle.
- `src/components/world/`: `JourneyChip` (native popover spine), `SceneHeader`, `RouteMeta`.

### Alignment table (scene ↔ feature ↔ CTA; code: `world.config.ts`)
| Beat | Plate | Payoff | CTA (VI) |
|---|---|---|---|
| Hook | s01 | landing doors | Tìm thú cưng · Tham gia mạng lưới |
| 1 Cứu hộ | s02 → s03 | /help#found, /partners, rescue dashboard | Tôi nhặt được một bé |
| 2 Chăm sóc thú y | s04 | /learn#vet, health timeline, vet quick-log | Tìm phòng khám |
| 3 Nuôi tạm | s05 | /foster, /volunteer | Tôi có thể nuôi tạm |
| 4 Kết nối | s06 | /pets, /pets/[code], Express interest | Xem các bé đang chờ |
| 5 Nhận nuôi | s07 | application stage 2, tracker, handover | Bắt đầu nhận nuôi |
| 6 Theo dõi | s09 | /learn#first-week, adopter dashboard | Xem lịch theo dõi |
| Network | s08 | /partners, /map, /events, /donate | Trở thành đối tác |
| Emergency | — | /help | header button |

### Media (folder contract)
- Work from the project root. Media is generated **only** by `python design-refs/scripts/hfa_media.py all` (check / logo-preview / all are allowed). Never hand-write ffmpeg, never touch `design-refs/video/master*.mp4`, never commit `design-refs/real-photos/`. Source of truth: `design-refs/storyboard.md`, `master-timecodes.txt`, `media.config.json`.
- Today: master 1280×720 (**not 4K**) → plates and stills are interim 1280 px. When `master-4k.mp4` exists, re-run `all`; code reads `manifest.json` widths.
- Page stills: `public/assets/stills/<name>.webp`, one distinct still per route (`ROUTES[...].sceneHeader.still`, unit-tested). `adopt-door` reserved for R4; `help-calm` unused (help stays scene-free).
- Decode cache = byte budget (200 MB full / 120 MB lite). Measured peak 197 MB (720p plates, full scroll both ways).
- Clay scenes are AI-generated (Gemini): disclosed on `/about#illustrations`, recorded in `public/assets/CREDITS.md`; terms still to be checked.
- Inspect at `/vi/dev/plates` (dev only).
- **Pending:** canvas-frames vs keyframe-dense `<video>` benchmark on a mid-range laptop.

### Modes
`pending` (SSR) looks like `static`; `full`/`lite` add the canvas, Lenis and pins (≤ 2: pets row + journey). Static when: reduced motion, saveData, width < 768 px, no 2D canvas/createImageBitmap, or the toggle. Tailwind variants `anim:` / `still:` style each mode.

### Gotchas
- Segment ScrollTriggers only drive the canvas through their proxies; the "active" segment is the last one with t > 0, so plate sections start at `top bottom` and opaque sections at `top top`.
- 12-column grids: drop the horizontal gap below the breakpoint (`gap-y-8 lg:gap-x-8`); 11 gaps × 32 px overflow a 375 px screen.
- `ffmpeg` inside a `while read` loop eats stdin: use `-nostdin`.

## Milestone status

- **M0 Foundation:** done 2026-10-24. Supabase project not yet connected (deferred by the team).
- **M1 UI (A1, A2, A3 stage 1):** `/pets` listing + `/pets/[code]` profile + Express interest on demo data, done 2026-10-24.
- **v4 R0–R1 (+ most of R2):** audit, world config, plate engine, scene headers + chips, header fix. 2026-10-24.
- **v4.1 media + R3:** real interim plates/stills wired, stub removed, byte-budget cache, distinct stills per route, /about (AI disclosure, SDG 15/17), /foster (F1 form), /volunteer (task board), /learn (task tiles), /stories. 2026-10-24.
- **One-pass /report bundle (2026-10-25):** report button in nav, action-first `/report`, track page, group inbox, spots model + scripts, circular map spots, network preview, partners copy, visible "demo" removed + `SHOW_PROTOTYPE_NOTICE`. Geocoding/seed still pending (Nominatim DNS-blocked).
- Next: R4 core journeys (two-stage application, rescue "Hôm nay", vet quick-log, adopter tracker), R5 hotspots + R3F photo cards.
