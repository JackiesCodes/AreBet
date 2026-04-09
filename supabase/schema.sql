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

create policy "Users manage their own favorites"
  on public.favorites for all
  using (auth.uid() = user_id);

-- =====================
-- USER BET HISTORY
-- Records every bet placed via BetSlipPanel
-- =====================
create table if not exists public.user_bets (
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

create policy "Users manage their own preferences"
  on public.preferences for all
  using (auth.uid() = user_id);

-- =====================
-- INDEXES
-- =====================
create index if not exists idx_favorites_user on public.favorites(user_id);
create index if not exists idx_user_bets_user on public.user_bets(user_id);
create index if not exists idx_user_bets_fixture on public.user_bets(fixture_id);
create index if not exists idx_user_bets_result on public.user_bets(result);
create index if not exists idx_user_predictions_user on public.user_predictions(user_id);
create index if not exists idx_match_ratings_fixture on public.match_ratings(fixture_id);
