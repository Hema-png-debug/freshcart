// Supabase Edge Function: create-payment-intent
//
// Creates a Stripe PaymentIntent for the signed-in user. The Stripe SECRET
// key lives only here (set with: supabase secrets set STRIPE_SECRET_KEY=sk_...).
// Deploy with: supabase functions deploy create-payment-intent
//
// SECURITY NOTES
// - Requires a valid Supabase JWT (verify_jwt is on by default), so anonymous
//   callers cannot mint intents.
// - Amount is validated server-side (positive integer minor units, sane cap);
//   the client can never charge an arbitrary or negative amount.
// - Only the client_secret is returned — never the secret key or full intent.

import Stripe from 'npm:stripe@16'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
})

const MAX_AMOUNT_MINOR = 50_000 // £500 — cap far above any realistic basket

// Browser calls to this function (via supabase.functions.invoke) trigger a
// CORS preflight. Set ALLOWED_ORIGIN to your production frontend origin
// (e.g. https://freshcart.example.com) to lock this down; defaults to '*'.
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  try {
    const { amount, currency } = (await req.json()) as { amount?: number; currency?: string }

    if (
      typeof amount !== 'number' ||
      !Number.isInteger(amount) ||
      amount <= 0 ||
      amount > MAX_AMOUNT_MINOR
    ) {
      return json({ error: 'Invalid amount' }, 400)
    }
    if (currency !== 'gbp') {
      return json({ error: 'Unsupported currency' }, 400)
    }

    const intent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
    })

    return json({ clientSecret: intent.client_secret })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not create the payment.'
    return json({ error: message }, 500)
  }
})
