-- ============================================================================
-- FreshCart — Phase 9A (production readiness: database performance)
-- Cover the product_id foreign keys that are currently unindexed for lookups
-- by product. Every one of these is exercised when a product row is updated
-- or deleted: PostgreSQL must verify/act on referencing rows, and without a
-- usable index that means a sequential scan of the child table. Safe to
-- re-run; CREATE INDEX IF NOT EXISTS takes only a brief lock.
--
-- Run AFTER all previous migrations. No data changes, RLS untouched.
-- ============================================================================

-- order_items.product_id has NO index. It is the hottest case:
--   * the phase7 decrement_stock trigger runs on every checkout line;
--   * editing or deleting a product (ON DELETE SET NULL here) forces a scan
--     of the largest child table in the system to find referencing rows.
create index if not exists order_items_product_idx
  on public.order_items (product_id);

-- purchase_history / favourites / cart_items each have a COMPOSITE primary key
-- (user_id, product_id). That serves user-leading reads (the app's normal
-- access pattern) but cannot be used for lookups by product_id alone — which
-- is exactly what a product delete's cascade check performs. These partial
-- child tables are small per user but grow with the catalogue's reach, so the
-- product-side index keeps admin catalogue edits from degrading over time.
create index if not exists purchase_history_product_idx
  on public.purchase_history (product_id);

create index if not exists favourites_product_idx
  on public.favourites (product_id);

create index if not exists cart_items_product_idx
  on public.cart_items (product_id);
