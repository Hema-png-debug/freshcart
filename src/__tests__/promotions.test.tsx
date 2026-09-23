/** Promotions (Phase 8B): admin management, validation, banner visibility. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/supabase', async () => (await import('./helpers/state')).supabaseMockModule())
vi.mock('../lib/payments/stripeProvider', async () =>
  (await import('./helpers/state')).stripeMockModule())

import { mockState, fixtures, fakeSession } from './helpers/state'
import { renderApp, resetTestState } from './helpers/render'

beforeEach(resetTestState)

function grantAdmin() {
  mockState.session = fakeSession
  mockState.adminUsers = [{ user_id: 'user-1' }]
}

const offerRow = (o: Record<string, unknown>) =>
  ({
    subtitle: 'Great deals', discount_percent: 20, color: '#157347',
    active: true, starts_at: null, ends_at: null, featured: false, ...o,
  }) as (typeof fixtures.offers)[number]

describe('admin promotion management', () => {
  it('creates a promotion and shows it live in the list', async () => {
    grantAdmin()
    const user = userEvent.setup()
    renderApp('/admin/promotions')

    await user.click(await screen.findByRole('button', { name: /^new$/i }))
    await user.type(screen.getByLabelText(/^title$/i), 'Berry Bonanza')
    await user.type(screen.getByLabelText(/^description$/i), 'All berries reduced')
    const percentInput = screen.getByLabelText(/discount \(%\)/i)
    await user.clear(percentInput)
    await user.type(percentInput, '30')
    await user.click(screen.getByRole('button', { name: /create promotion/i }))

    const list = await screen.findByRole('list', { name: /promotions/i })
    const row = (await within(list).findByText('Berry Bonanza')).closest('li')!
    expect(within(row).getByText('Live')).toBeTruthy()
    expect(within(row).getByText(/−30%/)).toBeTruthy()
    expect(within(row).getByText(/always on/i)).toBeTruthy()
    expect(
      fixtures.offers.some((o) => (o as Record<string, unknown>).slug === 'berry-bonanza'),
    ).toBe(true)
  })

  it('rejects an end date before the start date', async () => {
    grantAdmin()
    const user = userEvent.setup()
    renderApp('/admin/promotions')

    await user.click(await screen.findByRole('button', { name: /^new$/i }))
    await user.type(screen.getByLabelText(/^title$/i), 'Backwards Sale')
    await user.type(screen.getByLabelText(/starts/i), '2026-08-10T09:00')
    await user.type(screen.getByLabelText(/ends/i), '2026-08-01T09:00')
    await user.click(screen.getByRole('button', { name: /create promotion/i }))

    expect(await screen.findByText(/end date cannot be before the start date/i)).toBeTruthy()
    expect(
      fixtures.offers.some((o) => (o as Record<string, unknown>).title === 'Backwards Sale'),
    ).toBe(false)
  })

  it('keeps percentage discounts within sensible limits', async () => {
    grantAdmin()
    const user = userEvent.setup()
    renderApp('/admin/promotions')

    await user.click(await screen.findByRole('button', { name: /^new$/i }))
    await user.type(screen.getByLabelText(/^title$/i), 'Too Generous')
    const percentInput = screen.getByLabelText(/discount \(%\)/i)
    await user.clear(percentInput)
    await user.type(percentInput, '95')
    await user.click(screen.getByRole('button', { name: /create promotion/i }))

    expect(await screen.findByText(/between 1% and 90%/i)).toBeTruthy()
  })

  it('edits a promotion (title and window persist)', async () => {
    grantAdmin()
    const user = userEvent.setup()
    renderApp('/admin/promotions')

    await user.click(await screen.findByRole('button', { name: /edit fresh week/i }))
    const title = screen.getByLabelText(/^title$/i)
    await user.clear(title)
    await user.type(title, 'Fresh Fortnight')
    await user.type(screen.getByLabelText(/ends/i), '2026-08-30T18:00')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText('Fresh Fortnight')).toBeTruthy()
    expect(screen.getByText(/until 30 aug 2026/i)).toBeTruthy()
    const row = fixtures.offers[0] as Record<string, unknown>
    expect(row.title).toBe('Fresh Fortnight')
    expect(String(row.ends_at)).toContain('2026-08-30')
  })

  it('deactivates and reactivates from the list', async () => {
    grantAdmin()
    const user = userEvent.setup()
    renderApp('/admin/promotions')

    await user.click(await screen.findByRole('button', { name: /deactivate fresh week/i }))
    await waitFor(() =>
      expect((fixtures.offers[0] as Record<string, unknown>).active).toBe(false),
    )
    expect(await screen.findByText('Inactive')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /activate fresh week/i }))
    await waitFor(() =>
      expect((fixtures.offers[0] as Record<string, unknown>).active).toBe(true),
    )
    expect(await screen.findByText('Live')).toBeTruthy()
  })

  it('marks expired and scheduled promotions honestly in the list', async () => {
    grantAdmin()
    fixtures.offers.push(
      offerRow({ id: 'o-past', slug: 'gone', title: 'Gone Sale', ends_at: '2026-07-01T00:00:00Z' }),
      offerRow({ id: 'o-next', slug: 'soon', title: 'Soon Sale', starts_at: '2026-09-01T00:00:00Z' }),
    )
    renderApp('/admin/promotions')

    const list = await screen.findByRole('list', { name: /promotions/i })
    expect(within(within(list).getByText('Gone Sale').closest('li')!).getByText('Expired')).toBeTruthy()
    expect(within(within(list).getByText('Soon Sale').closest('li')!).getByText('Scheduled')).toBeTruthy()
  })

  it('deletes a promotion after confirmation', async () => {
    grantAdmin()
    const user = userEvent.setup()
    renderApp('/admin/promotions')

    await user.click(await screen.findByRole('button', { name: /delete fresh week/i }))
    await user.click(await screen.findByRole('button', { name: /delete promotion/i }))
    await waitFor(() => expect(fixtures.offers).toHaveLength(0))
    expect(await screen.findByText(/no promotions yet/i)).toBeTruthy()
  })
})

describe('homepage promotional banners', () => {
  it('shows only active, in-window promotions — featured first', async () => {
    mockState.session = fakeSession
    fixtures.offers.push(
      offerRow({ id: 'o-exp', slug: 'expired-sale', title: 'Expired Sale', ends_at: '2026-07-01T00:00:00Z' }),
      offerRow({ id: 'o-off', slug: 'switched-off', title: 'Switched Off', active: false }),
      offerRow({ id: 'o-feat', slug: 'star-deal', title: 'Star Deal', featured: true }),
    )
    renderApp('/home')

    const rail = await screen.findByRole('region', { name: /today's offers/i })
    expect(within(rail).getByText('Star Deal')).toBeTruthy()
    expect(within(rail).getByText('Fresh Week')).toBeTruthy()
    expect(within(rail).queryByText('Expired Sale')).toBeNull()
    expect(within(rail).queryByText('Switched Off')).toBeNull()

    // Featured leads the rail.
    const links = within(rail).getAllByRole('link')
    expect(links[0]!.textContent).toMatch(/star deal/i)
  })

  it('a banner opens its promotion products', async () => {
    mockState.session = fakeSession
    ;(fixtures.products[0] as Record<string, unknown>).offer_id = 'o1'
    const user = userEvent.setup()
    renderApp('/home')

    const rail = await screen.findByRole('region', { name: /today's offers/i })
    await user.click(within(rail).getByRole('link', { name: /fresh week/i }))
    expect(await screen.findByRole('heading', { name: /fresh week/i })).toBeTruthy()
    expect(await screen.findByText(/gala apples/i)).toBeTruthy()
    expect(screen.queryByText(/bananas/i)).toBeNull()
  })
})
