-- ============================================================================
-- FreshCart — Phase 7 schema (run AFTER schema.sql, phase2–5.sql)
-- Admin dashboard: admin role, admin RLS policies, stock quantities with
-- enforcement triggers, and profile emails for customer management.
-- Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- admin_users: membership defines the administrator role.
-- SECURITY: there are deliberately NO insert/update/delete policies — admins
-- are appointed only via SQL / the service role, never from the client:
--   insert into public.admin_users (user_id)
--   select id from auth.users where email = 'you@example.com';
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "admin_users_select_self" on public.admin_users;
create policy "admin_users_select_self"
  on public.admin_users for select using (auth.uid() = user_id);

-- Security-definer check usable inside other tables' policies without
-- recursive RLS evaluation.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid())
$$;

-- ---------------------------------------------------------------------------
-- Stock quantities. in_stock stays the customer-facing availability flag;
-- the trigger guarantees a sold-out product can never be marked available.
-- ---------------------------------------------------------------------------
alter table public.products add column if not exists stock_quantity int not null default 0
  check (stock_quantity >= 0);

-- One-time backfill: give available products a deterministic starting level.
update public.products
  set stock_quantity = 20 + popularity / 5
  where in_stock and stock_quantity = 0;

create or replace function public.enforce_stock_availability()
returns trigger
language plpgsql
as $$
begin
  if new.stock_quantity = 0 then
    new.in_stock := false;
  end if;
  return new;
end;
$$;

drop trigger if exists products_enforce_stock on public.products;
create trigger products_enforce_stock
  before insert or update on public.products
  for each row execute function public.enforce_stock_availability();

-- Recording an order line consumes stock (server-side; customers have no
-- update rights on products). Availability then follows via the trigger above.
create or replace function public.decrement_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.product_id is not null then
    update public.products
      set stock_quantity = greatest(0, stock_quantity - new.quantity)
      where id = new.product_id;
  end if;
  return new;
end;
$$;

drop trigger if exists order_items_decrement_stock on public.order_items;
create trigger order_items_decrement_stock
  after insert on public.order_items
  for each row execute function public.decrement_stock();

-- ---------------------------------------------------------------------------
-- Profile emails (admin customer views; auth.users is not client-readable).
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists email text;

update public.profiles p
  set email = u.email
  from auth.users u
  where u.id = p.id and p.email is null;

-- Extend the signup trigger to record the email going forward.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin policies (additive; customer policies from earlier phases stand).
-- ---------------------------------------------------------------------------
drop policy if exists "products_admin_all" on public.products;
create policy "products_admin_all"
  on public.products for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "categories_admin_all" on public.categories;
create policy "categories_admin_all"
  on public.categories for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "offers_admin_all" on public.offers;
create policy "offers_admin_all"
  on public.offers for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "orders_admin_select" on public.orders;
create policy "orders_admin_select"
  on public.orders for select using (public.is_admin());

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update"
  on public.orders for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "order_items_admin_select" on public.order_items;
create policy "order_items_admin_select"
  on public.order_items for select using (public.is_admin());

drop policy if exists "payments_admin_select" on public.payments;
create policy "payments_admin_select"
  on public.payments for select using (public.is_admin());

-- Admins may settle COD payments on delivery; card settlement remains the
-- webhook's job (service role).
drop policy if exists "payments_admin_update" on public.payments;
create policy "payments_admin_update"
  on public.payments for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "profiles_admin_select" on public.profiles;
create policy "profiles_admin_select"
  on public.profiles for select using (public.is_admin());
