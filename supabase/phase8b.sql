-- ============================================================================
-- FreshCart — Phase 8B schema (run AFTER schema.sql, phase2–5, phase7, phase8)
-- Promotions: the existing offers table IS the promotion model — extended,
-- not duplicated. Admin write access already exists via the phase7 policy
-- "offers_admin_all" (is_admin()); customers keep read-only access, so only
-- administrators can manage promotions. Safe to re-run.
-- ============================================================================

-- Scheduling window (ends_at has existed since phase2) and featuring.
alter table public.offers add column if not exists starts_at timestamptz;
alter table public.offers add column if not exists featured boolean not null default false;

-- Promotions must not end before they start.
alter table public.offers drop constraint if exists offers_dates_check;
alter table public.offers add constraint offers_dates_check
  check (starts_at is null or ends_at is null or ends_at >= starts_at);

-- The homepage reads active promotions constantly; index the hot filter.
create index if not exists offers_active_idx on public.offers (active) where active;
