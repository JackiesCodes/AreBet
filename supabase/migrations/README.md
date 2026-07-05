These migrations extend `supabase/schema.sql` (the pre-existing baseline —
apply that first if starting from an empty database). Apply in numeric
order; each file is idempotent (`create table if not exists`, `drop policy
if exists` + recreate) so re-running is safe.

No Supabase CLI project is initialized in this repo yet (no
`supabase/config.toml`). Until `supabase init && supabase link` is run
locally, apply these by pasting each file's contents into
Supabase Dashboard → SQL Editor, in order, against the linked project
(`nmfhwryrnkzoahdxrpxe`). Once the CLI is set up, `supabase db push` will
pick up this same directory.

| File | Adds |
|---|---|
| `0001_wallet_and_ledger.sql` | `wallets`, `wallet_transactions`, `apply_wallet_transaction()` |
| `0002_deposits_withdrawals.sql` | `deposits`, `withdrawals` |
| `0003_odds_and_markets_snapshot.sql` | `markets`, `odds_snapshots`, `user_bets.odds_snapshot_id` |
| `0004_bet_settlement.sql` | `user_bets` settlement columns, `bet_settlement_jobs` |
| `0005_kyc_identity.sql` | `kyc_profiles`, `kyc_audit_log` |
| `0006_responsible_gambling.sql` | `responsible_gambling_limits`, `self_exclusions` |
| `0007_casino_sessions.sql` | `casino_sessions`, `casino_rounds` |
| `0008_feature_flags_config.sql` | `feature_flags` (+ seed rows) |
| `0009_rbac_roles.sql` | `admin_roles` |
