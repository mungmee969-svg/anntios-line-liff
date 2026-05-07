-- Backoffice auth: backoffice_users + audit_logs extension columns
-- NOTE: This backoffice is username/password (no LIFF)

create table if not exists public.backoffice_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  display_name text,
  role text not null default 'staff'
    check (role in ('owner', 'admin', 'manager', 'staff', 'viewer')),
  is_active boolean not null default true,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists backoffice_users_username_idx on public.backoffice_users(username);
create index if not exists backoffice_users_active_idx on public.backoffice_users(is_active);

-- Ensure audit_logs has columns needed for backoffice actors (safe if already exists).
alter table public.audit_logs
  add column if not exists actor_id uuid,
  add column if not exists actor_username text;

create index if not exists audit_logs_actor_username_idx on public.audit_logs(actor_username);

alter table public.backoffice_users enable row level security;

-- This project currently uses anon policies for admin/service operations.
-- Service role bypasses RLS; keep anon permissive for now (can tighten later).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'backoffice_users' and policyname = 'anon_all_backoffice_users'
  ) then
    create policy anon_all_backoffice_users on public.backoffice_users for all using (true) with check (true);
  end if;
end $$;

