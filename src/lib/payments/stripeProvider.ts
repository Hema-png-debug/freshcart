import type { Stripe, StripeElements } from '@stripe/stripe-js'
import { supabase } from '../supabase'
import type { PaymentRequest, PaymentResult } from '../paymentService'

/**
 * Stripe card adapter.
 *
 * Flow (secrets never touch the client):
 *   1. POST to the `create-payment-intent` Edge Function (the Stripe secret
 *      key lives there) → receive a PaymentIntent client_secret.
 *   2. Mount Stripe's Payment Element (Stripe-hosted iframe collects the card
 *      details — raw card numbers never pass through this app's code).
 *   3. Confirm in the browser with the publishable key.
 *   4. The `stripe-webhook` Edge Function (service role) marks the payment
 *      paid/failed server-side; the client's own insert is only 'processing'.
 *
 * The adapter is inert until VITE_STRIPE_PUBLISHABLE_KEY is set, and
 * stripe-js is imported lazily so unconfigured builds load none of it.
 */

const publishableKey: string | undefined = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as
  | string
  | undefined

export function isStripeConfigured(): boolean {
  return Boolean(publishableKey && supabase)
}

/** A prepared card payment: intent created, Elements ready to mount. */
export interface StripeSession {
  stripe: Stripe
  elements: StripeElements
}

interface IntentResponse {
  clientSecret?: string
  error?: string
}

async function createPaymentIntent(request: PaymentRequest): Promise<IntentResponse> {
  if (!supabase) return { error: 'Supabase is not configured.' }
  const { data, error } = await supabase.functions.invoke<IntentResponse>(
    'create-payment-intent',
    {
      body: {
        // Minor units decided once here; the Edge Function re-validates.
        amount: Math.round(request.amount * 100),
        currency: request.currency,
      },
    },
  )
  if (error) return { error: error.message }
  return data ?? { error: 'Empty response from payment service.' }
}

/**
 * Creates the PaymentIntent and an Elements instance for checkout to mount
 * (`session.elements.create('payment')` into a container).
 */
export async function createStripeSession(
  request: PaymentRequest,
): Promise<{ session: StripeSession } | { error: string }> {
  if (!isStripeConfigured()) return { error: 'Card payments are not configured.' }
  try {
    const intent = await createPaymentIntent(request)
    if (!intent.clientSecret) {
      return { error: intent.error ?? 'Could not start the card payment.' }
    }
    const { loadStripe } = await import('@stripe/stripe-js')
    const stripe = await loadStripe(publishableKey!)
    if (!stripe) return { error: 'Could not load the payment library.' }
    const elements = stripe.elements({ clientSecret: intent.clientSecret })
    return { session: { stripe, elements } }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not start the card payment.' }
  }
}

/** Confirms the prepared payment; stays on the page unless the bank redirects. */
export async function confirmStripeSession(session: StripeSession): Promise<PaymentResult> {
  try {
    const result = await session.stripe.confirmPayment({
      elements: session.elements,
      redirect: 'if_required',
    })
    if (result.error) {
      return { ok: false, error: result.error.message ?? result.error.code ?? 'Payment failed.' }
    }
    return {
      ok: true,
      provider: 'stripe',
      providerPaymentId: result.paymentIntent?.id ?? null,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Payment failed.' }
  }
}
