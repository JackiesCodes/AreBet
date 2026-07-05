-- AreBet Migration 0005: KYC / Identity Verification
--
-- No identity verification exists today. Real-money deposits, withdrawals,
-- and bet placement will (once REAL_MONEY_ENABLED) require
-- kyc_profiles.status = 'approved' — enforced centrally in the service
-- layer wrapping apply_wallet_transaction, not per-route. Document numbers
-- are never stored in plaintext; only a hash (or nothing at all, if the
-- KYC provider retains the document itself and only returns a reference).

create table if not exists public.kyc_profiles (
  user_id                uuid        primary key references auth.users(id) on delete cascade,
  status                 text        not null default 'not_started'
                           check (status in ('not_started', 'pending', 'approved', 'rejected', 'expired')),
  provider               text,       -- 'mock' | 'smile_identity' | 'onfido' | ...
  provider_reference     text,
  full_name              text,
  date_of_birth          date,
  nationality            text,
  document_type          text,
  document_number_hash   text,       -- sha256 hash only — never the raw document number
  verified_at            timestamptz,
  rejection_reason       text,
  updated_at             timestamptz not null default now()
);

alter table public.kyc_profiles enable row level security;

drop policy if exists "Users can view their own KYC profile" on public.kyc_profiles;
create policy "Users can view their own KYC profile"
  on public.kyc_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can submit their own KYC profile" on public.kyc_profiles;
create policy "Users can submit their own KYC profile"
  on public.kyc_profiles for insert
  with check (auth.uid() = user_id and status in ('not_started', 'pending'));

-- Status transitions to approved/rejected happen only via the service-role
-- client (KYC provider webhook handler or an admin action) — no update
-- policy is granted to authenticated/anon, so a user cannot self-approve.

drop trigger if exists trg_kyc_profiles_updated_at on public.kyc_profiles;
create trigger trg_kyc_profiles_updated_at
  before update on public.kyc_profiles
  for each row execute function public.set_updated_at();

create table if not exists public.kyc_audit_log (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  event      text        not null check (event in ('submitted', 'approved', 'rejected', 'resubmitted')),
  actor      text        not null,   -- 'user' | 'provider_webhook' | 'admin:<uuid>'
  metadata   jsonb,
  created_at timestamptz not null default now()
);

alter table public.kyc_audit_log enable row level security;

drop policy if exists "Users can view their own KYC audit log" on public.kyc_audit_log;
create policy "Users can view their own KYC audit log"
  on public.kyc_audit_log for select
  using (auth.uid() = user_id);

-- Insert-only, service-role — every KYC state change is logged here
-- regardless of what mutates kyc_profiles.status directly.

create index if not exists idx_kyc_audit_user on public.kyc_audit_log(user_id);
create index if not exists idx_kyc_audit_created on public.kyc_audit_log(created_at desc);
