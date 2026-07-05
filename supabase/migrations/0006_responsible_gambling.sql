-- AreBet Migration 0006: Responsible Gambling
--
-- Schema + basic enforcement scaffolding for v1. Sophisticated features
-- (affordability checks, behavioral risk scoring) are explicitly out of
-- scope here — these tables just need to support deposit limits and
-- self-exclusion checks being enforced centrally alongside the KYC gate
-- wherever apply_wallet_transaction / bet placement is called.

create table if not exists public.responsible_gambling_limits (
  user_id                  uuid        primary key references auth.users(id) on delete cascade,
  deposit_limit_daily      numeric(14,2),
  deposit_limit_weekly     numeric(14,2),
  deposit_limit_monthly    numeric(14,2),
  loss_limit_daily         numeric(14,2),
  session_reminder_minutes integer,
  updated_at               timestamptz not null default now()
);

alter table public.responsible_gambling_limits enable row level security;

drop policy if exists "Users manage their own RG limits" on public.responsible_gambling_limits;
create policy "Users manage their own RG limits"
  on public.responsible_gambling_limits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Note: the standard responsible-gambling pattern is that DECREASING a
-- limit takes effect immediately, but INCREASING one has a cooldown
-- (e.g. 24-48h) before it applies. That asymmetry is enforced in the API
-- layer (not expressible cleanly as a row-level check), so this table
-- just stores the current limit values.

drop trigger if exists trg_rg_limits_updated_at on public.responsible_gambling_limits;
create trigger trg_rg_limits_updated_at
  before update on public.responsible_gambling_limits
  for each row execute function public.set_updated_at();

create table if not exists public.self_exclusions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  status     text        not null default 'active'
               check (status in ('active', 'expired', 'cancelled')),
  starts_at  timestamptz not null default now(),
  ends_at    timestamptz,   -- null = permanent
  reason     text,
  created_at timestamptz not null default now()
);

alter table public.self_exclusions enable row level security;

drop policy if exists "Users can view their own self-exclusions" on public.self_exclusions;
create policy "Users can view their own self-exclusions"
  on public.self_exclusions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can request their own self-exclusion" on public.self_exclusions;
create policy "Users can request their own self-exclusion"
  on public.self_exclusions for insert
  with check (auth.uid() = user_id);

-- Deliberately no update/delete policy for authenticated/anon: a user can
-- request self-exclusion, but only an admin/service-role action can lift
-- or cancel one early — self-exclusion must not be self-reversible.

create index if not exists idx_self_exclusions_user on public.self_exclusions(user_id);
create index if not exists idx_self_exclusions_status on public.self_exclusions(status);
