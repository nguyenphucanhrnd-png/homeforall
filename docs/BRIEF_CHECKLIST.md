# Brief checklist (Super Prompt v3)

Every requirement from the original brief, with its status. Update this file whenever something changes.

Legend: ✅ done · 🟡 partial (see note) · ⬜ to do · 🔒 waiting on the team (section 17 inputs or a decision)

Last updated: 2026-10-24

## §0 Way of working
| Item | Status | Note |
|---|---|---|
| Plan first (understanding, disagreements, structure, milestones, questions) | ✅ | First reply in the session |
| ui-ux-pro-max design-system search; palette from the logo overrides teal | ✅ | Claymorphism style adopted; logo colours used |
| After each milestone: typecheck, lint, tests, build + 5-line summary | ✅ | `npm run check`, `npm run e2e` |
| Never invent facts; demo content labelled; medical/legal from sources | ✅ | Demo tags, `[Demo]` names, placeholders on /help |
| `.env.example`, `README.md`, `CLAUDE.md` | ✅ | |

## §1–2 Context and stack
| Item | Status | Note |
|---|---|---|
| Next.js App Router + TS strict | ✅ | Next 16, `cacheComponents` |
| Tailwind + shadcn-style primitives + lucide | ✅ | Tokens-only palette |
| Lenis + GSAP ScrollTrigger; Framer Motion for small transitions | 🟡 | Lenis + GSAP done; Framer Motion not needed yet (CSS transitions) |
| three + R3F + drei, one persistent canvas | ✅ | `src/components/landing/three` |
| `next/image`, sharp pipeline (AVIF/WebP, 3 sizes, blur), cut-out layers | 🟡 | next/image + AVIF/WebP on; sharp build script ⬜ (needs real photos) |
| Supabase (Postgres, Auth, Storage, RLS), migrations | 🟡 | Foundation migration + RLS tests; live project 🔒 |
| Maps: MapLibre/Leaflet + allowed tile provider | ⬜ | M3 |
| next-intl vi/en with prefixes | ✅ | |
| react-hook-form + zod; Turnstile + rate limiting | 🟡 | RHF + zod ✅; Turnstile/rate limit ⬜ (with DB wiring) |
| Vitest, Playwright, axe, Lighthouse CI | 🟡 | Lighthouse CI ⬜ (M4) |
| Vercel hosting | 🔒 | Check Hobby-plan terms for a nonprofit |
| `zone` field for pilot zones | ✅ | `pilot_zone` enum |

## §4–5 Principles, brand, tokens, type
| Item | Status | Note |
|---|---|---|
| Design principles in CLAUDE.md | ✅ | |
| Tokens; colours sampled from the logo | ✅ | Contrast test covers every used pair |
| CTA rules (orange+ink, blue+white, ghost; never white on orange) | ✅ | |
| Status chips icon + text; Lucide only, no emoji | ✅ | |
| Fonts with Vietnamese test; fallback to Baloo 2 noted | ✅ | e2e checks glyph coverage |

## §6 Journeys (★ = Playwright)
| Journey | Status | Note |
|---|---|---|
| ★A1 shared link → pet profile | ✅ | UI on demo data |
| ★A2 compare pets (cards, badges, last-confirmed, save, prompt on 2nd save) | ✅ | Saves in browser until accounts |
| ★A3 two-stage application | 🟡 | Stage 1 ✅ (demo, not stored); stage 2 ⬜ |
| A4 status tracker, reply time, thread, withdraw | ⬜ | |
| A5 meet & handover, address after approval | ⬜ | |
| A6 first 90 days checklist + check-ins + nearby vets | ⬜ | |
| ★R1 partner application (≤ 8 fields + proof), admin assist | ⬜ | |
| ★R2 60-second add-pet + share card | ⬜ | |
| ★R3 triage inbox + templates, contact hidden until consent | ⬜ | |
| ★R4 handover (agreement, date, adopted) | ⬜ | |
| R5 weekly "still available?" nudge; stale after 14 days | 🟡 | Stale label + ranking ✅; nudge ⬜ |
| ★F1 "I can foster" form | ⬜ | |
| F2–F4 foster match, care checklist, needs, end reminder | ⬜ | |
| T1 volunteer task board | ⬜ | |
| ★V1 vet quick-log ≤ 3 clicks (code or QR) | ⬜ | |
| V2 appointment requests; V3 clinic profile | ⬜ | |
| ★C1 /help: two tiles, sourced first aid, triage to partners | 🟡 | Structure ✅; medical text 🔒 (reviewer), partner list needs data |
| C2 /learn task-based, sourced | ⬜ | |
| S1 sponsor read-only view; no unconfirmed logos | ⬜ | |

## §7 Immersive landing
| Item | Status | Note |
|---|---|---|
| One persistent canvas, frameloop demand, no second renderer | ✅ | |
| Lenis ↔ ScrollTrigger sync, store with progress | ✅ | zustand `useStory` |
| Camera on a CatmullRom curve, waypoint per scene | ✅ | `config.ts` |
| ≤ 3 pins, no scroll-snap | ✅ | 2 pins (e2e guarded) |
| Transform/opacity/clip-path only; batch reveals; refresh after fonts/images | ✅ | |
| 3D chunk lazy (ssr:false); hero poster as LCP; canvas fades in | 🟡 | Poster = logo for now; pre-rendered 3D poster ⬜ |
| Clay style, procedural house/dog/cat/bubbles/paw trail | ✅ | |
| GLB swap via one config; particles ≤ 3,000; dpr ≤ 2 | ✅ | `MODELS`, 600 particles |
| Layered cut-outs with parallax depth | 🟡 | Illustration postcards; real mascot cut-outs 🔒 |
| Masked reveals (circle/rounded/door arch) | ✅ | Door arches + rounded rectangles |
| Pinned image morph (stray → vet → foster → family) | ⬜ | Needs real photos 🔒 |
| Horizontal gallery with tilt and depth | ✅ | |
| Floating photo cards in 3D space | ⬜ | Needs real photos 🔒 |
| Image sourcing rules + CREDITS.md | ✅ | |
| Scenes 1–10 | ✅ | Stories/partners are honest empty states |
| Scene dots (labelled, keyboard) | ✅ | |
| Reduce effects toggle (localStorage, try/catch) + skip link | ✅ | |
| Full / Lite / Static modes + PerformanceMonitor | ✅ | |
| Budgets: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 | ⬜ | Measure with Lighthouse CI (M4) |

## §8 Functional pages
| Page | Status | Note |
|---|---|---|
| Global shell (nav, emergency entry, VI/EN, login, breadcrumbs) | ✅ | |
| /pets listing (filters in URL, sort, count, stale ranking, empty state) | ✅ | |
| "Tìm bé hợp với tôi" 4-question helper | ⬜ | |
| /pets/[code] profile (gallery, story, health, partner, stay-safe, sticky card, share, report) | ✅ | Schema.org + OG image ⬜ |
| Application stage 1 modal | ✅ | Login via magic link at submit ⬜ (DB) |
| Application stage 2 (4 steps, autosave, resume) | ⬜ | |
| /map split view | ⬜ | |
| /partners listing + profile | ⬜ | |
| /learn tiles + article template | ⬜ | |
| /foster, /volunteer, /events, /stories, /donate | ⬜ | |
| Dashboards: rescue, vet, foster/volunteer, adopter, sponsor | ⬜ | Gated stubs exist |
| /admin: verification queue, moderation, assisted entry, content, users, flags, audit | ⬜ | |

## §9–10 Modules, state machines, data model
| Item | Status | Note |
|---|---|---|
| Status machines (pet, application, appointment, partner, campaign) in TS + tests | ⬜ | |
| Migrations for all tables in §10 | 🟡 | Foundation tables ✅; the rest ⬜ |
| RLS for all roles + tests | 🟡 | Foundation ✅ |
| Duplicate-pet warning; EXIF/GPS stripping; photo compression | ⬜ | |

## §11–12 Trust, safety, privacy, accessibility
| Item | Status | Note |
|---|---|---|
| Only verified partners publish | 🟡 | Enforced for orgs; pets table ⬜ |
| Stay-safe box on every profile; report buttons | ✅ | Report is UI-only for now |
| PDPL support: consent, export, deletion, policy VI/EN | 🟡 | Unticked consent ✅; export/delete/policy ⬜ |
| CSP + secure headers | 🟡 | Basic headers ✅; CSP ⬜ (M5) |
| WCAG 2.2 AA, keyboard, focus, axe | ✅ | On pages built so far |
| Task-flow budgets (≤ 3 clicks to profile, etc.) | 🟡 | Profile in 2 clicks ✅; others pending their features |

## §13–14 Demo data and layout validation
| Item | Status | Note |
|---|---|---|
| `npm run seed:demo` / `seed:clear-demo` | ⬜ | Demo fixtures exist in code |
| Swappable variants + `/dev/layout-lab` | ⬜ | |
| `docs/UX_TEST_PLAN.md` (5-user scripts per persona) | ⬜ | |

## §15 Milestones
| Milestone | Status |
|---|---|
| M0 Foundation | ✅ (live Supabase 🔒) |
| M1 Core journeys (due 15 Nov 2026) | 🟡 A1, A2, A3-stage-1 UI |
| M2 Landing hero + image system | ✅ (sharp pipeline ⬜) |
| M3 Care & coordination | ⬜ |
| M4 Full scroll story + pages + a11y + layout lab | 🟡 Scroll story ✅ |
| M5 Launch readiness | ⬜ |
| M6 Pilot hardening | ⬜ |

## §17 Waiting on the team
Real pet photos (with permission) · mascot illustrations or 3D models · partner logos · confirmed sponsors · verified hotline · medically reviewed content · copy edits · Supabase project · email provider · domain · donation provider.
