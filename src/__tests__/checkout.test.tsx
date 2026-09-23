/** Checkout (Phase 4) — split from app.smoke.test.tsx. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/supabase', async () => (await import('./helpers/state')).supabaseMockModule())
vi.mock('../lib/payments/stripeProvider', async () =>
  (await import('./helpers/state')).stripeMockModule())

import { mockState, fakeSession, setProfileAddress } from './helpers/state'
import { renderApp, resetTestState } from './helpers/render'

beforeEach(resetTestState)

describe('checkout', () => {
  it('shows the summary with delivery fee below the free threshold', async () => {
    mockState.session = fakeSession
    setProfileAddress('Home', '12 Rosemary Lane')
    mockState.cartItems = [{ user_id: 'user-1', product_id: 'p1', quantity: 2 }] // £3.60
    const user = userEvent.setup()
    renderApp('/cart')

    await user.click(await screen.findByRole('button', { name: /checkout/i }))
    expect(await screen.findByRole('heading', { name: /checkout/i })).toBeTruthy()
    expect(screen.getByText(/12 rosemary lane/i)).toBeTruthy()
    expect(screen.getByText('£2.49')).toBeTruthy() // delivery fee
    expect(screen.getByText(/free delivery on orders over £30/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /place order · £6\.09/i })).toBeTruthy() // 3.60 + 2.49
  })

  it('waives the delivery fee at or over the threshold', async () => {
    mockState.session = fakeSession
    setProfileAddress('Home', '12 Rosemary Lane')
    mockState.cartItems = [{ user_id: 'user-1', product_id: 'p1', quantity: 17 }] // £30.60
    renderApp('/checkout')

    expect(await screen.findByText('Free')).toBeTruthy()
    expect(screen.getByRole('button', { name: /place order · £30\.60/i })).toBeTruthy()
  })

  it('shows an empty state when there is nothing to check out', async () => {
    mockState.session = fakeSession
    renderApp('/checkout')
    expect(await screen.findByText(/nothing to check out/i)).toBeTruthy()
  })

  it('requires a saved address, capturing one inline', async () => {
    mockState.session = fakeSession
    mockState.cartItems = [{ user_id: 'user-1', product_id: 'p1', quantity: 1 }]
    const user = userEvent.setup()
    renderApp('/checkout')

    expect(await screen.findByText(/where should this order go/i)).toBeTruthy()
    const placeButton = screen.getByRole('button', { name: /place order/i })
    expect(placeButton.hasAttribute('disabled')).toBe(true)

    await user.type(screen.getByLabelText(/address/i), '7 Clementine Court')
    await user.click(screen.getByRole('button', { name: /save address/i }))

    expect(await screen.findByText(/7 clementine court/i)).toBeTruthy()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /place order/i }).hasAttribute('disabled')).toBe(
        false,
      ),
    )
  })

  it('places the order: persists it, records history, empties the cart', async () => {
    mockState.session = fakeSession
    setProfileAddress('Home', '12 Rosemary Lane')
    mockState.cartItems = [
      { user_id: 'user-1', product_id: 'p1', quantity: 2 }, // £3.60
      { user_id: 'user-1', product_id: 'p2', quantity: 1 }, // £0.98
    ]
    const user = userEvent.setup()
    renderApp('/checkout')

    await user.click(await screen.findByRole('button', { name: /place order · £7\.07/i })) // 4.58 + 2.49

    // Confirmation on the order detail screen
    expect(await screen.findByText(/order placed!/i)).toBeTruthy()
    expect(screen.getByText(/12 rosemary lane/i)).toBeTruthy()
    expect(screen.getByText('£7.07')).toBeTruthy()

    // Persistence: order + line snapshots
    expect(mockState.orders).toHaveLength(1)
    expect(mockState.orders[0]).toMatchObject({
      user_id: 'user-1',
      status: 'placed',
      subtotal: 4.58,
      delivery_fee: 2.49,
      total: 7.07,
    })
    expect(mockState.orderItems).toHaveLength(2)
    expect(mockState.orderItems).toContainEqual(
      expect.objectContaining({ product_id: 'p1', name: 'Gala Apples', price: 1.8, quantity: 2 }),
    )

    // purchase_history recorded, cart emptied, badge gone
    expect(mockState.purchaseHistory).toContainEqual(
      expect.objectContaining({ user_id: 'user-1', product_id: 'p1', times_purchased: 1 }),
    )
    expect(mockState.cartItems).toHaveLength(0)
    expect(screen.queryByRole('link', { name: /cart, \d/i })).toBeNull()
  })
})
