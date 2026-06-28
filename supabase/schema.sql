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
-- Records every bet placed via the BetSlip
-- =====================
drop table if exists public.user_bets cascade;
create table public.user_bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fixture_id integer not null,
  match_label text,          -- human-readable "Arsenal vs Chelsea"
  league text,
  market text not null,      -- 'MATCH_WINNER' | 'BTTS' | 'OVER_25' etc.
  market_label text,         -- human-readable "Match Winner"
  selection text not null,   -- 'HOME' | 'DRAW' | 'AWAY' | 'YES' | 'NO' etc.
  selection_label text,      -- human-readable "Arsenal" | "Draw" | "Away"
  bet_type text not null default 'SINGLE',  -- 'SINGLE' | 'ACCUMULATOR'
  stake numeric(10,2) not null,
  odds numeric(6,2) not null,
  result text not null default 'PENDING',   -- 'PENDING' | 'WIN' | 'LOSS' | 'PUSH' | 'VOID'
  kickoff_iso text,          -- ISO timestamp of the fixture kickoff
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

-- =====================
-- EDITORIAL BOOSTS
-- Admin-controlled match highlights and priority overrides.
-- Admins can pin a match, apply a temporary score boost, and attach a display
-- label. The highlight engine reads this table on every highlights request.
-- =====================
create table if not exists public.editorial_boosts (
  id          serial       primary key,
  fixture_id  integer      not null unique,   -- API-Football fixture ID

  -- Boost strength: 0.0 (no boost) → 1.0 (maximum editorial priority)
  score       numeric(4,3) not null default 1.0
              check (score >= 0 and score <= 1),

  -- Display label shown on the highlight card (optional)
  -- e.g. "Top Pick" | "Derby" | "Final" | "Editor's Choice" | "Promoted"
  label       text,

  -- Optional expiry — NULL means the boost is permanent until manually removed
  expires_at  timestamptz,

  -- Match metadata (denormalised for admin panel display — avoids join to API)
  home_team   text,
  away_team   text,
  kickoff_at  timestamptz,

  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

alter table public.editorial_boosts enable row level security;

-- Public can read active boosts (needed by the highlights API + client hook)
drop policy if exists "Anyone can read editorial boosts" on public.editorial_boosts;
create policy "Anyone can read editorial boosts"
  on public.editorial_boosts for select
  using (true);

-- All writes (INSERT / UPDATE / DELETE) go through service-role route handlers.
-- No client-side writes — protects against manipulation of highlighted matches.

create index if not exists idx_editorial_fixture    on public.editorial_boosts(fixture_id);
create index if not exists idx_editorial_expires    on public.editorial_boosts(expires_at) where expires_at is not null;
create index if not exists idx_editorial_created    on public.editorial_boosts(created_at desc);

-- =====================
-- WEBHOOK IDEMPOTENCY
-- Prevents Stripe webhook events from being processed more than once.
-- The webhook handler inserts a row on first delivery; a duplicate delivery
-- hits the unique constraint (23505) and is safely skipped.
-- =====================
create table if not exists public.processed_webhook_events (
  event_id     text        primary key,   -- Stripe event ID (evt_xxx)
  processed_at timestamptz not null default now()
);

-- Auto-clean old records after 30 days (Stripe retries within 3 days)
create index if not exists idx_webhook_events_age
  on public.processed_webhook_events(processed_at);

-- Service-role only — no public access
alter table public.processed_webhook_events enable row level security;

-- =====================
-- PROFILES: TIER CHECK CONSTRAINT + ROLE COLUMN
-- Prevents arbitrary strings being stored as tier or role.
-- Run with: ALTER TABLE ... ADD CONSTRAINT (idempotent via DO block).
-- =====================
do $$ begin
  -- Tier check constraint (free / pro / elite only)
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'profiles'
      and constraint_name = 'profiles_tier_check'
  ) then
    alter table public.profiles
      add constraint profiles_tier_check
      check (tier in ('free', 'pro', 'elite'));
  end if;

  -- Role column (user / admin)
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'role'
  ) then
    alter table public.profiles
      add column role text not null default 'user'
      check (role in ('user', 'admin'));
  end if;
end $$;

-- =====================
-- UPDATED_AT TRIGGER
-- Automatically keeps updated_at in sync on every UPDATE.
-- =====================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- profiles
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- preferences
drop trigger if exists trg_preferences_updated_at on public.preferences;
create trigger trg_preferences_updated_at
  before update on public.preferences
  for each row execute function public.set_updated_at();

-- editorial_boosts
drop trigger if exists trg_editorial_boosts_updated_at on public.editorial_boosts;
create trigger trg_editorial_boosts_updated_at
  before update on public.editorial_boosts
  for each row execute function public.set_updated_at();
