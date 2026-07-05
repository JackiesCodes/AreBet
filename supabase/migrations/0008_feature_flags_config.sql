-- AreBet Migration 0008: Feature Flags
--
-- Runtime, admin-controlled companion to the REAL_MONEY_ENABLED env var
-- (the hard deploy-time kill switch — see .env.example and
-- lib/config/feature-flags.ts). REAL_MONEY_ENABLED must be 'true' for any
-- of these to take effect at all; while it's false, every money route
-- treats all features here as off regardless of what's stored below. This
-- table only exists to allow granular rollout AFTER the master switch is
-- on (e.g. enable real-money sports before real-money casino, or enable
-- deposits before withdrawal processing is finished).

create table if not exists public.feature_flags (
  key        text        primary key,
  enabled    boolean     not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.feature_flags enable row level security;

drop policy if exists "Anyone can read feature flags" on public.feature_flags;
create policy "Anyone can read feature flags"
  on public.feature_flags for select
  using (true);

-- Writes are service-role / admin-route only (app/api/admin/feature-flags,
-- Phase 4) — no insert/update/delete policy for authenticated/anon.

drop trigger if exists trg_feature_flags_updated_at on public.feature_flags;
create trigger trg_feature_flags_updated_at
  before update on public.feature_flags
  for each row execute function public.set_updated_at();

insert into public.feature_flags (key, enabled) values
  ('real_money_sports', false),
  ('real_money_casino', false),
  ('withdrawals_enabled', false)
on conflict (key) do nothing;
