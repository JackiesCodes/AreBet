-- AreBet Migration 0009: Admin RBAC
--
-- Replaces the shared-secret (`x-admin-secret` header, ADMIN_SECRET env
-- var) authorization used today in app/api/admin/boost/route.ts with a
-- real, queryable, per-user role assignment. The shared-secret guard can
-- stay in place for the existing editorial-boost route until Phase 4
-- rewrites it — this migration only adds the table lib/auth/admin.ts
-- (Phase 4) will read from via requireAdminRole(request, minRole).
--
-- Roles are ordered by increasing privilege: support < risk < finance <
-- superadmin. A route requiring 'finance' should also accept 'superadmin'
-- — that rank comparison happens in application code, not here.

create table if not exists public.admin_roles (
  user_id     uuid        primary key references auth.users(id) on delete cascade,
  role        text        not null check (role in ('support', 'risk', 'finance', 'superadmin')),
  granted_at  timestamptz not null default now(),
  granted_by  uuid
);

alter table public.admin_roles enable row level security;

drop policy if exists "Users can view their own admin role" on public.admin_roles;
create policy "Users can view their own admin role"
  on public.admin_roles for select
  using (auth.uid() = user_id);

-- Granting/revoking admin roles is service-role only (no self-service
-- insert/update/delete policy) — an admin role can never be self-assigned.

create index if not exists idx_admin_roles_role on public.admin_roles(role);
