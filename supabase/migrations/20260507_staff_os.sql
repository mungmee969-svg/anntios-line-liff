-- Staff OS: staff_users + audit_logs
-- Safe to re-run with IF NOT EXISTS where applicable.

create table if not exists public.staff_users (
  id uuid primary key default gen_random_uuid(),
  line_user_id text unique not null,
  display_name text,
  role text not null default 'staff'
    check (role in ('owner', 'manager', 'staff', 'viewer')),
  is_active boolean not null default true,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists staff_users_line_user_id_idx on public.staff_users(line_user_id);
create index if not exists staff_users_active_idx on public.staff_users(is_active);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id text not null,
  actor_name text,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_actor_created_idx
  on public.audit_logs(actor_user_id, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs(action);

alter table public.staff_users enable row level security;
alter table public.audit_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'staff_users' and policyname = 'anon_all_staff_users'
  ) then
    create policy anon_all_staff_users on public.staff_users for all using (true) with check (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'audit_logs' and policyname = 'anon_all_audit_logs'
  ) then
    create policy anon_all_audit_logs on public.audit_logs for all using (true) with check (true);
  end if;
end $$;
