-- AreBet Migration 0002: Deposits & Withdrawals
--
-- Tracks real-world payment-provider interactions. Replaces the current
-- app/api/wallet/deposit/route.ts behaviour of directly incrementing
-- profiles.bankroll with no processor involved. A `deposits`/`withdrawals`
-- row is the audit trail of "what did the payment provider tell us and
-- when" — the actual balance change always happens separately via
-- apply_wallet_transaction(), referenced back here for traceability.

create table if not exists public.deposits (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references auth.users(id) on delete cascade,
  wallet_id           uuid        not null references public.wallets(id) on delete cascade,
  amount              numeric(14,2) not null check (amount > 0),
  currency            text        not null,
  provider            text        not null,   -- 'mock' | 'orange_money_bw' | 'myzaka' | 'stripe_card' | ...
  provider_reference  text,                    -- external transaction id
  status              text        not null default 'pending'
                        check (status in ('pending', 'completed', 'failed', 'cancelled')),
  wallet_transaction_id uuid      references public.wallet_transactions(id),
  raw_provider_payload jsonb,
  created_at          timestamptz not null default now(),
  completed_at        timestamptz
);

alter table public.deposits enable row level security;

drop policy if exists "Users can view their own deposits" on public.deposits;
create policy "Users can view their own deposits"
  on public.deposits for select
  using (auth.uid() = user_id);

drop policy if exists "Users can request their own deposits" on public.deposits;
create policy "Users can request their own deposits"
  on public.deposits for insert
  with check (auth.uid() = user_id and status = 'pending');

-- Status transitions (pending -> completed/failed/cancelled) happen only
-- via the service-role client (payment-provider webhook handler), so no
-- update policy is granted to authenticated/anon.

create index if not exists idx_deposits_user on public.deposits(user_id);
create index if not exists idx_deposits_status on public.deposits(status);
create index if not exists idx_deposits_provider_ref on public.deposits(provider, provider_reference);

create table if not exists public.withdrawals (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references auth.users(id) on delete cascade,
  wallet_id           uuid        not null references public.wallets(id) on delete cascade,
  amount              numeric(14,2) not null check (amount > 0),
  currency            text        not null,
  provider            text        not null,
  provider_reference  text,
  destination         jsonb,      -- provider-specific payout destination (mobile number, account, etc.)
  status              text        not null default 'pending'
                        check (status in ('pending', 'under_review', 'completed', 'failed', 'cancelled')),
  wallet_transaction_id uuid      references public.wallet_transactions(id),
  approved_by         uuid,       -- admin user id, for manual review flows
  raw_provider_payload jsonb,
  requested_at        timestamptz not null default now(),
  processed_at        timestamptz
);

alter table public.withdrawals enable row level security;

drop policy if exists "Users can view their own withdrawals" on public.withdrawals;
create policy "Users can view their own withdrawals"
  on public.withdrawals for select
  using (auth.uid() = user_id);

drop policy if exists "Users can request their own withdrawals" on public.withdrawals;
create policy "Users can request their own withdrawals"
  on public.withdrawals for insert
  with check (auth.uid() = user_id and status = 'pending');

-- Status transitions (approval, processing, completion) are service-role /
-- admin-route only.

create index if not exists idx_withdrawals_user on public.withdrawals(user_id);
create index if not exists idx_withdrawals_status on public.withdrawals(status);
