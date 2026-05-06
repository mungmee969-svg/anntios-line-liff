-- Admin + Wallet full schema extensions + atomic functions
-- NOTE: This migration extends existing tables; does not drop anything.

-- user_wallets: add locked_balance
alter table public.user_wallets
  add column if not exists locked_balance numeric default 0;

-- wallet_transactions: add admin/audit fields and widen enums-as-text
alter table public.wallet_transactions
  add column if not exists display_name text,
  add column if not exists balance_before numeric,
  add column if not exists balance_after numeric,
  add column if not exists bank_name text,
  add column if not exists account_name text,
  add column if not exists account_number text,
  add column if not exists admin_note text,
  add column if not exists approved_by text,
  add column if not exists approved_at timestamptz;

-- bills: add credit fields + cancellation/settlement metadata
alter table public.bills
  add column if not exists credit_before numeric,
  add column if not exists credit_after numeric,
  add column if not exists cancelled_reason text,
  add column if not exists settled_at timestamptz;

-- records: add result fields
alter table public.records
  add column if not exists result_status text default 'pending',
  add column if not exists win_amount numeric default 0;

-- Ensure RLS enabled for extended tables (service role bypasses)
alter table public.bills enable row level security;
alter table public.records enable row level security;
alter table public.user_wallets enable row level security;
alter table public.wallet_transactions enable row level security;

-- Helper: upsert wallet
create or replace function public._get_or_create_wallet(p_user_id text, p_display_name text)
returns public.user_wallets
language plpgsql
security definer
as $$
declare
  w public.user_wallets;
begin
  select * into w from public.user_wallets where user_id = p_user_id;
  if found then
    if p_display_name is not null and (w.display_name is null or w.display_name <> p_display_name) then
      update public.user_wallets
        set display_name = p_display_name,
            updated_at = now()
        where id = w.id
        returning * into w;
    end if;
    return w;
  end if;

  insert into public.user_wallets(user_id, display_name, credit_balance, locked_balance)
    values (p_user_id, p_display_name, 0, 0)
    returning * into w;
  return w;
end $$;

-- Submit bill atomically with credit debit
create or replace function public.submit_bill_with_credit(
  p_bill_no text,
  p_user_id text,
  p_display_name text,
  p_lottery_name text,
  p_bet_type text,
  p_total_amount numeric,
  p_note text,
  p_records jsonb,
  p_actor text
)
returns public.bills
language plpgsql
security definer
as $$
declare
  w public.user_wallets;
  b public.bills;
  before_balance numeric;
  after_balance numeric;
  rec jsonb;
begin
  if p_total_amount is null or p_total_amount <= 0 then
    raise exception 'total_amount invalid';
  end if;
  if p_bill_no is null or length(trim(p_bill_no)) = 0 then
    raise exception 'bill_no required';
  end if;

  w := public._get_or_create_wallet(p_user_id, p_display_name);
  before_balance := coalesce(w.credit_balance, 0);

  if before_balance < p_total_amount then
    raise exception 'INSUFFICIENT_CREDIT';
  end if;

  after_balance := before_balance - p_total_amount;

  insert into public.bills(
    bill_no, user_id, display_name, lottery_name, bet_type,
    total_amount, status, note, credit_before, credit_after
  ) values (
    p_bill_no, p_user_id, p_display_name, p_lottery_name, p_bet_type,
    p_total_amount, 'pending', p_note, before_balance, after_balance
  )
  returning * into b;

  -- Insert records from JSON array: [{number,type,amount}]
  for rec in select * from jsonb_array_elements(p_records)
  loop
    insert into public.records(
      bill_id, user_id, lottery_name, bet_type, number, type, amount, note
    ) values (
      b.id,
      p_user_id,
      p_lottery_name,
      p_bet_type,
      (rec->>'number'),
      (rec->>'type'),
      ((rec->>'amount')::numeric),
      p_note
    );
  end loop;

  update public.user_wallets
    set credit_balance = after_balance,
        updated_at = now()
    where id = w.id;

  insert into public.wallet_transactions(
    user_id, display_name, type, amount,
    balance_before, balance_after,
    status, note, approved_by, approved_at
  ) values (
    p_user_id, p_display_name, 'bet_debit', -p_total_amount,
    before_balance, after_balance,
    'approved', b.bill_no, p_actor, now()
  );

  return b;
end $$;

-- Cancel bill and refund credit
create or replace function public.cancel_bill_and_refund(
  p_bill_id uuid,
  p_reason text,
  p_actor text
)
returns public.bills
language plpgsql
security definer
as $$
declare
  b public.bills;
  w public.user_wallets;
  before_balance numeric;
  after_balance numeric;
begin
  select * into b from public.bills where id = p_bill_id for update;
  if not found then
    raise exception 'bill not found';
  end if;
  if b.status = 'cancelled' then
    return b;
  end if;
  if b.status = 'settled' then
    raise exception 'cannot cancel settled bill';
  end if;

  w := public._get_or_create_wallet(b.user_id, b.display_name);
  before_balance := coalesce(w.credit_balance, 0);
  after_balance := before_balance + coalesce(b.total_amount, 0);

  update public.bills
    set status = 'cancelled',
        cancelled_reason = p_reason,
        credit_before = before_balance,
        credit_after = after_balance
    where id = b.id
    returning * into b;

  update public.records
    set result_status = 'cancelled'
    where bill_id = b.id;

  update public.user_wallets
    set credit_balance = after_balance,
        updated_at = now()
    where id = w.id;

  insert into public.wallet_transactions(
    user_id, display_name, type, amount,
    balance_before, balance_after,
    status, note, approved_by, approved_at
  ) values (
    b.user_id, b.display_name, 'bet_refund', coalesce(b.total_amount, 0),
    before_balance, after_balance,
    'approved', b.bill_no, p_actor, now()
  );

  return b;
end $$;

-- Approve deposit: mark tx approved, add credit, set balances
create or replace function public.approve_deposit(
  p_tx_id uuid,
  p_actor text,
  p_admin_note text
)
returns public.wallet_transactions
language plpgsql
security definer
as $$
declare
  tx public.wallet_transactions;
  w public.user_wallets;
  before_balance numeric;
  after_balance numeric;
begin
  select * into tx from public.wallet_transactions where id = p_tx_id for update;
  if not found then
    raise exception 'transaction not found';
  end if;
  if tx.status <> 'pending' then
    return tx;
  end if;
  if tx.type <> 'deposit' then
    raise exception 'not a deposit';
  end if;

  w := public._get_or_create_wallet(tx.user_id, tx.display_name);
  before_balance := coalesce(w.credit_balance, 0);
  after_balance := before_balance + coalesce(tx.amount, 0);

  update public.user_wallets
    set credit_balance = after_balance,
        updated_at = now()
    where id = w.id;

  update public.wallet_transactions
    set status = 'approved',
        balance_before = before_balance,
        balance_after = after_balance,
        admin_note = p_admin_note,
        approved_by = p_actor,
        approved_at = now()
    where id = tx.id
    returning * into tx;

  return tx;
end $$;

create or replace function public.reject_transaction(
  p_tx_id uuid,
  p_actor text,
  p_admin_note text
)
returns public.wallet_transactions
language plpgsql
security definer
as $$
declare
  tx public.wallet_transactions;
begin
  select * into tx from public.wallet_transactions where id = p_tx_id for update;
  if not found then
    raise exception 'transaction not found';
  end if;
  if tx.status <> 'pending' then
    return tx;
  end if;

  update public.wallet_transactions
    set status = 'rejected',
        admin_note = p_admin_note,
        approved_by = p_actor,
        approved_at = now()
    where id = tx.id
    returning * into tx;

  return tx;
end $$;

-- Approve withdraw: check credit, subtract, set balances
create or replace function public.approve_withdraw(
  p_tx_id uuid,
  p_actor text,
  p_admin_note text
)
returns public.wallet_transactions
language plpgsql
security definer
as $$
declare
  tx public.wallet_transactions;
  w public.user_wallets;
  before_balance numeric;
  after_balance numeric;
begin
  select * into tx from public.wallet_transactions where id = p_tx_id for update;
  if not found then
    raise exception 'transaction not found';
  end if;
  if tx.status <> 'pending' then
    return tx;
  end if;
  if tx.type <> 'withdraw' then
    raise exception 'not a withdraw';
  end if;

  w := public._get_or_create_wallet(tx.user_id, tx.display_name);
  before_balance := coalesce(w.credit_balance, 0);
  if before_balance < coalesce(tx.amount, 0) then
    raise exception 'INSUFFICIENT_CREDIT';
  end if;
  after_balance := before_balance - coalesce(tx.amount, 0);

  update public.user_wallets
    set credit_balance = after_balance,
        updated_at = now()
    where id = w.id;

  update public.wallet_transactions
    set status = 'approved',
        balance_before = before_balance,
        balance_after = after_balance,
        admin_note = p_admin_note,
        approved_by = p_actor,
        approved_at = now()
    where id = tx.id
    returning * into tx;

  return tx;
end $$;

-- Admin adjust credit: always record an adjustment tx
create or replace function public.admin_adjust_credit(
  p_user_id text,
  p_display_name text,
  p_amount numeric,
  p_actor text,
  p_note text
)
returns public.wallet_transactions
language plpgsql
security definer
as $$
declare
  w public.user_wallets;
  before_balance numeric;
  after_balance numeric;
  tx public.wallet_transactions;
begin
  w := public._get_or_create_wallet(p_user_id, p_display_name);
  before_balance := coalesce(w.credit_balance, 0);
  after_balance := before_balance + coalesce(p_amount, 0);

  update public.user_wallets
    set credit_balance = after_balance,
        updated_at = now()
    where id = w.id;

  insert into public.wallet_transactions(
    user_id, display_name, type, amount,
    balance_before, balance_after,
    status, note, admin_note, approved_by, approved_at
  ) values (
    p_user_id, p_display_name, 'admin_adjust', p_amount,
    before_balance, after_balance,
    'approved', p_note, p_note, p_actor, now()
  )
  returning * into tx;

  return tx;
end $$;

