-- AreBet Migration 0001: Wallet & Ledger
--
-- Replaces `profiles.bankroll` (a mutable column, updated via racy
-- read-then-write in app/api/{bets/place,wallet/deposit}) with an
-- append-only ledger. Every credit/debit — bet stakes, payouts, deposits,
-- withdrawals, bonuses, casino rounds — goes through
-- apply_wallet_transaction(), which locks the wallet row so concurrent
-- requests can never both succeed against the same funds.
--
-- `profiles.bankroll` is left in place for now (dropped in a later
-- migration once app/api/bets/place and app/api/wallet/deposit are
-- rewritten to stop reading/writing it).

-- =====================
-- WALLETS
-- One row per (user_id, currency, is_real_money). is_real_money separates
-- the sandbox wallet (always used while REAL_MONEY_ENABLED=false or a
-- per-feature flag is off) from the real-money wallet, without needing two
-- parallel schemas.
-- =====================
create table if not exists public.wallets (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  currency       text        not null,   -- ISO 4217, e.g. 'BWP' | 'USD' | 'ZAR' | 'EUR'
  is_real_money  boolean     not null default false,
  cached_balance numeric(14,2) not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, currency, is_real_money)
);

alter table public.wallets enable row level security;

drop policy if exists "Users can view their own wallets" on public.wallets;
create policy "Users can view their own wallets"
  on public.wallets for select
  using (auth.uid() = user_id);

-- No insert/update/delete policy for authenticated/anon — all wallet
-- creation and balance mutation happens via apply_wallet_transaction()
-- (security definer) or the service-role client.

create index if not exists idx_wallets_user on public.wallets(user_id);

drop trigger if exists trg_wallets_updated_at on public.wallets;
create trigger trg_wallets_updated_at
  before update on public.wallets
  for each row execute function public.set_updated_at();

-- =====================
-- WALLET TRANSACTIONS (append-only ledger)
-- balance_after is a point-in-time snapshot computed inside
-- apply_wallet_transaction() — never recomputed or edited after insert.
-- Corrections happen via a new offsetting 'adjustment' row, never by
-- mutating history.
-- =====================
create table if not exists public.wallet_transactions (
  id              uuid        primary key default gen_random_uuid(),
  wallet_id       uuid        not null references public.wallets(id) on delete cascade,
  type            text        not null check (type in (
                    'deposit', 'withdrawal',
                    'bet_debit', 'bet_credit', 'bet_void_refund',
                    'bonus_credit', 'adjustment',
                    'casino_debit', 'casino_credit'
                  )),
  amount          numeric(14,2) not null,  -- signed: negative for debits
  balance_after   numeric(14,2) not null,
  reference_type  text,       -- 'bet' | 'deposit' | 'withdrawal' | 'casino_round' | 'manual'
  reference_id    uuid,       -- polymorphic pointer (user_bets.id, deposits.id, ...) — no FK constraint
  metadata        jsonb,
  created_by      uuid,       -- admin/service actor for manual adjustments, null otherwise
  created_at      timestamptz not null default now()
);

alter table public.wallet_transactions enable row level security;

drop policy if exists "Users can view their own wallet transactions" on public.wallet_transactions;
create policy "Users can view their own wallet transactions"
  on public.wallet_transactions for select
  using (
    exists (
      select 1 from public.wallets w
      where w.id = wallet_transactions.wallet_id
        and w.user_id = auth.uid()
    )
  );

-- No insert/update/delete policy for authenticated/anon — writes only via
-- apply_wallet_transaction() or the service-role client. Update/delete are
-- never granted to any role: the ledger is immutable by design.

create index if not exists idx_wallet_tx_wallet on public.wallet_transactions(wallet_id);
create index if not exists idx_wallet_tx_type on public.wallet_transactions(type);
create index if not exists idx_wallet_tx_reference on public.wallet_transactions(reference_type, reference_id);
create index if not exists idx_wallet_tx_created on public.wallet_transactions(created_at desc);

-- =====================
-- apply_wallet_transaction()
-- The single choke point for all money movement. Locks the wallet row
-- (SELECT ... FOR UPDATE) so concurrent calls serialize instead of racing,
-- rejects any transaction that would drive the balance negative, inserts
-- the ledger row, and updates the wallet's denormalized cached_balance —
-- all inside one statement-level transaction.
--
-- security definer + fixed search_path: callable by the service-role
-- client (bypasses RLS) to perform the actual mutation; not intended to be
-- exposed to the anon/authenticated roles as an RPC.
-- =====================
create or replace function public.apply_wallet_transaction(
  p_wallet_id      uuid,
  p_type           text,
  p_amount         numeric,
  p_reference_type text default null,
  p_reference_id   uuid default null,
  p_metadata       jsonb default null,
  p_created_by     uuid default null
)
returns public.wallet_transactions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current_balance numeric(14,2);
  v_new_balance     numeric(14,2);
  v_row             public.wallet_transactions;
begin
  select cached_balance into v_current_balance
  from public.wallets
  where id = p_wallet_id
  for update;

  if not found then
    raise exception 'Wallet % not found', p_wallet_id;
  end if;

  v_new_balance := v_current_balance + p_amount;

  if v_new_balance < 0 then
    raise exception 'Insufficient balance: wallet % has % but transaction would apply %',
      p_wallet_id, v_current_balance, p_amount;
  end if;

  insert into public.wallet_transactions (
    wallet_id, type, amount, balance_after, reference_type, reference_id, metadata, created_by
  ) values (
    p_wallet_id, p_type, p_amount, v_new_balance, p_reference_type, p_reference_id, p_metadata, p_created_by
  )
  returning * into v_row;

  update public.wallets
    set cached_balance = v_new_balance,
        updated_at = now()
    where id = p_wallet_id;

  return v_row;
end;
$$;

revoke all on function public.apply_wallet_transaction from public, anon, authenticated;
grant execute on function public.apply_wallet_transaction to service_role;
