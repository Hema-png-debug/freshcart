// Supabase Edge Function: stripe-webhook
//
// Receives Stripe webhook events and settles payments server-side. This is
// the ONLY writer of 'paid' / 'failed' statuses — clients can insert payments
// only as pending/processing (enforced by RLS in phase5.sql), so a malicious
// client can never mark its own payment as paid.
//
// Setup:
//   supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_WEBHOOK_SECRET=whsec_...
//   supabase functions deploy stripe-webhook --no-verify-jwt
//   (Stripe calls this endpoint directly; authenticity comes from the
//    signature check below, not a Supabase JWT.)
//   Then point a Stripe webhook at it for payment_intent.succeeded and
//   payment_intent.payment_failed.

import Stripe from 'npm:stripe@16'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
})

// Service role bypasses RLS — that is the point: settlement is server-only.
const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
  if (!signature || !secret) {
    return new Response('Missing signature', { status: 400 })
  }

  let event: Stripe.Event
  try {
    const body = await req.text()
    event = await stripe.webhooks.constructEventAsync(body, signature, secret)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  if (
    event.type === 'payment_intent.succeeded' ||
    event.type === 'payment_intent.payment_failed'
  ) {
    const intent = event.data.object as Stripe.PaymentIntent
    const paid = event.type === 'payment_intent.succeeded'
    const status = paid ? 'paid' : 'failed'
    const errorMessage = paid ? null : (intent.last_payment_error?.message ?? 'Payment failed')

    const { data: payment } = await admin
      .from('payments')
      .update({ status, error_message: errorMessage })
      .eq('provider_payment_id', intent.id)
      .select('order_id')
      .maybeSingle()

    if (payment?.order_id) {
      await admin
        .from('orders')
        .update({ payment_status: status })
        .eq('id', payment.order_id)
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
