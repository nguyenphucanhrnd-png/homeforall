-- M0 foundation: roles, profiles, organisations, feature flags, audit log.
-- Every table has RLS enabled. Grants are explicit so behaviour does not depend
-- on project-level default privileges.

create extension if not exists citext;

-- ─── Enums ────────────────────────────────────────────────────────────────────
create type public.app_role as enum (
  'admin', 'rescue_partner', 'vet_partner', 'foster', 'volunteer', 'adopter', 'sponsor'
);
create type public.org_type as enum ('rescue', 'vet', 'foster_network', 'sponsor');
create type public.verification_status as enum ('pending', 'verified', 'rejected');
create type public.capacity_status as enum ('accepting', 'nearly_full', 'emergency_only');
create type public.org_member_role as enum ('owner', 'manager', 'staff');
create type public.pilot_zone as enum ('dien_hong', 'phu_my', 'thu_duc');

-- ─── Shared helpers ───────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ─── Profiles ─────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  locale text not null default 'vi' check (locale in ('vi', 'en')),
  zone public.pilot_zone,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- A user can hold several roles (e.g. foster + volunteer). Elevated roles are
-- granted by an admin; partner roles also require organisation membership.
create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);
create index user_roles_role_idx on public.user_roles (role);

-- SECURITY DEFINER so policies can call these without recursive RLS checks.
create or replace function public.has_role(_role public.app_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = _role
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_role('admin'::public.app_role);
$$;

-- ─── Organisations ────────────────────────────────────────────────────────────
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  type public.org_type not null,
  slug citext not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  description_vi text,
  description_en text,
  ward text,
  district text,
  zone public.pilot_zone,
  proof_url text,
  verification_status public.verification_status not null default 'pending',
  verified_at timestamptz,
  verified_by uuid references auth.users (id) on delete set null,
  rejection_reason text,
  capacity_status public.capacity_status,
  capacity_updated_at timestamptz,
  is_demo boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index organizations_type_idx on public.organizations (type);
create index organizations_verification_idx on public.organizations (verification_status);
create index organizations_created_by_idx on public.organizations (created_by);
create index organizations_verified_by_idx on public.organizations (verified_by);
create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

create table public.org_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  member_role public.org_member_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index org_members_user_idx on public.org_members (user_id);

create or replace function public.is_org_member(_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.org_members where org_id = _org and user_id = auth.uid()
  );
$$;

create or replace function public.is_org_manager(_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.org_members
    where org_id = _org and user_id = auth.uid() and member_role in ('owner', 'manager')
  );
$$;

-- Only admins may change verification fields; partners control capacity.
-- SECURITY INVOKER on purpose: current_user must be the caller's role.
create or replace function public.guard_org_verification()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.is_admin() or current_user in ('postgres', 'service_role', 'supabase_admin') then
    return new;
  end if;
  if new.verification_status is distinct from old.verification_status
     or new.verified_at is distinct from old.verified_at
     or new.verified_by is distinct from old.verified_by
     or new.rejection_reason is distinct from old.rejection_reason
     or new.is_demo is distinct from old.is_demo
     or new.type is distinct from old.type then
    raise exception 'verification fields are admin-only' using errcode = '42501';
  end if;
  if new.capacity_status is distinct from old.capacity_status then
    new.capacity_updated_at = now();
  end if;
  return new;
end $$;
create trigger organizations_guard before update on public.organizations
  for each row execute function public.guard_org_verification();

-- ─── Feature flags ────────────────────────────────────────────────────────────
create table public.feature_flags (
  key text primary key check (key ~ '^[A-Z][A-Z0-9_]*$'),
  enabled boolean not null default false,
  description text,
  updated_at timestamptz not null default now()
);
create trigger feature_flags_updated_at before update on public.feature_flags
  for each row execute function public.set_updated_at();

insert into public.feature_flags (key, enabled, description) values
  ('FEATURE_PUBLIC_REPORT', false, 'Public stray-report form. Off for the pilot.'),
  ('FEATURE_DONATIONS', false, 'Donation page (Phase 2).');

-- ─── Audit log (append-only) ──────────────────────────────────────────────────
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);
create index audit_log_actor_idx on public.audit_log (actor_id);
create index audit_log_created_idx on public.audit_log (created_at);

create or replace function public.write_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    insert into public.audit_log (actor_id, action, entity_type, entity_id, before)
    values (auth.uid(), 'delete', tg_table_name, old.id::text, to_jsonb(old));
    return old;
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, before, after)
  values (
    auth.uid(), lower(tg_op), tg_table_name, new.id::text,
    case when tg_op = 'UPDATE' then to_jsonb(old) end, to_jsonb(new)
  );
  return new;
end $$;
create trigger organizations_audit after insert or update or delete on public.organizations
  for each row execute function public.write_audit();

-- ─── New-user bootstrap ───────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.user_roles (user_id, role) values (new.id, 'adopter');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Row-level security ───────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.feature_flags enable row level security;
alter table public.audit_log enable row level security;

-- profiles: self and admin only. Never public (no contact details leak).
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- user_roles: read own; only admins grant or revoke.
create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy user_roles_admin_write on public.user_roles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- organizations: public sees verified, live organisations; members see their own.
create policy organizations_public_select on public.organizations for select to anon, authenticated
  using (verification_status = 'verified' and deleted_at is null);
create policy organizations_member_select on public.organizations for select to authenticated
  using (created_by = auth.uid() or public.is_org_member(id) or public.is_admin());
create policy organizations_apply on public.organizations for insert to authenticated
  with check (
    created_by = auth.uid()
    and verification_status = 'pending'
    and is_demo = false
  );
create policy organizations_manager_update on public.organizations for update to authenticated
  using (public.is_org_manager(id) or public.is_admin())
  with check (public.is_org_manager(id) or public.is_admin());
create policy organizations_admin_delete on public.organizations for delete to authenticated
  using (public.is_admin());

-- org_members: members see their organisation's roster; managers and admins manage it.
create policy org_members_select on public.org_members for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(org_id) or public.is_admin());
create policy org_members_manage on public.org_members for all to authenticated
  using (public.is_org_manager(org_id) or public.is_admin())
  with check (public.is_org_manager(org_id) or public.is_admin());

-- The applicant becomes owner of the organisation they just created.
create or replace function public.add_creator_as_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.created_by is not null then
    insert into public.org_members (org_id, user_id, member_role)
    values (new.id, new.created_by, 'owner')
    on conflict do nothing;
  end if;
  return new;
end $$;
create trigger organizations_creator_owner after insert on public.organizations
  for each row execute function public.add_creator_as_owner();

-- feature_flags: everyone reads; admins write.
create policy feature_flags_select on public.feature_flags for select to anon, authenticated
  using (true);
create policy feature_flags_admin_write on public.feature_flags for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- audit_log: admins read; nobody updates or deletes. Rows come from triggers.
create policy audit_log_admin_select on public.audit_log for select to authenticated
  using (public.is_admin());

-- ─── Grants ───────────────────────────────────────────────────────────────────
revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.organizations, public.feature_flags to anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_roles, public.org_members to authenticated;
grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.feature_flags to authenticated;
grant select on public.audit_log to authenticated;
grant execute on function public.has_role(public.app_role), public.is_admin(),
  public.is_org_member(uuid), public.is_org_manager(uuid) to anon, authenticated;
