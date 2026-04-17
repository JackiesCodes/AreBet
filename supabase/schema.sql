-- AreBet Supabase Schema v2
-- Run this in: Supabase Dashboard > SQL Editor > New Query

-- =====================
-- USER PROFILES
-- =====================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  tier text not null default 'free', -- 'free' | 'pro' | 'elite'
  bankroll numeric(12,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================
-- USER FAVORITES
-- Matches code: entity_type (match/team/league) + entity_id (string)
-- =====================
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,  -- 'match' | 'team' | 'league'
  entity_id text not null,
  label text not null,
  meta jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, entity_type, entity_id)
);

alter table public.favorites enable row level security;

drop policy if exists "Users manage their own favorites" on public.favorites;

create policy "Users manage their own favorites"
  on public.favorites for all
  using (auth.uid() = user_id);

-- =====================
-- USER BET HISTORY
-- Records every bet placed via BetSlipPanel
-- Drop and recreate because the old schema used a single jsonb column
-- =====================
drop table if exists public.user_bets cascade;
create table public.user_bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fixture_id integer not null,
  teams text not null,
  league text,
  market text not null,    -- '1X2' | 'BTTS' | 'OVER25' | 'UNDER25' | 'DNB'
  selection text not null, -- 'HOME' | 'DRAW' | 'AWAY' | 'YES' | 'NO' | 'OVER' | 'UNDER'
  stake numeric(10,2) not null,
  odds numeric(6,2) not null,
  result text not null default 'PENDING', -- 'WIN' | 'LOSS' | 'PUSH' | 'PENDING'
  model_confidence integer,  -- 0-100, confidence at time of bet
  value_edge numeric(5,3),   -- edge % at time of bet (value bet detection)
  placed_at timestamptz not null default now()
);

alter table public.user_bets enable row level security;

drop policy if exists "Users manage their own bets" on public.user_bets;

create policy "Users manage their own bets"
  on public.user_bets for all
  using (auth.uid() = user_id);

-- =====================
-- USER PREDICTIONS
-- User's own match outcome predictions
-- =====================
create table if not exists public.user_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fixture_id integer not null,
  prediction text not null,  -- 'home' | 'draw' | 'away'
  teams text,
  league text,
  created_at timestamptz not null default now(),
  unique (user_id, fixture_id)
);

alter table public.user_predictions enable row level security;

drop policy if exists "Users manage their own predictions" on public.user_predictions;

create policy "Users manage their own predictions"
  on public.user_predictions for all
  using (auth.uid() = user_id);

-- =====================
-- MATCH RATINGS (user ratings per match)
-- =====================
create table if not exists public.match_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fixture_id integer not null,
  rating integer not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  unique (user_id, fixture_id)
);

alter table public.match_ratings enable row level security;

drop policy if exists "Users manage their own ratings" on public.match_ratings;

create policy "Users manage their own ratings"
  on public.match_ratings for all
  using (auth.uid() = user_id);

-- =====================
-- USER PREFERENCES
-- Synced from localStorage
-- =====================
create table if not exists public.preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  density text default 'compact',
  default_sort text default 'kickoff',
  default_filter_status text default 'all',
  show_favorites_first boolean default false,
  hide_finished boolean default false,
  odds_format text default 'decimal',
  updated_at timestamptz not null default now()
);

alter table public.preferences enable row level security;

drop policy if exists "Users manage their own preferences" on public.preferences;

create policy "Users manage their own preferences"
  on public.preferences for all
  using (auth.uid() = user_id);

-- =====================
-- CLEANUP OLD TABLES (from schema v1)
-- =====================
drop table if exists public.user_favorites cascade;

-- =====================
-- SIGNAL SNAPSHOTS
-- System-generated model predictions, one per fixture per kickoff date.
-- Signals are locked at generation time; outcome fields filled post-match.
-- This is the source of truth for the Trust Layer / Track Record page.
-- =====================
create table if not exists public.signal_snapshots (
  -- Stable primary key: sig_{fixture_id}_{kickoff_date}
  -- Allows safe upsert from multiple clients without duplicates.
  signal_id           text        primary key,

  -- Match identity
  fixture_id          integer     not null,
  home_team           text        not null,
  away_team           text        not null,
  league              text        not null,
  kickoff_at          timestamptz not null,

  -- Prediction (locked at generation time — never updated)
  predicted_outcome   text        not null,  -- 'Home Win' | 'Draw' | 'Away Win'
  confidence          smallint    not null,  -- 0-100
  confidence_tier     text        not null,  -- 'high' | 'mid' | 'low'

  -- Model probabilities (0-1, from prediction API or inference)
  model_prob_home     numeric(5,4),
  model_prob_draw     numeric(5,4),
  model_prob_away     numeric(5,4),

  -- Market fair probabilities (margin-stripped implied probs, 0-1)
  market_prob_home    numeric(5,4),
  market_prob_draw    numeric(5,4),
  market_prob_away    numeric(5,4),

  -- Odds snapshot at signal generation time
  odds_home           numeric(7,3),
  odds_draw           numeric(7,3),
  odds_away           numeric(7,3),

  -- Value edge (null if no edge detected)
  value_selection     text,          -- 'home' | 'draw' | 'away' | null
  value_edge_pct      numeric(6,3),  -- edge % (e.g. 6.2 means 6.2%)

  -- Signal generation metadata
  created_at          timestamptz not null default now(),

  -- Outcome resolution (filled after match finishes)
  actual_outcome      text,          -- 'Home Win' | 'Draw' | 'Away Win' | null (pending)
  score_home          smallint,
  score_away          smallint,
  is_correct          boolean,       -- null until resolved
  resolved_at         timestamptz
);

alter table public.signal_snapshots enable row level security;

-- Public read: Trust page works without authentication
drop policy if exists "Anyone can read signal snapshots" on public.signal_snapshots;
create policy "Anyone can read signal snapshots"
  on public.signal_snapshots for select
  using (true);

-- No direct client INSERT/UPDATE via RLS — all writes go through
-- server route handlers that use the service-role key.
-- This prevents clients from fabricating or modifying track record data.

-- =====================
-- STRIPE / SUBSCRIPTION
-- Add stripe_customer_id to profiles if not present
-- =====================
alter table public.profiles
  add column if not exists stripe_customer_id text;

-- =====================
-- WEB PUSH SUBSCRIPTIONS
-- Stores browser push subscription objects for background notifications
-- =====================
create table if not exists public.push_subscriptions (
  endpoint          text        primary key,
  user_id           uuid        references auth.users(id) on delete set null,
  subscription      jsonb       not null,
  updated_at        timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Service role manages push subscriptions" on public.push_subscriptions;
-- Only server-side (service role) can read/write push subscriptions
-- Clients interact via /api/push/* route handlers

create index if not exists idx_push_user on public.push_subscriptions(user_id);

-- =====================
-- INDEXES
-- =====================
create index if not exists idx_favorites_user on public.favorites(user_id);
create index if not exists idx_user_bets_user on public.user_bets(user_id);
create index if not exists idx_user_bets_fixture on public.user_bets(fixture_id);
create index if not exists idx_user_bets_result on public.user_bets(result);
create index if not exists idx_user_predictions_user on public.user_predictions(user_id);
create index if not exists idx_match_ratings_fixture on public.match_ratings(fixture_id);

-- Signal snapshot indexes
create index if not exists idx_signals_fixture    on public.signal_snapshots(fixture_id);
create index if not exists idx_signals_league     on public.signal_snapshots(league);
create index if not exists idx_signals_kickoff    on public.signal_snapshots(kickoff_at desc);
create index if not exists idx_signals_created    on public.signal_snapshots(created_at desc);
create index if not exists idx_signals_resolved   on public.signal_snapshots(resolved_at) where resolved_at is not null;
create index if not exists idx_signals_is_correct on public.signal_snapshots(is_correct)  where is_correct is not null;
