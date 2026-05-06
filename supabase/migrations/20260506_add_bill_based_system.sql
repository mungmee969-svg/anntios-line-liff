-- Bill-based system (bills + wallet) + link records to bills
-- Safe to re-run: uses IF NOT EXISTS guards where possible.

-- 1) bills
create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  bill_no text unique not null,
  user_id text not null,
  display_name text,
  lottery_name text,
  bet_type text,
  total_amount numeric default 0,
  win_amount numeric default 0,
  lose_amount numeric default 0,
  net_amount numeric default 0,
  status text default 'pending',
  note text,
  created_at timestamptz default now()
);

-- 2) records: add bill_id FK
alter table public.records
  add column if not exists bill_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'records_bill_id_fkey'
  ) then
    alter table public.records
      add constraint records_bill_id_fkey
      foreign key (bill_id) references public.bills(id);
  end if;
end $$;

create index if not exists records_bill_id_idx on public.records(bill_id);
create index if not exists bills_user_id_created_at_idx on public.bills(user_id, created_at desc);

-- 3) user_wallets
create table if not exists public.user_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id text unique not null,
  display_name text,
  credit_balance numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4) wallet_transactions
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  type text not null,
  amount numeric not null,
  balance_after numeric,
  status text default 'pending',
  slip_url text,
  note text,
  created_at timestamptz default now()
);

create index if not exists wallet_transactions_user_id_created_at_idx
  on public.wallet_transactions(user_id, created_at desc);

-- RLS: keep anon working (open policies). Adjust later for auth/admin.
alter table public.bills enable row level security;
alter table public.user_wallets enable row level security;
alter table public.wallet_transactions enable row level security;

do $$
begin
  -- bills
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='bills' and policyname='anon_all_bills') then
    create policy anon_all_bills on public.bills for all using (true) with check (true);
  end if;

  -- user_wallets
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_wallets' and policyname='anon_all_user_wallets') then
    create policy anon_all_user_wallets on public.user_wallets for all using (true) with check (true);
  end if;

  -- wallet_transactions
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='wallet_transactions' and policyname='anon_all_wallet_transactions') then
    create policy anon_all_wallet_transactions on public.wallet_transactions for all using (true) with check (true);
  end if;
end $$;

