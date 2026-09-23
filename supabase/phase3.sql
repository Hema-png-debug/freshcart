-- ============================================================================
-- FreshCart — Phase 3 schema (run AFTER schema.sql and phase2.sql)
-- Categories experience: richer products (brand, rating, organic, new),
-- 15 shopping categories, favourites, cart. Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- New product attributes
-- ---------------------------------------------------------------------------
alter table public.products add column if not exists brand text not null default 'FreshCart';
alter table public.products add column if not exists rating numeric(2,1) not null default 4.5
  check (rating between 0 and 5);
alter table public.products add column if not exists rating_count int not null default 0;
alter table public.products add column if not exists is_organic boolean not null default false;
alter table public.products add column if not exists is_new boolean not null default false;

alter table public.categories add column if not exists tagline text not null default '';

create index if not exists products_brand_idx on public.products (brand);
create index if not exists products_in_stock_idx on public.products (in_stock);

-- ---------------------------------------------------------------------------
-- Category restructure: split Meat & Fish, simplify Dairy, add six new aisles.
-- Guarded so re-runs are no-ops.
-- ---------------------------------------------------------------------------
update public.categories set slug = 'meat', name = 'Meat', emoji = '🥩'
  where slug = 'meat-fish';
update public.categories set slug = 'dairy', name = 'Dairy', emoji = '🥛'
  where slug = 'dairy-eggs';
update public.categories set name = 'Frozen Foods' where slug = 'frozen';

insert into public.categories (slug, name, emoji, color, sort_order, tagline) values
  ('seafood',       'Seafood',       '🐟', '#3a7fb9', 55,  'Fresh from the coast'),
  ('baby',          'Baby',          '🍼', '#d886a8', 110, 'Gentle essentials for little ones'),
  ('personal-care', 'Personal Care', '🧴', '#7a6bc9', 120, 'Look after yourself'),
  ('pet-supplies',  'Pet Supplies',  '🐾', '#a97b4f', 130, 'Treats and staples for pets'),
  ('health',        'Health',        '💊', '#4aa39a', 140, 'Everyday wellness'),
  ('cleaning',      'Cleaning',      '🧽', '#5a95d1', 150, 'Sparkling results, less effort')
on conflict (slug) do update
  set name = excluded.name, emoji = excluded.emoji, color = excluded.color,
      sort_order = excluded.sort_order, tagline = excluded.tagline;

update public.categories set tagline = v.tagline from (values
  ('fruits',     'Picked ripe, delivered fast'),
  ('vegetables', 'Crisp, seasonal and local'),
  ('dairy',      'From dawn milking to your door'),
  ('bakery',     'Baked fresh through the night'),
  ('meat',       'Trusted farms, expert cuts'),
  ('drinks',     'Chilled, sparkling and brewed'),
  ('snacks',     'Little wins for long days'),
  ('frozen',     'Frozen at peak freshness'),
  ('household',  'Everything a home runs on')
) as v(slug, tagline) where public.categories.slug = v.slug;

-- Move fish into the new Seafood aisle.
update public.products
  set category_id = (select id from public.categories where slug = 'seafood')
  where slug in ('salmon-fillets')
    and exists (select 1 from public.categories where slug = 'seafood');

-- ---------------------------------------------------------------------------
-- Backfill brands, ratings, organic and new flags on existing products.
-- Deterministic expressions keep re-runs stable.
-- ---------------------------------------------------------------------------
update public.products p set brand = coalesce(v.brand, p.brand)
from (values
  ('fruits', 'FreshFields'), ('vegetables', 'FreshFields'), ('dairy', 'Meadow & Co'),
  ('bakery', 'Oven Lane'), ('meat', 'Heritage Farms'), ('seafood', 'Coastline'),
  ('pantry', 'Larder Lane'), ('drinks', 'Rippl'), ('snacks', 'Crunch Works'),
  ('frozen', 'Polar Pantry'), ('household', 'HomeBright')
) as v(slug, brand)
join public.categories c on c.slug = v.slug
where p.category_id = c.id and p.brand = 'FreshCart';

update public.products
  set rating = least(5.0, round((3.6 + popularity / 100.0)::numeric, 1)),
      rating_count = 24 + (popularity * 7)
  where rating_count = 0;

update public.products set is_organic = true
  where slug in ('baby-spinach', 'blueberries', 'bananas', 'carrots', 'greek-yogurt', 'olive-oil');
update public.products set is_new = true
  where slug in ('strawberries', 'dark-chocolate', 'salmon-fillets', 'sparkling-water');
update public.products set in_stock = false
  where slug in ('margherita-pizza');

-- ---------------------------------------------------------------------------
-- Products for the new aisles.
-- ---------------------------------------------------------------------------
with c as (select slug, id from public.categories)
insert into public.products
  (slug, category_id, name, description, emoji, unit, price, original_price,
   featured, popularity, units_sold, brand, rating, rating_count, is_organic, is_new, in_stock)
values
  -- Seafood (joins the moved salmon)
  ('cod-fillets',     (select id from c where slug='seafood'), 'Cod Fillets',
   'Flaky white fish, skinless and boneless.', '🐟', '2 fillets', 4.10, null, false, 62, 380, 'Coastline', 4.4, 310, false, false, true),
  ('king-prawns',     (select id from c where slug='seafood'), 'King Prawns',
   'Juicy peeled prawns, ready to cook.', '🦐', '180 g', 3.85, 4.50, true, 73, 520, 'Coastline', 4.6, 460, false, false, true),
  ('smoked-mackerel', (select id from c where slug='seafood'), 'Smoked Mackerel',
   'Rich, oak-smoked fillets.', '🎣', '200 g', 2.95, null, false, 48, 210, 'Coastline', 4.3, 150, false, false, true),
  -- Baby
  ('baby-wipes',      (select id from c where slug='baby'), 'Sensitive Baby Wipes',
   'Fragrance-free wipes for delicate skin.', '🧻', '64 pack', 1.10, null, false, 69, 890, 'LittleNest', 4.7, 1240, false, false, true),
  ('infant-formula',  (select id from c where slug='baby'), 'First Infant Formula',
   'Stage 1 formula, from birth.', '🍼', '800 g', 11.50, null, false, 58, 340, 'LittleNest', 4.8, 760, false, false, true),
  ('baby-porridge',   (select id from c where slug='baby'), 'Organic Baby Porridge',
   'Gentle oat porridge from 6 months.', '🥣', '250 g', 2.40, null, false, 51, 280, 'LittleNest', 4.6, 410, true, true, true),
  ('nappies-size-4',  (select id from c where slug='baby'), 'Nappies Size 4',
   'All-night dryness with a soft fit.', '👶', '38 pack', 5.75, 6.50, true, 77, 1030, 'LittleNest', 4.5, 1580, false, false, true),
  -- Personal Care
  ('shampoo-argan',   (select id from c where slug='personal-care'), 'Argan Oil Shampoo',
   'Silky shine for everyday washing.', '🧴', '400 ml', 2.85, null, false, 64, 720, 'Glow Theory', 4.4, 830, false, false, true),
  ('toothpaste-mint', (select id from c where slug='personal-care'), 'Fresh Mint Toothpaste',
   'Fluoride protection, icy finish.', '🪥', '100 ml', 1.35, null, false, 82, 1650, 'Glow Theory', 4.6, 1900, false, false, true),
  ('hand-cream',      (select id from c where slug='personal-care'), 'Shea Hand Cream',
   'Deep moisture for hardworking hands.', '🤲', '75 ml', 2.10, 2.60, false, 55, 430, 'Glow Theory', 4.7, 520, true, false, true),
  ('bar-soap-oat',    (select id from c where slug='personal-care'), 'Oat & Honey Soap Bar',
   'Gentle cleansing, plastic-free.', '🧼', '2 × 100 g', 1.60, null, false, 47, 300, 'Glow Theory', 4.5, 280, true, true, true),
  -- Pet Supplies
  ('dog-food-chicken',(select id from c where slug='pet-supplies'), 'Chicken Dog Food',
   'Complete nutrition for adult dogs.', '🐶', '2 kg', 6.20, null, false, 71, 940, 'Waggle', 4.6, 1120, false, false, true),
  ('cat-food-salmon', (select id from c where slug='pet-supplies'), 'Salmon Cat Food',
   'Grain-free pouches cats ask for twice.', '🐱', '12 pouches', 4.95, 5.80, true, 74, 1010, 'Waggle', 4.7, 1340, false, false, true),
  ('cat-litter',      (select id from c where slug='pet-supplies'), 'Clumping Cat Litter',
   'Low-dust litter with odour lock.', '🐈', '8 L', 3.40, null, false, 52, 460, 'Waggle', 4.3, 390, false, false, true),
  ('dog-treats',      (select id from c where slug='pet-supplies'), 'Dental Dog Treats',
   'Daily chews for fresh breath.', '🦴', '28 pack', 2.85, null, false, 60, 570, 'Waggle', 4.5, 610, false, true, true),
  -- Health
  ('vitamin-d3',      (select id from c where slug='health'), 'Vitamin D3 1000 IU',
   'Daily support for bones and immunity.', '☀️', '90 tablets', 3.25, null, false, 66, 780, 'Wellfort', 4.6, 940, false, false, true),
  ('paracetamol',     (select id from c where slug='health'), 'Paracetamol 500 mg',
   'Effective relief from pain and fever.', '💊', '16 tablets', 0.55, null, false, 88, 2400, 'Wellfort', 4.7, 2100, false, false, true),
  ('plasters-mixed',  (select id from c where slug='health'), 'Fabric Plasters',
   'Flexible plasters in assorted sizes.', '🩹', '40 pack', 1.20, null, false, 49, 350, 'Wellfort', 4.4, 300, false, false, true),
  ('multivitamins',   (select id from c where slug='health'), 'A–Z Multivitamins',
   'Complete daily coverage in one tablet.', '🌈', '60 tablets', 4.10, 4.80, false, 57, 490, 'Wellfort', 4.5, 560, false, true, true),
  -- Cleaning
  ('all-purpose-spray',(select id from c where slug='cleaning'), 'All-Purpose Spray',
   'Cuts grease on every sealed surface.', '🧴', '750 ml', 1.45, null, false, 70, 1180, 'HomeBright', 4.5, 1030, false, false, true),
  ('laundry-pods',    (select id from c where slug='cleaning'), 'Laundry Pods',
   'Deep clean in one toss, any temperature.', '🫧', '24 pods', 5.60, 6.60, true, 76, 1280, 'HomeBright', 4.6, 1490, false, false, true),
  ('sponge-scourers', (select id from c where slug='cleaning'), 'Sponge Scourers',
   'Tough on pans, easy on hands.', '🧽', '6 pack', 0.95, null, false, 54, 620, 'HomeBright', 4.3, 410, false, false, true),
  ('glass-cleaner',   (select id from c where slug='cleaning'), 'Streak-Free Glass Cleaner',
   'Mirror shine without the smears.', '🪟', '500 ml', 1.30, null, false, 46, 330, 'HomeBright', 4.4, 250, false, true, true)
on conflict (slug) do update
  set category_id = excluded.category_id, name = excluded.name,
      description = excluded.description, emoji = excluded.emoji,
      unit = excluded.unit, price = excluded.price, original_price = excluded.original_price,
      featured = excluded.featured, popularity = excluded.popularity,
      units_sold = excluded.units_sold, brand = excluded.brand, rating = excluded.rating,
      rating_count = excluded.rating_count, is_organic = excluded.is_organic,
      is_new = excluded.is_new, in_stock = excluded.in_stock;

-- ---------------------------------------------------------------------------
-- Retire the legacy Pantry aisle: its cupboard staples (pasta, rice, tinned
-- tomatoes, olive oil, peanut butter) move to Household, keeping their
-- 'Larder Lane' brand from the backfill above. Guarded and idempotent.
-- ---------------------------------------------------------------------------
update public.products
  set category_id = (select id from public.categories where slug = 'household')
  where category_id in (select id from public.categories where slug = 'pantry')
    and exists (select 1 from public.categories where slug = 'household');

delete from public.categories where slug = 'pantry';

-- ---------------------------------------------------------------------------
-- favourites: one row per (user, product) the user has hearted.
-- ---------------------------------------------------------------------------
create table if not exists public.favourites (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.favourites enable row level security;

drop policy if exists "favourites_select_own" on public.favourites;
create policy "favourites_select_own"
  on public.favourites for select using (auth.uid() = user_id);

drop policy if exists "favourites_insert_own" on public.favourites;
create policy "favourites_insert_own"
  on public.favourites for insert with check (auth.uid() = user_id);

drop policy if exists "favourites_delete_own" on public.favourites;
create policy "favourites_delete_own"
  on public.favourites for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- cart_items: the user's current basket.
-- ---------------------------------------------------------------------------
create table if not exists public.cart_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity int not null check (quantity > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.cart_items enable row level security;

drop policy if exists "cart_items_select_own" on public.cart_items;
create policy "cart_items_select_own"
  on public.cart_items for select using (auth.uid() = user_id);

drop policy if exists "cart_items_insert_own" on public.cart_items;
create policy "cart_items_insert_own"
  on public.cart_items for insert with check (auth.uid() = user_id);

drop policy if exists "cart_items_update_own" on public.cart_items;
create policy "cart_items_update_own"
  on public.cart_items for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "cart_items_delete_own" on public.cart_items;
create policy "cart_items_delete_own"
  on public.cart_items for delete using (auth.uid() = user_id);
