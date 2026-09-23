/** Payments (Phase 5) — split from app.smoke.test.tsx. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/supabase', async () => (await import('./helpers/state')).supabaseMockModule())
vi.mock('../lib/payments/stripeProvider', async () =>
  (await import('./helpers/state')).stripeMockModule())

import { mockState, fakeSession, setProfileAddress } from './helpers/state'
import { renderApp, resetTestState } from './helpers/render'

beforeEach(resetTestState)

describe('payments', () => {
  it('defaults to cash on delivery and hides Card when Stripe is unconfigured', async () => {
    mockState.session = fakeSession
    setProfileAddress('Home', '12 Rosemary Lane')
    mockState.cartItems = [{ user_id: 'user-1', product_id: 'p1', quantity: 2 }]
    renderApp('/checkout')

    const cod = await screen.findByRole('radio', { name: /cash on delivery/i })
    expect(cod.getAttribute('aria-checked')).toBe('true')
    expect(screen.queryByRole('radio', { name: /^card/i })).toBeNull()
  })

  it('records a COD order as pending with a ledger row, shown as "Pay at door"', async () => {
    mockState.session = fakeSession
    setProfileAddress('Home', '12 Rosemary Lane')
    mockState.cartItems = [{ user_id: 'user-1', product_id: 'p1', quantity: 2 }] // £3.60 + £2.49
    const user = userEvent.setup()
    renderApp('/checkout')

    await user.click(await screen.findByRole('button', { name: /place order · £6\.09/i }))

    expect(await screen.findByText(/order placed!/i)).toBeTruthy()
    expect(screen.getByText('Pay at door')).toBeTruthy()

    expect(mockState.orders[0]).toMatchObject({ payment_method: 'cod', payment_status: 'pending' })
    expect(mockState.payments).toHaveLength(1)
    expect(mockState.payments[0]).toMatchObject({
      user_id: 'user-1',
      provider: 'cod',
      status: 'pending',
      amount: 6.09,
      currency: 'gbp',
      provider_payment_id: null,
    })
  })

  it('takes a card payment when configured and records it as processing', async () => {
    mockState.session = fakeSession
    mockState.stripeConfigured = true
    mockState.stripeConfirmQueue = [{ ok: true, id: 'pi_test_1' }]
    setProfileAddress('Home', '12 Rosemary Lane')
    mockState.cartItems = [{ user_id: 'user-1', product_id: 'p1', quantity: 2 }]
    const user = userEvent.setup()
    renderApp('/checkout')

    await user.click(await screen.findByRole('radio', { name: /^card/i }))
    await user.click(screen.getByRole('button', { name: /pay & place order · £6\.09/i }))

    expect(await screen.findByText(/order placed!/i)).toBeTruthy()
    expect(screen.getByText('Processing payment')).toBeTruthy()

    expect(mockState.orders[0]).toMatchObject({
      payment_method: 'card',
      payment_status: 'processing',
    })
    expect(mockState.payments[0]).toMatchObject({
      provider: 'stripe',
      status: 'processing',
      provider_payment_id: 'pi_test_1',
      amount: 6.09,
    })
  })

  it('handles a declined card with a friendly message and a working retry', async () => {
    mockState.session = fakeSession
    mockState.stripeConfigured = true
    mockState.stripeConfirmQueue = [
      { ok: false, error: 'card_declined' },
      { ok: true, id: 'pi_retry_ok' },
    ]
    setProfileAddress('Home', '12 Rosemary Lane')
    mockState.cartItems = [{ user_id: 'user-1', product_id: 'p1', quantity: 2 }]
    const user = userEvent.setup()
    renderApp('/checkout')

    await user.click(await screen.findByRole('radio', { name: /^card/i }))
    const payButton = screen.getByRole('button', { name: /pay & place order/i })
    await user.click(payButton)

    // Friendly failure: no charge, no order, cart untouched.
    expect(
      await screen.findByText(/your card was declined\. you can try again or choose cash/i),
    ).toBeTruthy()
    expect(mockState.orders).toHaveLength(0)
    expect(mockState.payments).toHaveLength(0)
    expect(mockState.cartItems).toHaveLength(1)

    // Retry with the same button succeeds and creates exactly one order.
    await user.click(payButton)
    expect(await screen.findByText(/order placed!/i)).toBeTruthy()
    expect(mockState.orders).toHaveLength(1)
    expect(mockState.payments[0]).toMatchObject({ provider_payment_id: 'pi_retry_ok' })
  })
})
