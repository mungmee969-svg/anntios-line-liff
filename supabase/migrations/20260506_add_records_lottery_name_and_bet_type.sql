-- Add lottery_name + bet_type to records
alter table public.records
  add column if not exists lottery_name text,
  add column if not exists bet_type text;

