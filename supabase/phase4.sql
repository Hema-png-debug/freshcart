-- ============================================================================
-- FreshCart — Phase 4 schema (run AFTER schema.sql, phase2.sql, phase3.sql)
-- Checkout & Orders: order records with price snapshots. Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- orders: one row per placed order. Address and totals are snapshotted so the
-- record stays accurate even if the profile or prices change later.
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  address_label text not null,
  address_line text not null,
  delivery_slot text not null,
  status text not null default 'placed'
    check (status in ('placed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
  subtotal numeric(8,2) not null check (subtotal >= 0),
  delivery_fee numeric(8,2) not null check (delivery_fee >= 0),
  total numeric(8,2) not null check (total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists orders_user_created_idx
  on public.orders (user_id, created_at desc);

alter table public.orders enable row level security;

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own"
  on public.orders for select using (auth.uid() = user_id);

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
  on public.orders for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- order_items: line items with name/emoji/unit/price snapshots. product_id is
-- nullable (set null) so order history survives product deletion.
-- ---------------------------------------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name text not null,
  emoji text not null,
  unit text not null,
  price numeric(8,2) not null check (price >= 0),
  quantity int not null check (quantity > 0)
);

create index if not exists order_items_order_idx on public.order_items (order_id);

alter table public.order_items enable row level security;

drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own"
  on public.order_items for select
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = auth.uid()
  ));

drop policy if exists "order_items_insert_own" on public.order_items;
create policy "order_items_insert_own"
  on public.order_items for insert
  with check (exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = auth.uid()
  ));
