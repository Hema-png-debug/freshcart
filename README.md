# FreshCart 🥬

A modern grocery delivery app. React + TypeScript + Supabase, built phase by phase.

**Current status: Phase 10 — Production Release ✅ (awaiting approval) — deployment-ready; requires live Supabase verification**

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier is fine).

3. **Configure credentials**

   ```bash
   cp .env.example .env
   ```

   Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from
   *Project Settings → API* in the Supabase dashboard.

4. **Create the database schema**

   In the Supabase *SQL Editor*, run these files **in order** (each is
   idempotent and safe to re-run):

   1. `supabase/schema.sql` — auth foundation: the `profiles` table (with row-level
      security) and a trigger that creates a profile automatically on signup.
   2. `supabase/phase2.sql` — the catalog: categories, products, offers, purchase
      history, and delivery-address columns, **including seed data** (categories,
      ~40 products, offers).
   3. `supabase/phase3.sql` — favourites and cart persistence, plus the richer
      product columns (brand, rating, organic/new flags) and the aisle restructure.
   4. `supabase/phase4.sql` — orders and order items (with price snapshots).
   5. `supabase/phase5.sql` — the payments ledger and order payment status.
   6. `supabase/phase7.sql` — the admin role (`admin_users` + `is_admin()`), stock
      quantities with their enforcement triggers, and admin RLS policies.
   7. `supabase/phase8.sql` — the notification system: inbox table, preferences,
      lifecycle triggers, and the `send_broadcast` function.
   8. `supabase/phase8b.sql` — promotion scheduling columns and the active-offer index.
   9. `supabase/phase9a.sql` — production performance indexes on the `product_id`
      foreign keys.

   > There is no `phase6.sql`: Phase 6 (profile & settings) needed no schema changes.
   > After running the migrations, appoint your first admin with the SQL snippet in the
   > *Appointing an admin* section below.

5. **(Recommended for local dev)** In Supabase *Authentication → Providers → Email*, you can
   disable "Confirm email" while developing so registration signs you in immediately. Leave it
   on for production. For the password-reset flow, add `http://localhost:5173/reset-password`
   under *Authentication → URL Configuration → Redirect URLs*.

6. **Run the app**

   ```bash
   npm run dev
   ```

   If credentials are missing, the app shows a setup guide instead of crashing.

## Deploying to production

See **[`DEPLOYMENT.md`](./DEPLOYMENT.md)** for the full production guide: creating the
Supabase project, running all nine migrations in order, appointing an admin, deploying the
three Edge Functions, configuring Stripe and Auth, hosting the frontend (Vercel / Netlify /
Cloudflare Pages — SPA rewrite configs for all three are included), custom domain + HTTPS,
and a ten-step live smoke test. The app ships as an installable **PWA** (web app manifest,
themed icons, standalone display). No Supabase Storage is required — product tiles are
emoji by design.

## Scripts

| Command             | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Start the dev server                  |
| `npm run build`     | Type-check and build for production   |
| `npm run preview`   | Serve the production build            |
| `npm run typecheck` | TypeScript check only                 |
| `npm test`          | Run the smoke-test suite (Vitest)     |
| `npm run lint`      | Lint with oxlint                      |

## Project structure

```
src/
  components/
    ui/          Reusable primitives: Button, Input, Card, Alert, Spinner,
                 LoadingScreen, EmptyState, Logo, ThemeToggle
    layout/      AppLayout (tab shell), BottomNav, AuthLayout, PageHeader
  context/       ThemeContext (dark/light), AuthContext (session + profile)
  lib/           supabase client, validation helpers
  pages/
    auth/        Login, Register, ForgotPassword, ResetPassword
    app/         Home, Categories, Cart, Orders, Profile
    Splash.tsx   Welcome.tsx  SetupNotice.tsx  NotFound.tsx
  routes/        Route guards (RequireAuth, RedirectIfAuthed)
  styles/        Design tokens (CSS variables) + Tailwind
  types/         Shared TypeScript types
supabase/
  schema.sql     profiles table, RLS policies, signup trigger
```

## Design system

- **Fonts:** Bricolage Grotesque (display) + Inter (body), self-hosted via Fontsource.
- **Colors:** CSS-variable tokens (`--c-primary`, `--c-accent`, …) mapped into Tailwind, so
  dark/light mode is a single `dark` class on `<html>`. Basil green primary, clementine accent.
- **Theme:** follows system preference until the user picks; choice persists in localStorage;
  applied before first paint (no flash).
- **Motion:** Framer Motion for splash, page-enter, and nav-indicator animations;
  `prefers-reduced-motion` respected globally.

## Phase log

### Phase 1 — Foundation ✅

Built: Splash, Welcome, Login, Register, Forgot/Reset Password · five-tab bottom navigation
(Home, Categories, Cart, Orders, Profile) · theme system with dark/light mode · reusable
buttons, cards, inputs, alerts, loading components, empty states · Supabase auth (sign up,
sign in, sign out, password reset) · `profiles` table with RLS + auto-create trigger ·
editable profile name · route guards.

QA verified: `tsc` clean (strict mode) · production build passes · 9/9 smoke tests pass
(guards, login flow, tab navigation, theme toggle, sign-out) · SPA preview serves correctly ·
lint clean (3 dev-only fast-refresh notes on context files).

### Phase 2 — Home Screen ✅

Built: delivery-address control (view/edit, persisted to the profile, bottom-sheet editor) ·
search (dedicated screen, 300 ms debounced live queries, clear/retry, result counts) ·
today's-offers banner carousel (each opens that offer's products) · category rail (each tile
opens that category) · Featured, Popular, Recently Bought and Best Sellers rails with working
"See all" screens · product detail page (price, discount, category link, description, sales) ·
one flexible `/products` list behind every rail, category, and offer · catalog schema + seed
data (categories, products, offers, purchase_history) with RLS · reusable Sheet, Skeleton,
ProductCard, carousel components · `useAsync` fetch hook with stale-response protection ·
per-section loading skeletons, error + retry states, and honest empty states. Every element
on Home is clickable and does something real.

QA verified: `tsc` clean · production build passes · 19/19 tests pass (Phase 1 suite intact,
plus catalog rendering, category/offer/see-all filtering through real page code, live search,
address save, product detail) · two bugs found by tests and fixed: a dead Retry button on
search, and a Sheet focus bug that stole keyboard focus after the first character typed.

**Post-phase performance pass:** product detail now fetches product + category in a
single joined query (was 2 sequential round trips) · 45 s TTL cache on categories and
offers so tab switches don't refetch near-static data · rails and product cards are
memoized so Home's six async loads no longer re-render every already-painted section ·
deferred profile fetch timer cleared on unmount. Two regression tests pin the
single-query detail and the cache behavior (21/21 passing).

### Phase 3 — Categories ✅
The Categories tab became a full shopping experience: a grid of all 15 aisles with live
product counts, each opening a dedicated category page (`/category/:slug`) with a colour
banner, tagline, product count, debounced in-category search across names/brands/
descriptions, eight sort orders, and instant filters (price range, brand, availability,
discounts, organic, new arrivals, featured). Product cards were upgraded to show brand
category, rating, review count, stock status, a favourite heart, and an add-to-cart
stepper — all optimistic with rollback, persisted to new `favourites` and `cart_items`
tables (RLS). The Cart tab now shows the live basket with quantity controls and a
subtotal, and the bottom nav carries a live cart badge. Schema: `supabase/phase3.sql`
(brand/rating/organic/new columns, category restructure, ~23 new products, 2 new tables).
The legacy Pantry aisle was merged into Household (products migrated, category removed),
so the store now carries exactly the 15 requested aisles.
28/28 tests passing.

### Phase 4 — Checkout & Orders ✅
The cart's Checkout button is now real: `/checkout` reviews the order with the saved
delivery address (captured inline if missing), a delivery-slot picker (next two-hour
windows across today/tomorrow with a 90-minute cutoff), and a totals breakdown with a
£2.49 delivery fee waived over £30. Placing an order writes `orders` + `order_items`
price snapshots, records purchases in `purchase_history` (bringing Home's "Recently
bought" rail to life), empties the persisted cart, and lands on a confirmation. The
Orders tab lists history newest-first with status chips, and each order opens a full
snapshot detail with an "Order again" action that re-adds still-available items and
honestly reports any that no longer are. Schema: `supabase/phase4.sql`. 35/35 tests
passing.

### Phase 5 — Payments ✅
Checkout gained a payment step built on a provider-agnostic `paymentService`.
**Cash on delivery** works out of the box: orders record `payment_method`/`payment_status`
snapshots plus a row in the new `payments` ledger (refund-ready with `refunded_amount`
and `provider_payment_id`), and Orders screens show honest chips ("Pay at door",
"Processing payment", "Paid", "Payment failed", "Refunded"). **Card via Stripe** is fully
wired but appears only when configured (mirroring the Supabase setup pattern): the
client mounts Stripe's hosted Payment Element and confirms with the publishable key,
while the secret key lives exclusively in the `create-payment-intent` Edge Function and
settlement (`paid`/`failed`) is written only by the signature-verified `stripe-webhook`
function via the service role — RLS forbids clients from inserting any settled status.
Failed card payments charge nothing, create no order, keep the cart intact, show a
friendly message, and retry from the same button. 39/39 tests passing.

#### Enabling card payments
1. `VITE_STRIPE_PUBLISHABLE_KEY=pk_...` in `.env` (the Card option appears automatically).
2. `supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_WEBHOOK_SECRET=whsec_...`
3. `supabase functions deploy create-payment-intent` and
   `supabase functions deploy stripe-webhook --no-verify-jwt`
4. Add a Stripe webhook for `payment_intent.succeeded` and
   `payment_intent.payment_failed` pointing at the `stripe-webhook` function URL.
> The Stripe path compiles against Stripe's official types and follows their documented
> Payment Element flow, but this workspace has no Stripe keys — run one staging
> transaction after deploying before going live.

### Phase 6 — User Profile & Settings ✅
Opened with an architecture review that extracted three real duplications
(`useCategoryNames` hook, `ErrorBanner` component, `formatDate` utility) and fixed a
latent Phase 1 bug where the theme's follow-the-system behaviour was unreachable —
`ThemeContext` now models the preference (`light`/`dark`/`system`) properly, persisting
only explicit choices. The Profile tab became a full settings screen composed of
`src/components/profile/` sections: account details (name + phone editing), delivery
address management (same profile fields Home and checkout use), a Favourites entry with
live count, a Light/System/Dark appearance control, password change (registration
rules reused), sign out, and a danger zone. The new `/favourites` screen lists hearted
products with stock status and updates live as hearts toggle. Account deletion runs
through a new `delete-account` Edge Function — the caller is identified from their own
verified JWT and the service role deletes the auth user, cascading through every
user-owned table. No schema changes were needed: the profiles table and the cascade
constraints from earlier phases already carry this feature set. 46/46 tests passing.

**Maintenance (post-Phase 6):** the single smoke-test file was split into eight domain
suites under `src/__tests__/` (auth, catalog, cart, favourites, checkout, orders,
payments, profile) sharing a harness in `src/__tests__/helpers/` — `state.ts` holds the
fixtures, mock state, and the mock-module factories (deliberately importing no app code
so each file's hoisted `vi.mock` can load it without cycles), and `render.tsx` holds
`renderApp`/`resetTestState`. Test bodies were extracted verbatim: still exactly 46
tests, all passing, verified across repeated runs.

### Phase 7 — Admin Dashboard ✅
A full admin area at `/admin` behind a real role: membership of the new `admin_users`
table (appointable only via SQL/service role — see `phase7.sql`) is checked by a
security-definer `is_admin()` used in additive RLS policies, so the client guard is
purely UX and the database is the boundary. Non-admins see the ordinary 404. Screens:
Overview (12 live metrics incl. today's orders/revenue, recent orders, low-stock
alerts), Products (search/filter/sort + full CRUD), Categories (create/edit/reorder;
deleting a stocked aisle is refused since the FK cascade would take its products),
Inventory (quick adjustments; a products trigger forces in_stock=false at zero and a
new order_items trigger consumes stock as orders are placed), Orders (all customers,
filters, expandable detail, status updates — delivering a COD order settles its
payment; card settlement stays with the webhook), Customers (profiles now carry emails
via the extended signup trigger), and Analytics (sales, orders by status, top
products/categories). Review extracted BackHeader (3 copies). Admin business logic
lives in `src/lib/adminService.ts`; catalog mutations clear the shopper cache.
58/58 tests passing.

#### Appointing an admin
```sql
insert into public.admin_users (user_id)
select id from auth.users where email = 'you@example.com';
```

### Phase 8A — Notification System ✅
Per-user notification inbox with a clean write model: the ordering client writes its
own "Order placed" row (insert-own RLS); everything cross-user happens server-side —
`orders_notify_status` and `payments_notify_paid` triggers cover confirmed, dispatched,
delivered, cancelled, and card-payment success, and the admin `send_broadcast` function
(definer, `is_admin()`-checked, targeting-ready via an optional user-id array) delivers
promotions and announcements. All server-side writers honour the new per-user
preferences (`notify_orders` / `notify_promos` / `notify_announcements` on profiles),
editable from the Profile via the shared `Toggle`. The Notification Centre at
`/notifications` (bell with unread badge in the Home header, entry row on Profile)
filters All/Unread, highlights unread rows, marks one/all read, deletes, opens related
orders directly, and shows honest empty states. Admins compose broadcasts at
`/admin/notifications` with a live preview rendered exactly like the customer inbox
row. RLS: notifications are own-rows-only for every verb — data cannot leak between
users. The Phase 8A review extracted `AdminSearch` (three identical copies) and
promoted FilterSheet's toggle to `ui/Toggle`. 70/70 tests passing.

### Phase 8B — Promotions & Marketing ✅
Promotions are the existing `offers` model, extended rather than duplicated:
`phase8b.sql` adds a scheduling window (`starts_at`; `ends_at` has existed since
phase2), `featured`, a dates check constraint, and a partial index on the homepage's
hot `active` filter — admin write access already existed via phase7's
`offers_admin_all`, so only administrators manage promotions. `promotionService`
provides validated CRUD (title required, 1–90% discounts, hex colour, end ≥ start),
activate/deactivate, safe delete (`products.offer_id` is ON DELETE SET NULL), and a
`promotionState` helper (live / scheduled / expired / inactive). The admin screen at
`/admin/promotions` lists every campaign with colour swatch, state badge, window,
discount, and featured star, with quick On/Off toggling and a create/edit sheet using
datetime-local scheduling. Shopper-side, `fetchOffers` now applies expiry handling —
only active promotions inside their window reach the Home carousel, featured first —
while the carousel keeps its snap horizontal scrolling and banner click-through to the
promotion's products. The review extracted `AdminSelect` (three duplicated selects) and
adopted `ErrorBanner` in `OfferCarousel` (the one copy Phase 6 missed). 79/79 tests.

### Phase 9 — Final QA, Performance & Security ✅
Production-hardening pass, no new user-facing features. **Performance:** route-level code
splitting — the entire admin dashboard (9 pages + layout) and secondary customer screens
(Checkout, OrderDetail, Orders, Profile, Favourites, Notifications) now lazy-load behind
a Suspense boundary, so ordinary shoppers no longer download admin code; the initial JS
chunk dropped from 498 KB to 431 KB (150 → 134 KB gzipped) with ~50 KB of admin bundles
deferred. **Reliability:** a top-level `ErrorBoundary` replaces the blank-white-page
failure mode with a branded recovery screen (dev-only error logging, a documented hook
for production monitoring). **Accessibility:** the `Sheet` modal now restores focus to
its trigger on close (WCAG 2.4.3); the five remaining inline retry banners were migrated
to the shared `ErrorBanner`, which also gave them the `role="alert"` announcement they
lacked. **Database & security review:** verified — the schema is already thoroughly
indexed (composite PKs cover the cart/favourites/history lookups; `orders` already has a
`(user_id, created_at desc)` index), all queries use the parameterised builder, no
secrets touch the client, and RLS/route protection hold; no changes were needed.
Test suite grew 79 → 90 (error boundary, plus route-protection regression across every
admin route including the Phase 8 additions). All previous tests pass.

### Phase 9A — Performance & Database Review ✅
A focused, measure-first follow-up to the Phase 9 hardening above, adding the two genuine
wins that pass reconfirmed were still open. **Performance:** `fetchProducts` now caches
stable catalogue-wide queries (the four Home rails — featured / popularity / best_selling)
through the existing 45 s TTL + promise-dedup cache, keyed on a serialised query
signature. Interactive queries (searches, filters, category/offer context, out-of-stock
inclusion) are deliberately left uncached so results stay live, and every admin mutation
already clears the cache, so edits still appear immediately. A second Home visit now
issues **zero** product refetches (previously four). **Database:** `phase9a.sql` adds the
four `product_id` foreign-key indexes that were genuinely missing — most importantly
`order_items.product_id` (exercised by the checkout stock-decrement trigger and by every
product edit/delete's referential check), plus the product side of the composite-PK
tables `purchase_history` / `favourites` / `cart_items`, whose `(user_id, product_id)` PK
cannot serve lookups by product alone. This refines the earlier "no database changes
needed" note: the schema was well-indexed on the read path, but the FK-cascade write path
had these gaps. Two further findings — context-driven `ProductCard` re-renders and
non-Latin font subsetting — were measured and consciously left as documented
recommendations rather than risked in a stability phase. Suite 90 → 92. All previous
tests pass.

### Phase 9B — Security, Accessibility & Code Quality ✅
A focused hardening pass across the review areas, implementing only genuine findings.
**Security:** `escapeSearchTerm` — the one place user input is interpolated into a raw
PostgREST or-filter — now also strips the `*` wildcard and backslash alongside the
existing `,()%`, closing a defence-in-depth gap on the product-search path; a new test
feeds a break-out payload and asserts every generated filter clause stays structurally
intact. The wider security review confirmed the model is sound and needed no other
change: every admin write is gated server-side by `is_admin()` RLS (client `isAdmin` is
UX only), all queries use the parameterised builder, RLS is enabled on every table, and
no secrets reach the client. **Accessibility:** the `Sheet` modal gained a proper focus
trap — Tab and Shift+Tab now cycle within the dialog instead of escaping to the obscured
page behind it (WCAG 2.1.2), complementing the existing focus-restoration (2.4.3) — and
its dialog is now associated with its visible heading via `aria-labelledby` rather than a
duplicated `aria-label`. **Code quality:** extracted the byte-identical inline `checkbox`
helper duplicated in ProductFormSheet and PromotionFormSheet into a shared `ui/Checkbox`.
The dead-code and error-handling sweeps came back clean (every data screen already has the
loading/error/empty triad; the ErrorBoundary's only `console` call is DEV-guarded). Suite
92 → 94. All previous tests pass.

A follow-up verification pass corrected one defect in the focus-trap above: the initial
implementation filtered tabbable elements by `offsetParent`, which is `null` for
`position:fixed` subtrees (the sheet lives inside a fixed overlay) and in jsdom — so the
trap collapsed to its empty-list fallback and the first test only exercised that branch.
The visibility check now uses `hidden`/`aria-hidden` instead, and the test was hardened to
assert genuine wrap-around (last→first, first→last) rather than mere containment.

### Phase 9C — Final QA & Production Readiness ✅
A full pre-launch review. Two genuine production issues were found and fixed, both in
deploy-time artifacts rather than application code: **(1)** the setup instructions listed
only the first two migrations (`schema.sql`, `phase2.sql`) — a deployer following them
would build an incomplete database, so the README now lists all nine migrations in
dependency order with a note that there is no `phase6.sql`; **(2)** `.env` was not
git-ignored, so a deployer's real Supabase credentials could have been committed — added
`.env` / `.env.*` (keeping `.env.example`) to `.gitignore`. Everything else was verified
sound: all 23 routes serve, lazy routes have a `Suspense` fallback, every table has RLS
enabled with policy coverage, migrations parse and are correctly ordered (each references
only objects from earlier ones), no hardcoded secrets or debug artifacts, env config
degrades gracefully to the setup notice, and the checkout error path is handled with
user-facing messages. 94/94 tests pass; production build clean (134 KB gzipped entry).
**Assessed production-ready.**

### Phase 10 — Production Release ✅
Prepared the app for deployment as an installable PWA and fixed the genuine production
blockers a static-host launch would hit. **PWA:** added a web app manifest, a
brand-consistent favicon (previously the standalone favicon was purple while the in-app
logo is green; it now matches) plus a maskable icon, and the theme-colour / apple-touch /
manifest links that were missing from `index.html` (which also had no favicon link at all —
a 404 on every load). **SPA routing (blocker):** static hosts would hard-404 on a refresh
of any deep link (`/admin/orders`, `/order/:id`); added rewrite configs for all three
common hosts — `vercel.json`, `netlify.toml`, and `public/_redirects`. **Edge Functions
(blocker):** the two browser-invoked functions (`create-payment-intent`, `delete-account`)
had no CORS preflight handling, so the browser would block payments and account deletion in
production; added `OPTIONS` handling and CORS headers (origin lockable via `ALLOWED_ORIGIN`).
The Stripe webhook correctly keeps signature verification and no CORS. Added
`supabase/config.toml` so per-function `verify_jwt` is declared as code (the webhook must
run with it off) rather than depending on remembered CLI flags. **Docs:** new
[`DEPLOYMENT.md`](./DEPLOYMENT.md) with exact step-by-step manual instructions and a live
smoke test. All changes verified locally: 94/94 tests, clean build, manifest and icons
served correctly. Not deployed or verified against a live Supabase project from the build
environment — that remains a required manual step.
