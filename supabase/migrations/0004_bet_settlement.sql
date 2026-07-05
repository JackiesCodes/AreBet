-- AreBet Migration 0004: Bet Settlement
--
-- Today nothing ever grades a bet — user_bets.result is written as
-- 'PENDING' at insert time and never updated. This migration adds the
-- columns settleFixture() (lib/services/settlement.ts, Phase 1) needs to
-- tie a bet to its wallet ledger entries and record how/when it was
-- settled. bet_settlement_jobs gives the settlement cron
-- (app/api/cron/settle-bets/route.ts) an audit trail independent of the
-- individual bet rows.

alter table public.user_bets
  add column if not exists is_real_money boolean not null default false,
  add column if not exists currency text not null default 'BWP',
  add column if not exists settled_at timestamptz,
  add column if not exists settlement_source text
    check (settlement_source in ('auto', 'admin_manual')),
  add column if not exists wallet_transaction_debit_id uuid references public.wallet_transactions(id),
  add column if not exists wallet_transaction_credit_id uuid references public.wallet_transactions(id);

create index if not exists idx_user_bets_settled_at on public.user_bets(settled_at);

create table if not exists public.bet_settlement_jobs (
  id                 uuid        primary key default gen_random_uuid(),
  fixture_id         integer     not null,
  attempted_at       timestamptz not null default now(),
  status             text        not null default 'pending'
                       check (status in ('pending', 'success', 'partial_failure', 'failed')),
  bets_settled_count integer     not null default 0,
  error              text
);

alter table public.bet_settlement_jobs enable row level security;

-- Service-role only — no client-facing policy. This table exists purely
-- for ops/debugging visibility into the settlement cron.

create index if not exists idx_settlement_jobs_fixture on public.bet_settlement_jobs(fixture_id);
create index if not exists idx_settlement_jobs_attempted on public.bet_settlement_jobs(attempted_at desc);
