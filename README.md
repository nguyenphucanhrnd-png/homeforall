# HomeForAll

Từ cứu hộ đến mái ấm trọn đời: a nonprofit platform connecting rescue groups, vet clinics, volunteers, foster homes and adopters of dogs and cats in Ho Chi Minh City.

- Closed pilot: **16 Nov 2026** (Diên Hồng ward, Phú Mỹ ward, Thủ Đức) · Public launch: **1 Feb 2027** · Close: **21 Mar 2027**
- Website only, desktop-first. Vietnamese default (`/vi`), English (`/en`).

## Requirements

- Node.js 22+ (developed on 24)
- A Supabase project in the Singapore region (free tier is fine for the pilot)

## Setup

```bash
npm install
cp .env.example .env.local      # fill in the Supabase values
npm run dev                     # http://localhost:3000 → redirects to /vi
```

The site runs without Supabase (browse-only; login shows "not connected").

### Connecting Supabase

1. Create a project (region: Southeast Asia / Singapore).
2. Apply migrations: `npx supabase link --project-ref <ref>` then `npx supabase db push`, or paste `supabase/migrations/*.sql` into the SQL editor in order.
3. **Auth → URL configuration:** Site URL = your site; add `http://localhost:3000/auth/confirm` and `https://<domain>/auth/confirm` to Redirect URLs.
4. **Auth → SMTP:** the built-in mailer is heavily rate-limited and meant for testing only. Configure a custom SMTP provider before the pilot (decision pending, see "Open decisions").
5. Fill `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` in `.env.local`.

### Trying every role (dev/staging only)

```bash
# .env.local: HFA_ALLOW_DEV_USERS=true
node --env-file=.env.local scripts/dev-role-users.ts
```

Prints one single-use login link per role (`admin@demo.homeforall.test`, `rescue-partner@…`, …). Rescue and vet users get a verified `[Demo]` organisation.

### 21st.dev component MCP (for Claude Code)

`.mcp.json` registers the 21st.dev MCP server (UI component search, inspiration, logos, generation). The key is never committed: it is read from the `API_KEY_21ST` environment variable.

1. Create a key at https://21st.dev/mcp.
2. Windows: `setx API_KEY_21ST "your-key"` (then fully restart VS Code / Claude Code). macOS/Linux: export it in your shell profile.
3. On first use Claude Code asks you to approve the project MCP server.

### Updating plates (scroll scenes)

1. Put the master at `design-refs/video/master.mp4` (or `master-4k.mp4`) and edit `design-refs/video/master-timecodes.txt`.
2. `python design-refs/scripts/hfa_media.py all` (needs Python 3.8+ and ffmpeg) → `public/assets/plates/sNN/` + `public/assets/stills/`.
3. Open `/vi/dev/plates` in `npm run dev` to check frames, focal points and scroll ranges.


## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run check` | Type-check, lint, unit + RLS tests, production build |
| `npm test` | Vitest: roles, colour-contrast tokens, RLS policies (real migrations in PGlite) |
| `npm run e2e` | Playwright + axe against the production build (run `npm run build` first) |
| `npm run format` | Prettier |

## Project structure

```
messages/            vi.json, en.json (every UI string)
src/app/[locale]/    pages (help, login, dashboard, admin, stubs for later milestones)
src/app/auth/        magic-link confirm route
src/components/      layout shell, brand, ui primitives
src/i18n/            next-intl routing + request config
src/lib/             env, supabase clients, auth (viewer, roles, guards)
src/proxy.ts         locale routing + session refresh
supabase/migrations/ SQL migrations (RLS on every table)
tests/               Vitest (tokens, db/RLS)
e2e/                 Playwright journeys
scripts/             dev tooling
```

Design rules and decisions: see `CLAUDE.md`.

## Privacy and legal (before launch)

The product is built to support Vietnam's Personal Data Protection Law (No. 91/2025/QH15): explicit unticked consent, data minimisation, self-service export and deletion, consent timestamps. **The UI does not claim legal compliance.** The privacy policy and terms must be reviewed by a qualified person before 1 Feb 2027.

Medical content on `/help` and `/learn` stays a marked placeholder until it is copied from WHO / Ministry of Health sources and signed off by a medical reviewer.

## Hosting notes

- Vercel's free Hobby plan is for personal, non-commercial use. Check whether a nonprofit organisation project qualifies, or plan for an alternative before launch.
- Supabase free tier: projects pause after a period of inactivity and have no automated backups. M5 adds a scheduled `pg_dump` backup.

## Open decisions

- SMTP provider for magic-link emails (needed before 16 Nov 2026)
- Domain
- Logo files (`public/brand/`)
- Donation provider (Phase 2)

## Launch checklist (M5)

- [ ] Privacy policy + terms (VI/EN) reviewed
- [ ] Medical content signed off
- [ ] Demo data cleared (`npm run seed:clear-demo`)
- [ ] Backups scheduled
- [ ] CSP + security review
- [ ] Domain + SMTP live
