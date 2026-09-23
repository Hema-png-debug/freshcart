import {
  confirmStripeSession,
  createStripeSession,
  isStripeConfigured,
  type StripeSession,
} from './payments/stripeProvider'
import type { PaymentMethod } from '../types'

/**
 * Provider-agnostic payment layer. Screens talk to this module only; adding a
 * provider (or Apple Pay / Google Pay via Stripe's Payment Request API) means
 * registering it here without touching checkout orchestration.
 *
 * SECURITY: no secrets live in this module or anywhere client-side. Card
 * payments create their PaymentIntent through a Supabase Edge Function that
 * holds the Stripe secret key, card details are collected by Stripe-hosted
 * fields, and settled statuses are written only by the stripe-webhook
 * function using the service role (see supabase/functions/).
 */

export interface PaymentMethodOption {
  method: PaymentMethod
  label: string
  description: string
}

export interface PaymentRequest {
  /** Total in pounds (converted to minor units at the provider boundary). */
  amount: number
  currency: 'gbp'
  userId: string
}

export type PaymentResult =
  | { ok: true; provider: 'cod' | 'stripe'; providerPaymentId: string | null }
  | { ok: false; error: string }

export type CardSession = StripeSession

/** Methods the current build can actually take — never a dummy option. */
export function availablePaymentMethods(): PaymentMethodOption[] {
  const methods: PaymentMethodOption[] = [
    {
      method: 'cod',
      label: 'Cash on delivery',
      description: 'Pay the driver by cash or card at your door.',
    },
  ]
  if (isStripeConfigured()) {
    methods.push({
      method: 'card',
      label: 'Card',
      description: 'Pay securely now with a debit or credit card.',
    })
  }
  return methods
}

/** COD settles at the door: nothing to authorise now, so it succeeds locally. */
export function processCashOnDelivery(): PaymentResult {
  return { ok: true, provider: 'cod', providerPaymentId: null }
}

/**
 * Step 1 of a card payment: create the PaymentIntent (server-side) and an
 * Elements instance. Checkout mounts `session.elements.create('payment')`.
 */
export function startCardPayment(
  request: PaymentRequest,
): Promise<{ session: CardSession } | { error: string }> {
  return createStripeSession(request)
}

/** Step 2 of a card payment: confirm the mounted Payment Element. */
export function confirmCardPayment(session: CardSession): Promise<PaymentResult> {
  return confirmStripeSession(session)
}

/** Turns provider/transport failures into calm, actionable copy. */
export function humanPaymentError(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes('card_declined') || lower.includes('declined')) {
    return 'Your card was declined. You can try again or choose cash on delivery.'
  }
  if (lower.includes('insufficient')) {
    return "That card doesn't have enough funds. Try another card or cash on delivery."
  }
  if (lower.includes('expired')) {
    return 'That card has expired. Please use a different card.'
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return "We couldn't reach the payment service. Check your connection and try again."
  }
  return 'The payment could not be completed. Nothing was charged — please try again.'
}
