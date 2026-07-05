-- AreBet Migration 0003: Odds & Markets Snapshot
--
-- Closes the biggest integrity gap in the current bet-placement flow:
-- app/api/bets/place/route.ts currently trusts the client-submitted `odds`
-- value verbatim (see request body handling there) with no server-side
-- verification against any source of truth. From here on, a bet must
-- reference a specific odds_snapshots row captured server-side via the
-- odds provider adapter (lib/providers/odds) at bet-placement time — that
-- snapshot is what "locks in odds" means. Fixture identity continues to
-- use API-Football fixture IDs (integer), since match schedule/result data
-- stays sourced from lib/api-football and is not being replaced.

-- =====================
-- MARKETS
-- Canonical catalogue of bettable markets, per odds provider. Not every
-- market needs a row ahead of time — the odds provider adapter can create
-- markets on demand when it returns quotes for a fixture.
-- =====================
create table if not exists public.markets (
  id                uuid        primary key default gen_random_uuid(),
  provider          text        not null,   -- 'mock' | future real vendor id
  provider_market_id text,                  -- vendor-side market identifier, if any
  sport             text        not null default 'football',
  fixture_id        integer     not null,
  market_code       text        not null,   -- 'MATCH_WINNER' | 'BTTS' | 'OVER_25' | 'UNDER_25' | 'DOUBLE_CHANCE' | ...
  market_label      text        not null,
  status            text        not null default 'open'
                      check (status in ('open', 'suspended', 'closed')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (provider, fixture_id, market_code)
);

alter table public.markets enable row level security;

drop policy if exists "Anyone can read markets" on public.markets;
create policy "Anyone can read markets"
  on public.markets for select
  using (true);

-- Writes are service-role only (odds provider adapter runs server-side).

create index if not exists idx_markets_fixture on public.markets(fixture_id);
create index if not exists idx_markets_status on public.markets(status);

drop trigger if exists trg_markets_updated_at on public.markets;
create trigger trg_markets_updated_at
  before update on public.markets
  for each row execute function public.set_updated_at();

-- =====================
-- ODDS SNAPSHOTS (append-only)
-- Every time the odds provider adapter is asked for a quote, the quote it
-- returns gets recorded here before being shown to the user. Bet placement
-- references the specific row that was shown, never a live/mutable value.
-- =====================
create table if not exists public.odds_snapshots (
  id                uuid        primary key default gen_random_uuid(),
  market_id         uuid        not null references public.markets(id) on delete cascade,
  selection_code    text        not null,   -- 'HOME' | 'DRAW' | 'AWAY' | 'YES' | 'NO' | 'OVER' | 'UNDER' | ...
  selection_label   text        not null,
  odds              numeric(8,3) not null check (odds > 1),
  provider_quote_id text,                   -- traceability back to the provider's own quote id, if any
  captured_at       timestamptz not null default now()
);

alter table public.odds_snapshots enable row level security;

drop policy if exists "Anyone can read odds snapshots" on public.odds_snapshots;
create policy "Anyone can read odds snapshots"
  on public.odds_snapshots for select
  using (true);

-- Insert-only, service-role. Never updated — a new odds movement is a new row.

create index if not exists idx_odds_snapshots_market on public.odds_snapshots(market_id);
create index if not exists idx_odds_snapshots_captured on public.odds_snapshots(captured_at desc);

-- =====================
-- user_bets: reference the locked-in odds snapshot
-- Nullable for now so existing demo-era rows (placed before this migration)
-- remain valid; app/api/bets/place gets rewritten to always populate this
-- going forward, and it can be made NOT NULL once the mock odds provider is
-- live end-to-end (tracked as a Phase 1 follow-up, not done here).
-- =====================
alter table public.user_bets
  add column if not exists odds_snapshot_id uuid references public.odds_snapshots(id);

create index if not exists idx_user_bets_odds_snapshot on public.user_bets(odds_snapshot_id);
