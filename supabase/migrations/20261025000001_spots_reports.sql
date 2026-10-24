-- Spots (network map) and found-animal reports (/report).
-- Additive only: no existing table is altered or dropped.
--
-- Access rules (binding):
--   * reporter: by secret token only, through security-definer RPCs (no account, no direct table access)
--   * groups: only reports sent to a spot their organisation owns
--   * admins: everything
--   * anonymous: no read of reports, recipients, events or photos, ever
-- Exact lat/lng is visible only to the selected groups (and admins); it is
-- nulled N days after closing and the report is deleted M days after closing
-- (report_settings, defaults 30 / 90, awaiting the team's approval).

-- ─── Spots ────────────────────────────────────────────────────────────────────
create type public.spot_kind as enum ('rescue', 'vet_hospital', 'vet_clinic', 'state_station', 'foster_zone', 'rescue_station');
create type public.location_precision as enum ('address', 'ward-approx', 'district');

create table public.spots (
  id text primary key,
  kind public.spot_kind not null,
  name text not null,
  org_id uuid references public.organizations (id) on delete set null,
  ward text,
  legacy_area text,
  -- Public business address: vets and state stations only.
  address_raw text check (address_raw is null or kind in ('vet_hospital', 'vet_clinic', 'state_station')),
  lat double precision,
  lng double precision,
  location_precision public.location_precision,
  placement text not null default 'map' check (placement in ('map', 'district', 'list-only', 'hidden')),
  foster_count int check (foster_count is null or foster_count >= 0),
  is_sample boolean not null default false, -- internal, never rendered
  is_real_org boolean not null default false,
  multi_branch boolean not null default false,
  accepts_reports boolean not null default false,
  -- Verified contacts only: [{type, value, source_url}], each from the organisation's own page or listing.
  contacts jsonb not null default '[]'::jsonb,
  source_urls text[] not null default '{}',
  retrieved_at date,
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);
create trigger spots_updated_at before update on public.spots
  for each row execute function public.set_updated_at();

alter table public.spots enable row level security;
-- Public map layers; foster zones expose counts only (and the app shows them only if >= 3).
create policy spots_public_select on public.spots for select to anon, authenticated using (placement <> 'hidden');
create policy spots_admin_all on public.spots for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.is_spot_member(_spot text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.spots s
    join public.org_members m on m.org_id = s.org_id
    where s.id = _spot and m.user_id = auth.uid()
  );
$$;

-- ─── Settings (retention, escalation) ────────────────────────────────────────
create table public.report_settings (
  key text primary key,
  value int not null check (value > 0),
  description text
);
insert into public.report_settings (key, value, description) values
  ('null_location_after_closed_days', 30, 'Exact lat/lng nulled this many days after closing (awaiting approval).'),
  ('delete_after_closed_days', 90, 'Report and photos deleted this many days after closing (awaiting approval).'),
  ('escalate_urgent_minutes', 60, 'Unclaimed urgent report goes to the next nearest group.'),
  ('escalate_normal_minutes', 1440, 'Unclaimed report goes to the next nearest group.');
alter table public.report_settings enable row level security;
create policy report_settings_admin on public.report_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ─── Reports ──────────────────────────────────────────────────────────────────
create type public.report_status as enum ('submitted', 'sent_to_groups', 'claimed', 'on_the_way', 'animal_secured', 'treated_or_fostered', 'closed');
create type public.report_close_reason as enum ('reunited', 'rehomed', 'not_found', 'duplicate', 'spam');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^R-[A-Z0-9]{6}$'),
  token_hash text not null unique, -- sha256 of the secret tracking token; the token itself is never stored
  created_at timestamptz not null default now(),
  type text not null check (type in ('sighting', 'found')),
  species text not null check (species in ('cat', 'dog', 'other')),
  condition text not null check (condition in ('healthy', 'thin', 'injured', 'aggressive', 'unknown')),
  bitten boolean not null default false,
  collar text not null default 'unknown' check (collar in ('yes', 'no', 'unknown')),
  note text not null default '' check (char_length(note) <= 280),
  seen_at timestamptz not null,
  ward text,
  landmark text not null default '' check (char_length(landmark) <= 120),
  lat double precision,
  lng double precision,
  accuracy_m int,
  contact text, -- only with its own consent
  contact_consent_at timestamptz,
  status public.report_status not null default 'submitted',
  close_reason public.report_close_reason,
  closed_at timestamptz,
  check (contact is null or contact_consent_at is not null),
  check (status <> 'closed' or close_reason is not null)
);

create table public.report_recipients (
  report_id uuid not null references public.reports (id) on delete cascade,
  spot_id text not null references public.spots (id),
  sent_at timestamptz not null default now(),
  state text not null default 'pending' check (state in ('pending', 'claimed', 'declined')),
  reason text,
  check (state <> 'declined' or coalesce(reason, '') <> ''),
  primary key (report_id, spot_id)
);

create table public.report_events (
  id bigint generated always as identity primary key,
  report_id uuid not null references public.reports (id) on delete cascade,
  at timestamptz not null default now(),
  kind text not null,
  by text not null check (by in ('reporter', 'group', 'system')),
  spot_id text references public.spots (id),
  status public.report_status,
  text text check (text is null or char_length(text) <= 500),
  reason text
);

-- Photos live in the private storage bucket `report-photos` (re-encoded WebP,
-- EXIF/GPS stripped); clients only ever get short-lived signed URLs.
create table public.report_photos (
  report_id uuid not null references public.reports (id) on delete cascade,
  n int not null check (n between 1 and 6),
  storage_path text not null,
  primary key (report_id, n)
);

create table public.admin_notifications (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  kind text not null,
  report_id uuid references public.reports (id) on delete cascade,
  spot_id text references public.spots (id),
  read_at timestamptz
);

alter table public.reports enable row level security;
alter table public.report_recipients enable row level security;
alter table public.report_events enable row level security;
alter table public.report_photos enable row level security;
alter table public.admin_notifications enable row level security;

create or replace function public.is_report_recipient(_report uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.report_recipients r
    where r.report_id = _report and public.is_spot_member(r.spot_id)
  );
$$;

-- No policy grants anything to `anon`: anonymous reads are impossible.
create policy reports_group_select on public.reports for select to authenticated
  using (public.is_admin() or public.is_report_recipient(id));
create policy reports_group_update on public.reports for update to authenticated
  using (public.is_admin() or public.is_report_recipient(id))
  with check (public.is_admin() or public.is_report_recipient(id));
create policy reports_admin_delete on public.reports for delete to authenticated using (public.is_admin());

create policy recipients_select on public.report_recipients for select to authenticated
  using (public.is_admin() or public.is_report_recipient(report_id));
create policy recipients_own_update on public.report_recipients for update to authenticated
  using (public.is_admin() or public.is_spot_member(spot_id))
  with check (public.is_admin() or public.is_spot_member(spot_id));
create policy recipients_admin_insert on public.report_recipients for insert to authenticated with check (public.is_admin());

create policy events_select on public.report_events for select to authenticated
  using (public.is_admin() or public.is_report_recipient(report_id));
create policy events_group_insert on public.report_events for insert to authenticated
  with check (by = 'group' and (public.is_admin() or (public.is_report_recipient(report_id) and public.is_spot_member(spot_id))));

create policy photos_select on public.report_photos for select to authenticated
  using (public.is_admin() or public.is_report_recipient(report_id));

create policy admin_notifications_admin on public.admin_notifications for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─── Reporter access: by token only ───────────────────────────────────────────
-- The tracking page calls this with the secret token; it never returns exact
-- coordinates or other people's data.
create or replace function public.report_by_token(_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'code', r.code, 'created_at', r.created_at, 'species', r.species, 'condition', r.condition,
    'ward', r.ward, 'status', r.status, 'close_reason', r.close_reason,
    'recipients', (select coalesce(jsonb_agg(jsonb_build_object('name', s.name, 'state', rr.state)), '[]'::jsonb)
                   from public.report_recipients rr join public.spots s on s.id = rr.spot_id where rr.report_id = r.id),
    'events', (select coalesce(jsonb_agg(jsonb_build_object('at', e.at, 'kind', e.kind, 'status', e.status, 'text', e.text) order by e.at), '[]'::jsonb)
               from public.report_events e where e.report_id = r.id)
  )
  from public.reports r
  where length(_token) >= 20
    and r.token_hash = encode(extensions.digest(_token, 'sha256'), 'hex');
$$;
revoke all on function public.report_by_token(text) from public;
grant execute on function public.report_by_token(text) to anon, authenticated;

-- ─── Retention (run daily by a scheduled job) ────────────────────────────────
create or replace function public.apply_report_retention()
returns void language plpgsql security definer set search_path = '' as $$
declare
  null_days int := (select value from public.report_settings where key = 'null_location_after_closed_days');
  delete_days int := (select value from public.report_settings where key = 'delete_after_closed_days');
begin
  update public.reports set lat = null, lng = null, accuracy_m = null
   where status = 'closed' and closed_at < now() - make_interval(days => null_days) and lat is not null;
  delete from public.reports
   where status = 'closed' and closed_at < now() - make_interval(days => delete_days);
end;
$$;
revoke all on function public.apply_report_retention() from public;

-- ─── Flags ────────────────────────────────────────────────────────────────────
insert into public.feature_flags (key, enabled, description) values
  ('FEATURE_REPORT', true, 'Found-animal report flow (/report): reports go only to selected groups.')
on conflict (key) do nothing;
-- FEATURE_PUBLIC_REPORT (any public list/map of reports) stays false (foundation migration).
