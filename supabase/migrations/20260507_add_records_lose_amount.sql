alter table public.records
  add column if not exists lose_amount numeric default 0;
