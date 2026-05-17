-- InnoTrack: Phase 3 - SuperAdmin Control Plane

-- Ensure super_admin exists
alter type app_role add value if not exists 'super_admin';

-- Two-argument helper for global checks requested by SuperAdmin routes/RLS.
create or replace function public.has_role(user_id uuid, required_role app_role)
returns boolean as $$
begin
  return exists (
    select 1
    from public.user_roles
    where user_roles.user_id = $1
      and user_roles.role = $2
  );
end;
$$ language plpgsql security definer;

grant execute on function public.has_role(uuid, app_role) to authenticated;

-- Extend activity_logs for global governance.
alter table public.activity_logs
  add column if not exists actor_id uuid references auth.users(id),
  add column if not exists org_id uuid,
  add column if not exists severity text default 'info';

alter table public.activity_logs
  alter column user_id drop not null;

-- Keep actor_id in sync for older inserts that only pass user_id.
update public.activity_logs
set actor_id = coalesce(actor_id, user_id)
where actor_id is null;

create index if not exists idx_activity_logs_actor_id on public.activity_logs(actor_id);
create index if not exists idx_activity_logs_org_id on public.activity_logs(org_id);
create index if not exists idx_activity_logs_severity on public.activity_logs(severity);

alter table public.activity_logs enable row level security;

drop policy if exists "SuperAdmins read all logs" on public.activity_logs;
create policy "SuperAdmins read all logs"
  on public.activity_logs
  for select
  to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));

-- Announcements table
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  severity text default 'info',
  target_type text default 'all',
  target_value text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  scheduled_for timestamptz
);

create index if not exists idx_announcements_created_at on public.announcements(created_at desc);
create index if not exists idx_announcements_target_type on public.announcements(target_type);

alter table public.announcements enable row level security;

drop policy if exists "SuperAdmins manage announcements" on public.announcements;
create policy "SuperAdmins manage announcements"
  on public.announcements
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

-- SuperAdmin can manage organizations globally.
drop policy if exists "super_admin_insert_orgs" on public.organizations;
create policy "super_admin_insert_orgs"
  on public.organizations
  for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'super_admin'));

-- Optional tables for module activation and report snapshots used by /superadmin pages.
create table if not exists public.system_modules (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  default_enabled boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.org_module_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module_id uuid not null references public.system_modules(id) on delete cascade,
  enabled boolean not null default true,
  updated_by uuid references auth.users(id),
  updated_at timestamptz default now(),
  unique(organization_id, module_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  generated_by uuid references auth.users(id),
  report_type text not null,
  payload jsonb not null,
  generated_at timestamptz default now()
);

create table if not exists public.analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  snapshot_date date not null,
  completion_rate numeric,
  overdue_tasks integer,
  document_count integer,
  lifecycle_velocity numeric,
  created_at timestamptz default now()
);

alter table public.system_modules enable row level security;
alter table public.org_module_settings enable row level security;
alter table public.reports enable row level security;
alter table public.analytics_snapshots enable row level security;

drop policy if exists "super_admin_manage_modules" on public.system_modules;
create policy "super_admin_manage_modules"
  on public.system_modules
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

drop policy if exists "super_admin_manage_org_modules" on public.org_module_settings;
create policy "super_admin_manage_org_modules"
  on public.org_module_settings
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

drop policy if exists "super_admin_read_reports" on public.reports;
create policy "super_admin_read_reports"
  on public.reports
  for select
  to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));

drop policy if exists "super_admin_read_snapshots" on public.analytics_snapshots;
create policy "super_admin_read_snapshots"
  on public.analytics_snapshots
  for select
  to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));
