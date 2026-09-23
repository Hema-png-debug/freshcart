/** Cart (Phase 3) — split from app.smoke.test.tsx. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/supabase', async () => (await import('./helpers/state')).supabaseMockModule())
vi.mock('../lib/payments/stripeProvider', async () =>
  (await import('./helpers/state')).stripeMockModule())

import { mockState, fakeSession } from './helpers/state'
import { renderApp, resetTestState } from './helpers/render'

beforeEach(resetTestState)

describe('cart actions', () => {
  it('adds, increments, and removes instantly, with a live nav badge', async () => {
    mockState.session = fakeSession
    const user = userEvent.setup()
    renderApp('/category/fruits')
    await screen.findByText(/gala apples/i)

    await user.click(screen.getByRole('button', { name: /add gala apples to cart/i }))
    expect(await screen.findByRole('link', { name: /cart, 1 items/i })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /increase quantity of gala apples/i }))
    expect(await screen.findByRole('link', { name: /cart, 2 items/i })).toBeTruthy()
    // Optimistic write persisted to the mocked table:
    expect(mockState.cartItems).toHaveLength(1)
    expect(mockState.cartItems[0]).toMatchObject({ product_id: 'p1', quantity: 2 })

    // Cart tab shows the line with subtotal
    await user.click(screen.getByRole('link', { name: /cart, 2 items/i }))
    expect(await screen.findByText(/2 items/i)).toBeTruthy()
    expect(screen.getAllByText('£3.60').length).toBeGreaterThan(0) // line total & subtotal, 2 × £1.80

    // Remove → back to the honest empty state
    await user.click(screen.getByRole('button', { name: /remove gala apples from cart/i }))
    expect(await screen.findByText(/your cart is empty/i)).toBeTruthy()
    expect(mockState.cartItems).toHaveLength(0)
  })

  it('restores the basket from Supabase on load', async () => {
    mockState.session = fakeSession
    mockState.cartItems = [{ user_id: 'user-1', product_id: 'p2', quantity: 3 }]
    renderApp('/cart')
    expect(await screen.findByText(/bananas/i)).toBeTruthy()
    expect((await screen.findAllByText('£2.94')).length).toBeGreaterThan(0) // 3 × £0.98
  })
})
