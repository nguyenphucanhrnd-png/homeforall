# Prompt for Claude Code — build the scroll-driven clay journey (plates + live overlays)

Paste everything below into Claude Code, in the HomeForAll project folder (the Next.js app already exists and runs; the landing page `/vi` currently has no 3D).

---

You are a senior creative front-end engineer. Implement the scroll-driven "journey of Miu" on the landing page `/` using pre-rendered **plates** (WebP frame sequences) as the background and **live overlays** (HTML, a small transparent three.js layer, hotspots) on top. This is "approach C": the background looks like 3D because it is pre-rendered; everything real or changeable is code.

## -1. Folder contract (do this before anything else)
1. Print the current working directory. It must be the **project root**: it contains `package.json` AND `design-refs/` AND `public/`. If any is missing, **stop and tell me**; do not search elsewhere, do not create a new project, do not guess paths. (If my files live outside the project, I will give you the exact path or use `/add-dir`.)
2. Read media only from `design-refs/` and `public/assets/`. Media is produced by `python design-refs/scripts/hfa_media.py all` (needs ffmpeg + Python); you may run it, but do not hand-write ffmpeg commands, and **never modify or delete** `design-refs/video/master*.mp4` or commit `design-refs/real-photos/`.
3. Run `python design-refs/scripts/hfa_media.py check` and report in two lines: the master's resolution (is it true 4K, width ≥ 3840?) and whether `public/assets/plates/*` and `public/assets/stills/*` exist. If the master is not 4K, say so; build with what exists, never upscale or fake resolution in code, and list "needs 4K master" as a follow-up.
4. The Gemini sparkle logo is removed by the script (mask + `removelogo`). If you still see it in any plate or still, report which file; do not paint over it yourself.

## 0. Read first (in this order)
1. `CLAUDE.md` and the existing landing code (sections with ids `scene-hero`, `scene-doors`, `scene-pets`, `scene-journey`, `scene-trust`, `scene-facts`, `scene-network`, `scene-stories`, `scene-partners`, `scene-final`).
2. `design-refs/storyboard.md` — the source of truth (folder contract, real timings, weak spots) for which plate belongs to which section, scroll ranges, overlays and hotspots.
3. `design-refs/README.md` (asset rules), `public/assets/plates/*/manifest.json`, and the images `poster.webp` / `last.webp` of each plate (look at them).
4. If the `ui-ux-pro-max` skill is available, query its `threejs` stack, `gsap` and `landing` domains and follow it. Notably: use `scrub: 1` for scroll-linked movement (not onEnter/onLeave), pin at most 1–2 sections, GSAP timelines for sequences over two steps, and set `role="img"` plus a descriptive `aria-label` on any WebGL/canvas element.

Then reply with a **short plan** (10 lines), anything in this prompt you disagree with and why, and the files you will touch. Proceed without waiting unless something is blocking.

If `public/assets/plates/` is empty, generate a **temporary dev stub** from `design-refs/video/_v1-montage-reference.mp4` (a 10-second montage; split it by time into the nine plates, label it `DEV STUB` in code comments and in `/dev/plates`). Replace it as soon as real plates exist. Never ship the stub.

## 1. Engine: `ScrollPlate`
- One fixed full-viewport 2D `<canvas>` behind the content (`position: fixed; inset: 0; z-index: 0; pointer-events: none`). Draw with `drawImage`, **cover-fit** (crop to viewport, keep focal point configurable per plate).
- Drive progress with **Lenis + GSAP ScrollTrigger**: `lenis.on('scroll', ScrollTrigger.update)`; `gsap.ticker.add(t => lenis.raf(t * 1000))`; `gsap.ticker.lagSmoothing(0)`. Map each section's scroll progress to a plate frame index. Use `scrub: 1`.
- **Crossfade** between consecutive plates (400–600 ms equivalent of scroll) so clips don't need to join seamlessly.
- **Memory is the main constraint:** a 1600×900 RGBA frame is about 5.8 MB decoded, so 120 frames would be about 690 MB. Do **not** keep all frames decoded. Keep compressed frames as `Blob`/network cache and an **LRU window sized by a byte budget (~200 MB; about 24 frames at 1920×1080, about 6 at 3840×2160)** around the current index (`createImageBitmap`), prefetching in the scroll direction. Ship scrub plates at 1920 wide by default (2560 optional; today they are 1280 wide because the master is 720p, the engine must read `manifest.json` width and not assume 1920); never scrub 4K frames. Always draw the nearest loaded frame if the exact one isn't ready.
- Load order: `poster.webp` of the hero is the LCP image (explicit width/height, preloaded). After first paint, load s01 frames; load other plates when their section is within about 1.5 viewports. Respect `navigator.connection.saveData`.
- Benchmark the canvas-frame approach against a keyframe-dense `<video>` scrub on a mid-range laptop, keep the smoother one, and document the result in `CLAUDE.md`.
- Config in `plates.config.ts`: per-plate id, section id, scroll start/end, crossfade, focal point, mood overlay. No magic numbers elsewhere.

## 1b. Stills (one distinct image per page)
The site may still serve `/assets/plates-stub/…`, a **dev stub built from a 720p, 10-second montage**; that is why it looked soft and why some pages shared near-identical frames. Real stills and plates now exist (see `design-refs/storyboard.md` for the timings); replace every stub reference. When `public/assets/stills/*.webp` exist (made by `python design-refs/scripts/hfa_media.py slice` from `design-refs/video/master-timecodes.txt`), use them for Scene Headers and posters: `about-hero`, `help-calm`, `volunteer-header`, `care-header`, `foster-header`, `pets-header`, `adopt-door`, `login-door`, `stories-header`, `partners-header`. Map every route to its own named still in `world.config.ts`; **no two feature pages may use the same still.** Serve stills with `next/image` at up to 3840 wide (files are at the master's native width up to 3840; today 1280 until the 4K master exists, so set `sizes` correctly and never claim 4K); keep the stub only as a fallback and remove it before launch.

## 2. Sections
Follow `design-refs/storyboard.md` exactly:
- **Hero + doors:** poster first, then scrub s01 (camera pull-back) while leaving the hero. Existing headline, CTAs and trust line stay as real HTML.
- **Journey (pinned):** six steps s02→s03→s04→s05→s06→s07→s09 (s05 and s07 plates are only ~2 s; give them less scroll length than s02–s04, and hold the last frame rather than looping) with the existing step cards, "who does it" badge and progress. Pin length about 5–6 viewport heights as config. Add keyboard-accessible "previous / next step" buttons and make each step linkable (hash), so the story works without scrolling.
- **Facts:** s02 `last.webp` darkened, slight parallax (≤ 10%).
- **Network:** s08 (only ~1.2 s long and visually weak: faint golden arcs) sticky inside the section, scrubbed by section progress; **role nodes and connecting lines as HTML/SVG over the plate must carry the meaning**, with the plate as an atmospheric backdrop (hold `last.webp` while the nodes animate). **Do not invent partner names.**
- **Final:** s07 `last.webp` with slow parallax and the existing CTAs.
- Pins on the whole page: **at most 2** (journey, plus the pets row only if it needs it).

## 3. Live overlays
- **Hotspots:** real `<button>`s positioned in the plate's image coordinate space (account for cover-crop), with labels, tooltip/popover, keyboard focus and visible focus rings. Propose coordinates after viewing the plate images and ask me to approve them.
- **Floating photo cards (journey step 4):** one **transparent React Three Fiber canvas** above the plate with up to 8 rounded photo planes (drei `Image` or textured planes), gentle drift, tilt toward the pointer, click → `/pets/[code]`. Textures come from the real listing data; until real photos exist use the existing demo illustrations labelled DEMO. **Never use AI or stock photos for adoptable pets.** Render on demand (`frameloop="demand"`) and only while step 4 is near the viewport.
- **Mascot sprites (optional, phase 2):** if transparent PNGs exist in `design-refs/mascots/`, add subtle breathing and pointer-follow tilt (≤ 6°). Skip if absent.

## 4. Accessibility, motion and performance (must pass)
- Every plate and the three.js layer: `role="img"` with a Vietnamese + English `aria-label`; all real content remains in the DOM in reading order.
- `prefers-reduced-motion`, `saveData`, no 2D-canvas support, or the existing "Giảm hiệu ứng" toggle → **static mode**: no Lenis, no pins, no canvas engine; each section shows its `last.webp` (or poster) as a normal `<img>` with the content over it. Test it.
- Contrast: text over plates must reach 4.5:1; add a scrim/gradient where needed and verify by sampling.
- Motion: animate only transform/opacity in the DOM; no body-copy parallax; exits faster than enters.
- Budgets (desktop, Lighthouse CI): LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1; total plate bytes reported by `hfa_media.py plates`; never block text or CTAs on plate loading.
- No horizontal scroll at any width (known issue: the header overflows horizontally at narrow widths; fix it).

## 5. Dev tooling
- `/dev/plates` (dev only, excluded from production build): a scrubber slider per section, the current plate/frame, loaded-frame count, memory estimate, FPS, hotspot overlay toggle, and live editing of `plates.config.ts` values.
- `README` section "Updating plates": run `python design-refs/scripts/hfa_media.py all` (see `design-refs/README.md`), refresh `/dev/plates`.

## 6. Milestones (stop after each, summarise in 5 lines, run type-check/lint/tests/build)
- **P1** Engine + hero scrub + static mode + `/dev/plates`. *Accept:* smooth scrub at 60 fps on desktop; static mode complete; memory stays flat while scrolling the whole page.
- **P2** Journey pinned with six steps, crossfades, step buttons, hash links.
- **P3** Hotspots + facts/network/final sections.
- **P4** R3F photo cards at step 4.
- **P5** Optional mascot sprites, polish, accessibility pass (axe), Lighthouse.

## 7. Rules
- Never invent facts, partners, sponsors or adoptable pets. Mascots (Miu and the dog) are brand characters, not listings.
- Do not commit anything from `design-refs/real-photos/`.
- Record every AI-generated or stock asset in `CREDITS.md`.
- Ask before adding a paid service. Do not change the sitemap, tokens or copy unless required, and tell me when you do.
