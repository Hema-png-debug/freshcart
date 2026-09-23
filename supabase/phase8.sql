-- ============================================================================
-- FreshCart — Phase 8A schema (run AFTER schema.sql, phase2–5.sql, phase7.sql)
-- Notification system: per-user inbox, preferences, lifecycle triggers, and
-- an admin broadcast function. Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Notification preferences on the profile.
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists notify_orders boolean not null default true;
alter table public.profiles add column if not exists notify_promos boolean not null default true;
alter table public.profiles add column if not exists notify_announcements boolean not null default true;

-- ---------------------------------------------------------------------------
-- notifications: each row belongs to exactly one user.
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in
    ('order_placed', 'payment', 'order_status', 'promo', 'announcement')),
  title text not null,
  message text not null,
  order_id uuid references public.orders (id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id) where read = false;

alter table public.notifications enable row level security;

-- Own-rows-only for every verb: notification data cannot leak between users.
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select using (auth.uid() = user_id);

drop policy if exists "notifications_insert_own" on public.notifications;
create policy "notifications_insert_own"
  on public.notifications for insert with check (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
  on public.notifications for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Lifecycle triggers write cross-user notifications server-side (definer),
-- honouring each recipient's preferences. Covers: order confirmed
-- (preparing), dispatched, delivered, cancelled — and card payment success.
-- "Order placed" is written by the ordering client itself (insert-own).
-- ---------------------------------------------------------------------------
create or replace function public.notify_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_message text;
begin
  if new.status = old.status then return new; end if;
  if not exists (
    select 1 from public.profiles p where p.id = new.user_id and p.notify_orders
  ) then return new; end if;

  v_title := case new.status
    when 'preparing' then 'Order confirmed'
    when 'out_for_delivery' then 'Order dispatched'
    when 'delivered' then 'Order delivered'
    when 'cancelled' then 'Order cancelled'
    else 'Order update'
  end;
  v_message := case new.status
    when 'preparing' then 'We''re picking your order #' || left(new.id::text, 8) || ' now.'
    when 'out_for_delivery' then 'Order #' || left(new.id::text, 8) || ' is on its way — ' || new.delivery_slot || '.'
    when 'delivered' then 'Order #' || left(new.id::text, 8) || ' has been delivered. Enjoy!'
    when 'cancelled' then 'Order #' || left(new.id::text, 8) || ' was cancelled.'
    else 'Order #' || left(new.id::text, 8) || ' was updated.'
  end;

  insert into public.notifications (user_id, type, title, message, order_id)
  values (new.user_id, 'order_status', v_title, v_message, new.id);
  return new;
end;
$$;

drop trigger if exists orders_notify_status on public.orders;
create trigger orders_notify_status
  after update on public.orders
  for each row execute function public.notify_order_status();

-- Card payments settle via the Stripe webhook; tell the customer when the
-- money actually moved. (COD is folded into the "delivered" update instead.)
create or replace function public.notify_payment_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' and new.provider = 'stripe' then
    if exists (select 1 from public.profiles p where p.id = new.user_id and p.notify_orders) then
      insert into public.notifications (user_id, type, title, message, order_id)
      values (
        new.user_id, 'payment', 'Payment successful',
        'Your card payment of £' || to_char(new.amount, 'FM999990.00') || ' went through.',
        new.order_id
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists payments_notify_paid on public.payments;
create trigger payments_notify_paid
  after update on public.payments
  for each row execute function public.notify_payment_paid();

-- ---------------------------------------------------------------------------
-- Broadcasts: admin-only, preference-aware, targeting-ready (null = everyone).
-- Runs as definer; the is_admin() check inside is the authorisation.
-- ---------------------------------------------------------------------------
create or replace function public.send_broadcast(
  p_type text,
  p_title text,
  p_message text,
  p_user_ids uuid[] default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can send notifications.';
  end if;
  if p_type not in ('promo', 'announcement') then
    raise exception 'Unsupported broadcast type.';
  end if;
  if length(trim(p_title)) = 0 or length(trim(p_message)) = 0 then
    raise exception 'Title and message are required.';
  end if;

  insert into public.notifications (user_id, type, title, message)
  select p.id, p_type, trim(p_title), trim(p_message)
  from public.profiles p
  where (p_user_ids is null or p.id = any (p_user_ids))
    and case when p_type = 'promo' then p.notify_promos else p.notify_announcements end;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
