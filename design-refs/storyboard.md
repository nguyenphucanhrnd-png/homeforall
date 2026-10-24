# HomeForAll 3D scroll storyboard (source of truth for the plates + overlays)

Concept: "The journey of Miu through a miniature Saigon neighbourhood." Background = pre-rendered clay plates scrubbed by scroll.
Everything real or changeable (text, buttons, real pet photos, hotspots, partner nodes) is live code on top.

Page sections already exist in the app with these ids: `scene-hero`, `scene-doors`, `scene-pets`, `scene-journey`, `scene-trust`,
`scene-facts`, `scene-network`, `scene-stories`, `scene-partners`, `scene-final`. Do not rename them.

## Folder contract (read first)
Work from the **project root** (the folder containing `package.json` and `design-refs/`). Everything below is relative to it.
- Source of truth for media: `design-refs/video/master.mp4` (original, read-only), `design-refs/video/master-timecodes.txt`, `design-refs/media.config.json`.
- Generated (by `python design-refs/scripts/hfa_media.py all`, never by hand): `public/assets/plates/sNN/`, `public/assets/stills/*.webp`, `design-refs/stills-master/*.png`.
- Never edit or delete `design-refs/video/master*.mp4`; never commit `design-refs/real-photos/`.

## Plates (real timings measured on the 30.0 s master, 2026-10-24)
Each clip `design-refs/video/sNN-<name>.mp4` becomes `public/assets/plates/sNN/` (`f_001.webp…`, `poster.webp`, `last.webp`, `manifest.json`) via `hfa_media.py plates`.

| Plate | Clip (master seconds) | Meaning | Mood | Quality note |
|---|---|---|---|---|
| s01 | hero 0.0–3.1 | Clay house + dog + cat, camera pulls back | warm cream | strong |
| s02 | alley-night 4.2–7.4 | Miu cold in a rainy alley | navy / blue | strong |
| s03 | rescue 7.7–11.0 | Faceless volunteer arrives, paw prints glow, carrier | cold → warm | strong |
| s04 | clinic 11.5–14.0 | Vet clinic, badges float around Miu | light blue | strong |
| s05 | foster 15.6–17.5 | Miu sleeping on a paw-print cushion | amber | short (1.9 s) |
| s06 | connect 18.4–21.3 | Peach dusk, ribbon of hearts/paw prints over rooftops (photo cards are live) | peach | OK |
| s07 | home-door 21.8–23.9 | Door opens, family waits, Miu walks in | golden | short (2.1 s) |
| s09 | follow-up 25.0–27.7 | Morning, Miu on windowsill, calendar hearts light up (day 7/30/90) | morning warm | strong |
| s08 | network 28.8–30.0 | Dusk neighbourhood, faint golden arcs start to connect | navy → warm | **weak and short (1.2 s)**: role nodes in code must carry the meaning |

Avoid these dissolves (the clips already do): 3.2–4.1, 11.1–11.4, 14.1–15.5, 17.6–18.3, 21.4–21.7, **24.0–24.9 (ghosted double exposure)**, 27.8–28.7.
Journey order on the page is s02 → s03 → s04 → s05 → s06 → s07 → s09; s08 belongs to the network section (ids are not chronological).

## Stills: one distinct frame per page (from the same master)
`about-hero` 2.4 s · `help-calm` 7.2 · `volunteer-header` 10.4 · `care-header` 13.4 · `foster-header` 16.4 · `pets-header` 20.5 · `login-door` 22.2 · `adopt-door` 23.4 · `stories-header` 26.6 · `partners-header` 29.2.
Output: `public/assets/stills/<name>.webp` (native width up to 3840; the build never upscales). No two feature pages may use the same still.

## Resolution rule
The master is currently **1280×720 (not 4K)**. Until `design-refs/video/master-4k.mp4` exists, `hfa_media.py` reports `NOT 4K` and outputs are 1280 px wide (interim). Plates are 1920 px wide once a 4K master exists; stills up to 3840 px. Never scrub 4K frames.

## Section → plate behaviour

| Section id | Plate use | Scroll behaviour | Live overlay (code) |
|---|---|---|---|
| `scene-hero` | s01 | `poster` shown first (LCP). As the user scrolls out of the hero through `scene-doors`, scrub s01 0→100% (camera pull-back). Idle: slow CSS scale 1→1.02. | Headline, sub, two CTAs, trust line; mini-nav dots |
| `scene-doors` | s01 (end frames) as backdrop, dimmed | Backdrop continues s01; tiles slide up | 4 intent tiles (real links) |
| `scene-pets` | none (plain peach/cream) | normal scroll or horizontal row (if pinned, counts toward the pin limit) | Pet cards (demo or real) |
| `scene-journey` | s02 → s03 → s04 → s05 → s06 → s07 → s09 | **Pinned**, length ≈ 5–6 viewport heights (tunable). Six steps, crossfade 400–600 ms between plates, `scrub: 1` | Step card, "who does it" badge, progress, hotspots, live photo cards (step 4) |
| `scene-trust` | none | normal | Trust cards |
| `scene-facts` | s02 `last.webp` darkened (navy overlay) | slight parallax (≤ 10%) | 3 sourced facts (already in the app) |
| `scene-network` | s08 | not pinned; plate is sticky inside the section and scrubs with section progress | Role nodes (Cứu hộ, Thú y, Tình nguyện/Nuôi tạm, Người nhận nuôi, Nhà tài trợ). **No invented partner names.** |
| `scene-stories` | none | normal | Stories or honest empty state |
| `scene-partners` | none | normal | Confirmed partners only, else CTA |
| `scene-final` | s07 `last.webp` (warm door) | slow parallax | Final CTAs |

## Journey steps ↔ plates ↔ copy (copy already exists in the app; keep it)

| Step | Title | Plate range (of the pinned scroll) | Live element |
|---|---|---|---|
| 1 Cứu hộ | Nhóm cứu hộ | s02 (0–9%) → s03 (9–17%) | paw-print trail glow synced to scroll |
| 2 Chăm sóc thú y | Phòng khám thú y | s04 (17–34%) | hotspot on each badge: what the clinic records |
| 3 Nuôi tạm | Nhà nuôi tạm | s05 (34–51%) | hotspot "Cần gì khi nuôi tạm?" |
| 4 Kết nối | Người nhận nuôi và đối tác | s06 (51–68%) | **floating photo cards** (R3F, transparent canvas), tilt with pointer, click → `/pets/[code]` |
| 5 Nhận nuôi | Gia đình mới | s07 (68–85%) | hotspot on the door: the 2-stage application explained |
| 6 Theo dõi | Gia đình và đối tác | s09 (85–100%) | hotspot on the calendar: check-ins day 7/30/90 |

Percentages are starting values. Make them config (`plates.config.ts`) and tune in `/dev/plates`.

## Hotspots (fill after plates exist)
For each plate Claude Code looks at `poster.webp` and `last.webp`, proposes hotspot coordinates as normalised `x,y` (0–1) in the **image's** coordinate space (account for cover-crop), and the user approves.

| Plate | Hotspot ideas | Opens |
|---|---|---|
| s04 | shield, cross, syringe, paw seal | tooltip: what is recorded in the health record |
| s05 | cushion bed | tooltip: what fostering involves |
| s07 | door | tooltip: how adoption works (2 stages) |
| s08 | 5 nodes | tooltip: role + what they do |
| s09 | calendar hearts | tooltip: check-ins at day 7, 30, 90 |

Hotspots are real `<button>`s with labels, keyboard focus and a visible focus ring; never hover-only.

## Rules the plates must respect
- No real pet photos, text, logos or numbers baked into any plate.
- Miu and the dog are brand mascots, not adoptable pets. Never show them with a pet-listing card or "available" status.
- If a scene's clip is missing, show the nearest existing plate or a flat colour; never block the page.
