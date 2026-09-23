-- ============================================================================
-- FreshCart — Phase 5 schema (run AFTER schema.sql, phase2–4.sql)
-- Payments: a provider-agnostic payment ledger plus payment snapshots on
-- orders. Refund-ready and safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Payment snapshot columns on orders (denormalised for fast list rendering;
-- the payments table below is the authoritative ledger).
-- ---------------------------------------------------------------------------
alter table public.orders add column if not exists payment_method text not null default 'cod'
  check (payment_method in ('cod', 'card'));
alter table public.orders add column if not exists payment_status text not null default 'pending'
  check (payment_status in ('pending', 'processing', 'paid', 'failed', 'refunded'));

-- ---------------------------------------------------------------------------
-- payments: one ledger row per payment attempt that produced an order.
-- provider_payment_id stores the external reference (e.g. a Stripe
-- PaymentIntent id); refunded_amount prepares for partial/full refunds.
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('cod', 'stripe')),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'paid', 'failed', 'refunded', 'partially_refunded')),
  amount numeric(8,2) not null check (amount >= 0),
  currency text not null default 'gbp',
  provider_payment_id text,
  refunded_amount numeric(8,2) not null default 0 check (refunded_amount >= 0),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_order_idx on public.payments (order_id);
create index if not exists payments_user_idx on public.payments (user_id);
create index if not exists payments_provider_payment_idx
  on public.payments (provider_payment_id);

alter table public.payments enable row level security;

drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own"
  on public.payments for select using (auth.uid() = user_id);

-- SECURITY: clients may only ever create a payment in a non-settled state.
-- Transitions to paid/failed/refunded happen exclusively via the service
-- role (the stripe-webhook Edge Function), which bypasses RLS — a client can
-- never mark its own payment as paid. There is intentionally no update or
-- delete policy for authenticated users.
drop policy if exists "payments_insert_own_pending" on public.payments;
create policy "payments_insert_own_pending"
  on public.payments for insert
  with check (auth.uid() = user_id and status in ('pending', 'processing'));

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();
