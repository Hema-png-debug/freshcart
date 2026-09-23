-- ============================================================================
-- FreshCart — Phase 2 schema (run AFTER schema.sql)
-- Catalog: categories, products, offers · purchase history · delivery address.
-- Safe to re-run: statements are idempotent; seeds upsert by slug.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Delivery address lives on the profile (single default address for now).
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists address_label text;
alter table public.profiles add column if not exists address_line text;

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  emoji text not null,
  color text not null default '#157347', -- brand tint used behind the emoji
  sort_order int not null default 0
);

alter table public.categories enable row level security;

drop policy if exists "categories_read_authenticated" on public.categories;
create policy "categories_read_authenticated"
  on public.categories for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- offers
-- ---------------------------------------------------------------------------
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text not null,
  discount_percent int not null check (discount_percent between 1 and 90),
  color text not null default '#157347',
  active boolean not null default true,
  ends_at timestamptz
);

alter table public.offers enable row level security;

drop policy if exists "offers_read_authenticated" on public.offers;
create policy "offers_read_authenticated"
  on public.offers for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category_id uuid not null references public.categories (id) on delete cascade,
  offer_id uuid references public.offers (id) on delete set null,
  name text not null,
  description text not null default '',
  emoji text not null,
  unit text not null default 'each',            -- "each", "500 g", "1 L", …
  price numeric(8,2) not null check (price >= 0),
  original_price numeric(8,2) check (original_price is null or original_price >= price),
  featured boolean not null default false,
  popularity int not null default 0,            -- drives "Popular"
  units_sold int not null default 0,            -- drives "Best Sellers"
  in_stock boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_offer_idx on public.products (offer_id);

alter table public.products enable row level security;

drop policy if exists "products_read_authenticated" on public.products;
create policy "products_read_authenticated"
  on public.products for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- purchase_history: powers "Recently Bought". Written by checkout (later
-- phase); read by the Home screen now.
-- ---------------------------------------------------------------------------
create table if not exists public.purchase_history (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  times_purchased int not null default 1,
  last_purchased_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.purchase_history enable row level security;

drop policy if exists "purchase_history_select_own" on public.purchase_history;
create policy "purchase_history_select_own"
  on public.purchase_history for select
  using (auth.uid() = user_id);

drop policy if exists "purchase_history_upsert_own" on public.purchase_history;
create policy "purchase_history_upsert_own"
  on public.purchase_history for insert
  with check (auth.uid() = user_id);

drop policy if exists "purchase_history_update_own" on public.purchase_history;
create policy "purchase_history_update_own"
  on public.purchase_history for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- SEED DATA
-- ============================================================================

insert into public.categories (slug, name, emoji, color, sort_order) values
  ('fruits',      'Fruits',        '🍎', '#e0503c', 10),
  ('vegetables',  'Vegetables',    '🥦', '#157347', 20),
  ('dairy-eggs',  'Dairy & Eggs',  '🥛', '#4c8fd1', 30),
  ('bakery',      'Bakery',        '🥐', '#c98a2d', 40),
  ('meat-fish',   'Meat & Fish',   '🐟', '#b3564e', 50),
  ('pantry',      'Pantry',        '🫙', '#8a6d4f', 60),
  ('drinks',      'Drinks',        '🧃', '#d97e28', 70),
  ('snacks',      'Snacks',        '🍿', '#a458c2', 80),
  ('frozen',      'Frozen',        '🧊', '#3aa6b9', 90),
  ('household',   'Household',     '🧻', '#5f7480', 100)
on conflict (slug) do update
  set name = excluded.name, emoji = excluded.emoji,
      color = excluded.color, sort_order = excluded.sort_order;

insert into public.offers (slug, title, subtitle, discount_percent, color, active) values
  ('fresh-week',   'Fresh Week',        'Up to 25% off fruit & veg',       25, '#157347', true),
  ('breakfast-fix','The Breakfast Fix', '15% off bakery, eggs and juice',  15, '#c98a2d', true),
  ('big-freeze',   'The Big Freeze',    '20% off everything frozen',       20, '#3aa6b9', true)
on conflict (slug) do update
  set title = excluded.title, subtitle = excluded.subtitle,
      discount_percent = excluded.discount_percent,
      color = excluded.color, active = excluded.active;

-- Products. price = current price; original_price set when an offer applies.
with c as (select slug, id from public.categories),
     o as (select slug, id from public.offers)
insert into public.products
  (slug, category_id, offer_id, name, description, emoji, unit, price, original_price, featured, popularity, units_sold)
values
  -- Fruits
  ('gala-apples',      (select id from c where slug='fruits'), (select id from o where slug='fresh-week'),
   'Gala Apples', 'Sweet, crisp and perfect for lunchboxes.', '🍎', '6 pack', 1.80, 2.40, true,  88, 1240),
  ('bananas',          (select id from c where slug='fruits'), (select id from o where slug='fresh-week'),
   'Bananas', 'Fairtrade bananas, ripe and ready.', '🍌', '5 pack', 0.98, 1.30, true,  97, 2310),
  ('strawberries',     (select id from c where slug='fruits'), null,
   'Strawberries', 'British-grown, sweet and juicy.', '🍓', '400 g', 2.75, null, true,  91, 980),
  ('blueberries',      (select id from c where slug='fruits'), null,
   'Blueberries', 'Plump berries for porridge and snacking.', '🫐', '150 g', 1.95, null, false, 76, 640),
  ('seedless-grapes',  (select id from c where slug='fruits'), null,
   'Seedless Grapes', 'Crunchy red grapes, washed and go.', '🍇', '500 g', 2.20, null, false, 69, 520),
  ('oranges',          (select id from c where slug='fruits'), (select id from o where slug='fresh-week'),
   'Navel Oranges', 'Easy peelers bursting with juice.', '🍊', '4 pack', 1.50, 2.00, false, 71, 450),
  -- Vegetables
  ('broccoli',         (select id from c where slug='vegetables'), (select id from o where slug='fresh-week'),
   'Broccoli', 'A classic crown of green goodness.', '🥦', 'each', 0.68, 0.90, false, 66, 720),
  ('carrots',          (select id from c where slug='vegetables'), null,
   'Carrots', 'Sweet and crunchy, great for roasting.', '🥕', '1 kg', 0.60, null, false, 74, 1100),
  ('baby-spinach',     (select id from c where slug='vegetables'), null,
   'Baby Spinach', 'Washed leaves for salads and smoothies.', '🥬', '240 g', 1.40, null, true,  70, 610),
  ('cherry-tomatoes',  (select id from c where slug='vegetables'), (select id from o where slug='fresh-week'),
   'Cherry Tomatoes', 'Sweet vine-ripened tomatoes.', '🍅', '330 g', 1.13, 1.50, true,  83, 890),
  ('red-peppers',      (select id from c where slug='vegetables'), null,
   'Red Peppers', 'Sweet peppers for fajitas and salads.', '🫑', '3 pack', 1.65, null, false, 61, 430),
  ('avocados',         (select id from c where slug='vegetables'), null,
   'Avocados', 'Ready-to-eat Hass avocados.', '🥑', '2 pack', 2.10, null, true,  85, 760),
  -- Dairy & Eggs
  ('semi-skimmed-milk',(select id from c where slug='dairy-eggs'), null,
   'Semi-Skimmed Milk', 'Fresh British milk.', '🥛', '2 pints', 1.20, null, false, 95, 3200),
  ('free-range-eggs',  (select id from c where slug='dairy-eggs'), (select id from o where slug='breakfast-fix'),
   'Free-Range Eggs', 'Large eggs from free-roaming hens.', '🥚', '12 pack', 2.72, 3.20, true,  89, 1750),
  ('mature-cheddar',   (select id from c where slug='dairy-eggs'), null,
   'Mature Cheddar', 'Rich, tangy and great for toasties.', '🧀', '400 g', 3.50, null, false, 79, 940),
  ('greek-yogurt',     (select id from c where slug='dairy-eggs'), null,
   'Greek Yogurt', 'Thick and creamy, 5% fat.', '🍦', '500 g', 1.85, null, false, 68, 580),
  ('salted-butter',    (select id from c where slug='dairy-eggs'), null,
   'Salted Butter', 'Churned from British cream.', '🧈', '250 g', 1.99, null, false, 72, 830),
  -- Bakery
  ('sourdough-loaf',   (select id from c where slug='bakery'), (select id from o where slug='breakfast-fix'),
   'Sourdough Loaf', 'Slow-fermented with a chewy crumb.', '🍞', '800 g', 2.34, 2.75, true,  81, 690),
  ('croissants',       (select id from c where slug='bakery'), (select id from o where slug='breakfast-fix'),
   'All-Butter Croissants', 'Flaky, golden, dangerously good.', '🥐', '4 pack', 1.87, 2.20, true,  84, 730),
  ('bagels',           (select id from c where slug='bakery'), null,
   'Plain Bagels', 'Dense, chewy, toaster-ready.', '🥯', '5 pack', 1.55, null, false, 58, 410),
  -- Meat & Fish
  ('chicken-breast',   (select id from c where slug='meat-fish'), null,
   'Chicken Breast Fillets', 'British chicken, skinless and boneless.', '🍗', '640 g', 4.25, null, false, 87, 1350),
  ('salmon-fillets',   (select id from c where slug='meat-fish'), null,
   'Salmon Fillets', 'Responsibly sourced Scottish salmon.', '🐟', '2 fillets', 4.95, null, true,  75, 560),
  ('beef-mince',       (select id from c where slug='meat-fish'), null,
   'Beef Mince 5%', 'Lean mince for bolognese and burgers.', '🥩', '500 g', 3.85, null, false, 80, 1020),
  -- Pantry
  ('penne-pasta',      (select id from c where slug='pantry'), null,
   'Penne Pasta', 'Bronze-die pasta that holds its sauce.', '🍝', '500 g', 0.95, null, false, 77, 1500),
  ('basmati-rice',     (select id from c where slug='pantry'), null,
   'Basmati Rice', 'Fluffy, fragrant long-grain rice.', '🍚', '1 kg', 2.35, null, false, 65, 720),
  ('chopped-tomatoes', (select id from c where slug='pantry'), null,
   'Chopped Tomatoes', 'The base of a thousand dinners.', '🥫', '400 g', 0.55, null, false, 73, 1900),
  ('olive-oil',        (select id from c where slug='pantry'), null,
   'Extra Virgin Olive Oil', 'Cold-pressed, peppery finish.', '🫒', '500 ml', 4.50, null, true,  63, 480),
  ('peanut-butter',    (select id from c where slug='pantry'), null,
   'Crunchy Peanut Butter', '100% roasted peanuts, nothing else.', '🥜', '340 g', 2.15, null, false, 67, 610),
  -- Drinks
  ('orange-juice',     (select id from c where slug='drinks'), (select id from o where slug='breakfast-fix'),
   'Fresh Orange Juice', 'Smooth, not-from-concentrate.', '🍊', '1 L', 2.13, 2.50, false, 78, 1150),
  ('sparkling-water',  (select id from c where slug='drinks'), null,
   'Sparkling Water', 'Lightly carbonated spring water.', '💧', '6 × 500 ml', 2.40, null, false, 55, 830),
  ('ground-coffee',    (select id from c where slug='drinks'), null,
   'Ground Coffee', 'Medium roast, chocolatey and smooth.', '☕', '227 g', 3.75, null, true,  82, 920),
  ('breakfast-tea',    (select id from c where slug='drinks'), null,
   'Breakfast Tea', '80 proper builder''s brew bags.', '🍵', '80 bags', 2.60, null, false, 71, 1040),
  -- Snacks
  ('sea-salt-crisps',  (select id from c where slug='snacks'), null,
   'Sea Salt Crisps', 'Hand-cooked with flaky sea salt.', '🍟', '150 g', 1.65, null, false, 74, 970),
  ('dark-chocolate',   (select id from c where slug='snacks'), null,
   'Dark Chocolate 70%', 'Single-origin, intensely cocoa.', '🍫', '100 g', 1.90, null, true,  79, 850),
  ('salted-popcorn',   (select id from c where slug='snacks'), null,
   'Salted Popcorn', 'Light, moreish movie-night fuel.', '🍿', '90 g', 1.25, null, false, 62, 540),
  -- Frozen
  ('frozen-peas',      (select id from c where slug='frozen'), (select id from o where slug='big-freeze'),
   'Garden Peas', 'Frozen within hours of picking.', '🟢', '900 g', 1.36, 1.70, false, 72, 1300),
  ('margherita-pizza', (select id from c where slug='frozen'), (select id from o where slug='big-freeze'),
   'Margherita Pizza', 'Stone-baked base, proper mozzarella.', '🍕', '330 g', 2.40, 3.00, true,  86, 1100),
  ('vanilla-ice-cream',(select id from c where slug='frozen'), (select id from o where slug='big-freeze'),
   'Vanilla Ice Cream', 'Made with Madagascan vanilla.', '🍨', '1 L', 2.80, 3.50, false, 81, 890),
  -- Household
  ('kitchen-roll',     (select id from c where slug='household'), null,
   'Kitchen Roll', 'Extra-absorbent double sheets.', '🧻', '2 rolls', 1.85, null, false, 59, 1450),
  ('washing-up-liquid',(select id from c where slug='household'), null,
   'Washing-Up Liquid', 'Cuts grease, kind to hands.', '🫧', '450 ml', 1.20, null, false, 57, 1200)
on conflict (slug) do update
  set category_id = excluded.category_id,
      offer_id = excluded.offer_id,
      name = excluded.name,
      description = excluded.description,
      emoji = excluded.emoji,
      unit = excluded.unit,
      price = excluded.price,
      original_price = excluded.original_price,
      featured = excluded.featured,
      popularity = excluded.popularity,
      units_sold = excluded.units_sold;
