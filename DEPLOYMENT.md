# FreshCart — Production Deployment Guide

This guide takes FreshCart from source to a live production web app / installable
PWA. It is written to be followed top-to-bottom. Steps marked **[manual]** require
action in a dashboard or CLI that only you can perform; everything in the codebase is
already prepared and verified locally.

> **Honesty note:** the application has **not** been deployed or verified against any
> live Supabase project from the build environment. Everything below the "verified
> locally" line is prepared and correct-by-construction but must be confirmed once
> against your real project.

---

## 0. Prerequisites

- A **Supabase** account and a new **production project** (separate from any dev project).
- A **Stripe** account (test mode is fine to launch; switch to live keys when ready).
- A static host account: **Vercel**, **Netlify**, or **Cloudflare Pages** (any works —
  SPA rewrite configs for all three are included: `vercel.json`, `netlify.toml`,
  `public/_redirects`).
- The **Supabase CLI** installed locally (`npm i -g supabase`) for Edge Functions.
- Node.js 18+.

---

## 1. Create the production Supabase project  **[manual]**

1. In the Supabase dashboard, create a new project. Choose a strong database password
   and a region close to your customers.
2. From **Project Settings → API**, copy the **Project URL** and the **anon public** key.
   You will need them in step 4 and step 6.

---

## 2. Run the database migrations **in order**  **[manual]**

In the Supabase **SQL Editor**, run each file's contents in this exact order. Every file
is idempotent (safe to re-run). There is intentionally **no `phase6.sql`** — Phase 6
needed no schema changes.

| # | File | What it creates |
|---|------|-----------------|
| 1 | `supabase/schema.sql` | `profiles` + signup trigger + RLS |
| 2 | `supabase/phase2.sql` | categories, products, offers, purchase history, address cols, **seed data** |
| 3 | `supabase/phase3.sql` | favourites, cart items, richer product cols, aisle restructure |
| 4 | `supabase/phase4.sql` | orders, order items (price snapshots) |
| 5 | `supabase/phase5.sql` | payments ledger, order payment status |
| 6 | `supabase/phase7.sql` | admin role (`admin_users`, `is_admin()`), stock + triggers, admin RLS |
| 7 | `supabase/phase8.sql` | notifications, preferences, lifecycle triggers, `send_broadcast` |
| 8 | `supabase/phase8b.sql` | promotion scheduling columns + active-offer index |
| 9 | `supabase/phase9a.sql` | `product_id` foreign-key performance indexes |

**Verify:** after running all nine, the **Table Editor** should list `profiles`,
`categories`, `products`, `offers`, `purchase_history`, `favourites`, `cart_items`,
`orders`, `order_items`, `payments`, `admin_users`, and `notifications`. Every one should
show **RLS enabled**.

---

## 3. Appoint your first administrator  **[manual]**

Admins are created only via SQL (never from the client). After you have registered your
own account in the app (step 8), run this in the SQL Editor:

```sql
insert into public.admin_users (user_id)
select id from auth.users where email = 'you@example.com';
```

---

## 4. Configure Authentication  **[manual]**

In **Authentication → URL Configuration**:

- Set **Site URL** to your production frontend origin, e.g. `https://freshcart.example.com`.
- Add these **Redirect URLs**:
  - `https://freshcart.example.com/reset-password` (password-reset flow)
  - `https://freshcart.example.com` (post-auth landing)

In **Authentication → Providers → Email**: keep **Confirm email ON** for production.

---

## 5. Deploy the Edge Functions  **[manual]**

The functions live in `supabase/functions/`. Their per-function JWT settings are declared
in `supabase/config.toml`, so the deploy is reproducible.

```bash
supabase link --project-ref <your-project-ref>

# Secrets (never commit these):
supabase secrets set STRIPE_SECRET_KEY=sk_live_or_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
# Optional: lock CORS to your frontend origin (defaults to * if unset)
supabase secrets set ALLOWED_ORIGIN=https://freshcart.example.com

# Deploy. config.toml sets verify_jwt per function; the webhook is off there.
supabase functions deploy create-payment-intent
supabase functions deploy delete-account
supabase functions deploy stripe-webhook
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically into functions
by the platform — do **not** set them manually.

---

## 6. Configure Stripe  **[manual]**

1. **Stripe Dashboard → Developers → Webhooks → Add endpoint.**
   - URL: `https://<your-project-ref>.functions.supabase.co/stripe-webhook`
   - Events: `payment_intent.succeeded` and `payment_intent.payment_failed`.
   - Copy the **Signing secret** (`whsec_...`) into the `STRIPE_WEBHOOK_SECRET` you set in
     step 5.
2. The **publishable** key is not needed as an env var — the frontend fetches the
   PaymentIntent client secret from the Edge Function. (Card payments only appear in the
   UI when Stripe is reachable; otherwise the app cleanly offers cash on delivery only.)

---

## 7. Deploy the frontend  **[manual]**

Set the two environment variables in your host's dashboard (from step 1):

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
```

Build settings (auto-detected by all three hosts):

- **Build command:** `npm run build`
- **Output directory:** `dist`

SPA deep-link routing is already handled: `vercel.json` (Vercel), `netlify.toml` +
`public/_redirects` (Netlify / Cloudflare Pages) rewrite all paths to `index.html` so a
refresh on `/admin/orders` or a shared `/order/:id` link resolves correctly.

---

## 8. Custom domain, HTTPS/SSL  **[manual]**

- Add your custom domain in the host dashboard and follow its DNS instructions.
- All three hosts provision and renew **HTTPS/SSL automatically** — no manual certs.
- After the domain is live, go back and confirm steps 4 (Auth URLs) and 5
  (`ALLOWED_ORIGIN`) use the final origin.

---

## 9. Storage

**No configuration required.** FreshCart uses emoji product/category tiles by design and
renders initials avatars; it has no Supabase Storage dependency. (The `profiles.avatar_url`
column exists but is unused — a hook for a future avatar-upload feature.)

---

## 10. Final production smoke test  **[manual — required before launch]**

Run these against the live site once, in order:

1. **Register** a new account → you land on Home. Then run step 3 to make it an admin.
2. **Browse** a category, **add** items to the cart, **favourite** one.
3. **Checkout** with **cash on delivery** → order appears in *Orders*; an "Order placed"
   notification appears in the bell.
4. **Checkout** with **card** (Stripe test card `4242 4242 4242 4242`, any future expiry
   / CVC) → payment succeeds; the webhook flips the payment to *paid* and a "Payment
   successful" notification arrives.
5. **Admin → Orders:** advance an order's status → the customer receives the matching
   notification.
6. **Admin → Promotions:** create a live promotion → it appears on Home; expire it → it
   disappears.
7. **Admin → Notifications:** send an announcement → it lands in the inbox (respecting the
   recipient's preferences).
8. **Security spot-check:** sign in as a **non-admin** and visit `/admin` → you get the
   ordinary 404, not the dashboard. Confirm one user cannot see another's orders.
9. **Deep-link check:** hard-refresh on `/admin/orders` and open an `/order/:id` link in a
   new tab → both load (no 404).
10. **PWA check:** on mobile Chrome/Safari, use "Add to Home Screen" → it installs as
    **FreshCart** with the green icon and opens standalone.

---

## Rollback

The frontend hosts keep immutable deploys — roll back to the previous deploy in one click.
Migrations are additive and idempotent; none drop data, so re-running an earlier state is
safe. Edge Functions can be redeployed from any prior commit.
