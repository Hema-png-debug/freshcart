/** Order history and reordering (Phase 4) — split from app.smoke.test.tsx. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/supabase', async () => (await import('./helpers/state')).supabaseMockModule())
vi.mock('../lib/payments/stripeProvider', async () =>
  (await import('./helpers/state')).stripeMockModule())

import { mockState, fakeSession } from './helpers/state'
import { renderApp, resetTestState } from './helpers/render'

beforeEach(resetTestState)

describe('orders history', () => {
  const seedOrder = () => {
    mockState.orders = [
      {
        id: 'order-1', user_id: 'user-1', address_label: 'Home',
        address_line: '12 Rosemary Lane', delivery_slot: 'Tomorrow, 10 am–12 pm',
        status: 'placed', subtotal: 4.58, delivery_fee: 2.49, total: 7.07,
        payment_method: 'cod', payment_status: 'pending',
        created_at: '2026-07-17T10:00:00Z',
      },
    ]
    mockState.orderItems = [
      { id: 'oi-1', order_id: 'order-1', product_id: 'p1', name: 'Gala Apples', emoji: 'A', unit: 'each', price: 1.8, quantity: 2 },
      { id: 'oi-2', order_id: 'order-1', product_id: 'p5', name: 'Victoria Plums', emoji: 'P', unit: 'each', price: 2.5, quantity: 1 },
    ]
  }

  it('lists past orders and opens the snapshot detail', async () => {
    mockState.session = fakeSession
    seedOrder()
    const user = userEvent.setup()
    renderApp('/orders')

    const link = await screen.findByRole('link', { name: /order from 17 jul 2026, £7\.07/i })
    expect(within(link).getByText('Placed')).toBeTruthy()
    await user.click(link)

    expect(await screen.findByText(/order #order-1/i)).toBeTruthy()
    expect(screen.getByText(/gala apples/i)).toBeTruthy()
    expect(screen.getByText(/£1\.80 × 2/i)).toBeTruthy()
    expect(screen.getByText('£7.07')).toBeTruthy()
    expect(screen.getByText(/tomorrow, 10 am–12 pm/i)).toBeTruthy()
  })

  it('reorders available items and reports unavailable ones', async () => {
    mockState.session = fakeSession
    seedOrder() // p1 in stock, p5 out of stock
    const user = userEvent.setup()
    renderApp('/order/order-1')

    await user.click(await screen.findByRole('button', { name: /order again/i }))

    // p1 added (qty 2), p5 skipped with an honest note
    expect(await screen.findByText(/added 1 of 2 items — 1 no longer available/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /cart, 2 items/i })).toBeTruthy()
    expect(mockState.cartItems).toContainEqual(
      expect.objectContaining({ product_id: 'p1', quantity: 2 }),
    )
  })
})
