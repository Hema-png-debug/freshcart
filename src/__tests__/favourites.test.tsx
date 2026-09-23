/** Favourites: card toggle (Phase 3) and screen (Phase 6) — split from app.smoke.test.tsx. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/supabase', async () => (await import('./helpers/state')).supabaseMockModule())
vi.mock('../lib/payments/stripeProvider', async () =>
  (await import('./helpers/state')).stripeMockModule())

import { mockState, fakeSession } from './helpers/state'
import { renderApp, resetTestState } from './helpers/render'

beforeEach(resetTestState)

describe('favourites', () => {
  it('toggles instantly and persists per user', async () => {
    mockState.session = fakeSession
    const user = userEvent.setup()
    renderApp('/category/fruits')
    await screen.findByText(/gala apples/i)

    const heart = screen.getByRole('button', { name: /add gala apples to favourites/i })
    await user.click(heart)
    expect(
      await screen.findByRole('button', { name: /remove gala apples from favourites/i }),
    ).toBeTruthy()
    await waitFor(() =>
      expect(mockState.favourites).toContainEqual(
        expect.objectContaining({ user_id: 'user-1', product_id: 'p1' }),
      ),
    )

    await user.click(screen.getByRole('button', { name: /remove gala apples from favourites/i }))
    expect(
      await screen.findByRole('button', { name: /add gala apples to favourites/i }),
    ).toBeTruthy()
    await waitFor(() => expect(mockState.favourites).toHaveLength(0))
  })
})

describe('favourites screen', () => {
  it('lists hearted items (with stock status), updates live, empties honestly', async () => {
    mockState.session = fakeSession
    mockState.favourites = [
      { user_id: 'user-1', product_id: 'p1' },
      { user_id: 'user-1', product_id: 'p5' },
    ]
    const user = userEvent.setup()
    renderApp('/profile')

    // Entry point shows the live count.
    const favLink = await screen.findByRole('link', { name: /favourites/i })
    expect(await within(favLink).findByText(/2 saved items/i)).toBeTruthy()
    await user.click(favLink)
    expect(await screen.findByText(/gala apples/i)).toBeTruthy()
    expect(screen.getByText(/victoria plums/i)).toBeTruthy()
    expect(screen.getByText(/out of stock/i)).toBeTruthy()

    // Unhearting removes the card without a refresh.
    await user.click(screen.getByRole('button', { name: /remove gala apples from favourites/i }))
    await waitFor(() => expect(screen.queryByText(/gala apples/i)).toBeNull())

    await user.click(screen.getByRole('button', { name: /remove victoria plums from favourites/i }))
    expect(await screen.findByText(/no favourites yet/i)).toBeTruthy()
  })
})
