-- AreBet Migration 0007: Casino Sessions & Rounds
--
-- Mirrors the sports-bet ledger pattern: every casino round produces
-- exactly one debit (and, if won, one credit) wallet_transactions row via
-- apply_wallet_transaction, keeping wallet_transactions the single source
-- of truth for balances across both product lines. Actual game RNG is
-- never implemented here — it lives entirely with the casino provider
-- (lib/providers/casino), mocked for now.

create table if not exists public.casino_sessions (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            uuid        not null references auth.users(id) on delete cascade,
  provider           text        not null,   -- 'mock' | future real aggregator id
  provider_session_id text,
  game_id            text        not null,
  game_label         text,
  currency           text        not null,
  is_real_money      boolean     not null default false,
  started_at         timestamptz not null default now(),
  ended_at           timestamptz
);

alter table public.casino_sessions enable row level security;

drop policy if exists "Users can view their own casino sessions" on public.casino_sessions;
create policy "Users can view their own casino sessions"
  on public.casino_sessions for select
  using (auth.uid() = user_id);

-- Session creation/closing happens via the service-role client (casino
-- launch/callback routes), not directly from the client.

create index if not exists idx_casino_sessions_user on public.casino_sessions(user_id);

create table if not exists public.casino_rounds (
  id                            uuid        primary key default gen_random_uuid(),
  session_id                    uuid        not null references public.casino_sessions(id) on delete cascade,
  provider_round_id             text        not null unique,
  bet_amount                    numeric(14,2) not null check (bet_amount >= 0),
  win_amount                    numeric(14,2) not null default 0 check (win_amount >= 0),
  wallet_transaction_debit_id   uuid        references public.wallet_transactions(id),
  wallet_transaction_credit_id  uuid        references public.wallet_transactions(id),
  settled_at                    timestamptz
);

alter table public.casino_rounds enable row level security;

drop policy if exists "Users can view rounds from their own sessions" on public.casino_rounds;
create policy "Users can view rounds from their own sessions"
  on public.casino_rounds for select
  using (
    exists (
      select 1 from public.casino_sessions s
      where s.id = casino_rounds.session_id
        and s.user_id = auth.uid()
    )
  );

-- Round settlement (debit/credit, provider callback handling) is
-- service-role only.

create index if not exists idx_casino_rounds_session on public.casino_rounds(session_id);
