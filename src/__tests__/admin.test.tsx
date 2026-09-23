/** Admin dashboard (Phase 7): role guard, overview, management screens. */
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
  mockState.adminUsers = [{ user_id: 'user-1' }]
}

function seedOrders() {
  const today = new Date().toISOString()
  mockState.orders = [
    {
      id: 'order-1', user_id: 'user-1', address_label: 'Home', address_line: '12 Rosemary Lane',
      delivery_slot: 'Today, 4 pm–6 pm', status: 'placed', subtotal: 4.58, delivery_fee: 2.49,
      total: 7.07, payment_method: 'cod', payment_status: 'pending', created_at: today,
    },
    {
      id: 'order-2', user_id: 'user-1', address_label: 'Home', address_line: '12 Rosemary Lane',
      delivery_slot: 'Tomorrow, 10 am–12 pm', status: 'delivered', subtotal: 30.6,
      delivery_fee: 0, total: 30.6, payment_method: 'card', payment_status: 'paid',
      created_at: '2026-07-10T10:00:00Z',
    },
  ]
  mockState.orderItems = [
    { id: 'oi-1', order_id: 'order-1', product_id: 'p1', name: 'Gala Apples', emoji: 'A', unit: 'each', price: 1.8, quantity: 2 },
    { id: 'oi-2', order_id: 'order-2', product_id: 'p2', name: 'Bananas', emoji: 'B', unit: 'each', price: 0.98, quantity: 31 },
  ]
  mockState.payments = [
    { id: 'pay-1', order_id: 'order-1', user_id: 'user-1', provider: 'cod', status: 'pending', amount: 7.07, currency: 'gbp', provider_payment_id: null },
    { id: 'pay-2', order_id: 'order-2', user_id: 'user-1', provider: 'stripe', status: 'paid', amount: 30.6, currency: 'gbp', provider_payment_id: 'pi_1' },
  ]
}

describe('admin access control', () => {
  it('shows the ordinary 404 to signed-in non-admins', async () => {
    mockState.session = fakeSession
    renderApp('/admin')
    expect(await screen.findByText(/page not found/i)).toBeTruthy()
    expect(screen.queryByText(/freshcart admin/i)).toBeNull()
  })

  it('hides the dashboard entry from non-admin profiles', async () => {
    mockState.session = fakeSession
    renderApp('/profile')
    await screen.findByText('Alex Fresher')
    expect(screen.queryByText(/admin dashboard/i)).toBeNull()
  })

  // Every admin route — including the lazily-loaded Phase 8 additions — must
  // 404 for a signed-in non-admin, not just /admin.
  it.each([
    '/admin/products',
    '/admin/categories',
    '/admin/inventory',
    '/admin/orders',
    '/admin/customers',
    '/admin/analytics',
    '/admin/promotions',
    '/admin/notifications',
  ])('protects %s from non-admins', async (path) => {
    mockState.session = fakeSession
    renderApp(path)
    expect(await screen.findByText(/page not found/i)).toBeTruthy()
    expect(screen.queryByText(/freshcart admin/i)).toBeNull()
  })

  it('sends unauthenticated visitors to login, not the dashboard', async () => {
    mockState.session = null
    renderApp('/admin/promotions')
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeTruthy()
  })

  it('lets admins in from the profile entry', async () => {
    mockState.session = fakeSession
    grantAdmin()
    const user = userEvent.setup()
    renderApp('/profile')
    await user.click(await screen.findByRole('link', { name: /admin dashboard/i }))
    expect(await screen.findByText(/freshcart admin/i)).toBeTruthy()
    expect(await screen.findByRole('heading', { name: /overview/i })).toBeTruthy()
  })
})

describe('admin overview', () => {
  it('computes the store metrics from live data', async () => {
    mockState.session = fakeSession
    grantAdmin()
    seedOrders()
    // Make Bananas low on stock for the low-stock list.
    ;(fixtures.products[1] as Record<string, unknown>).stock_quantity = 3
    renderApp('/admin')

    const metric = async (label: RegExp) => {
      const tile = (await screen.findByText(label)).closest('div')!
      return tile.textContent ?? ''
    }
    expect(await metric(/total products/i)).toContain('5')
    expect(await metric(/total categories/i)).toContain('3')
    expect(await metric(/total customers/i)).toContain('1')
    expect(await metric(/total orders/i)).toContain('2')
    expect(await metric(/pending orders/i)).toContain('1')
    expect(await metric(/completed orders/i)).toContain('1')
    expect(await metric(/^revenue$/i)).toContain('£37.67') // 7.07 + 30.60
    expect(await metric(/today's orders/i)).toContain('1')
    expect(await metric(/today's revenue/i)).toContain('£7.07')
    expect(await metric(/^low stock$/i)).toContain('1')
    expect(await metric(/out of stock/i)).toContain('1') // Victoria Plums

    // Recent orders + low-stock lists render real rows.
    expect(screen.getByText('#order-1')).toBeTruthy()
    const lowSection = screen.getByRole('region', { name: /low stock products/i })
    expect(within(lowSection).getByText(/bananas/i)).toBeTruthy()
    expect(within(lowSection).getByText(/3 left/i)).toBeTruthy()
  })
})

describe('admin products', () => {
  it('searches, creates, and deletes products', async () => {
    mockState.session = fakeSession
    grantAdmin()
    const user = userEvent.setup()
    renderApp('/admin/products')

    // Search narrows by brand.
    await screen.findByText(/gala apples/i)
    await user.type(screen.getByRole('searchbox', { name: /search products/i }), 'sungrove')
    await waitFor(() => expect(screen.queryByText(/gala apples/i)).toBeNull())
    expect(screen.getByText(/bananas/i)).toBeTruthy()
    await user.clear(screen.getByRole('searchbox', { name: /search products/i }))

    // Create.
    await user.click(screen.getByRole('button', { name: /add product/i }))
    await user.type(screen.getByLabelText(/^name$/i), 'Kiwi Fruit')
    await user.type(screen.getByLabelText(/emoji/i), '🥝')
    await user.type(screen.getByLabelText(/^unit$/i), '4 pack')
    await user.type(screen.getByLabelText(/^brand$/i), 'Sungrove')
    await user.type(screen.getByLabelText(/price \(£\)$/i), '1.65')
    await user.clear(screen.getByLabelText(/stock quantity/i))
    await user.type(screen.getByLabelText(/stock quantity/i), '12')
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /add product/i }))

    expect(await screen.findByText(/kiwi fruit/i)).toBeTruthy()
    expect(fixtures.products.some((p) => (p as Record<string, unknown>).slug === 'kiwi-fruit')).toBe(true)

    // Delete it again (confirm sheet).
    await user.click(screen.getByRole('button', { name: /delete kiwi fruit/i }))
    await user.click(await screen.findByRole('button', { name: /delete product/i }))
    await waitFor(() => expect(screen.queryByText(/kiwi fruit/i)).toBeNull())
    expect(fixtures.products.some((p) => (p as Record<string, unknown>).slug === 'kiwi-fruit')).toBe(false)
  })

  it('edits a price and shows it to shoppers immediately', async () => {
    mockState.session = fakeSession
    grantAdmin()
    const user = userEvent.setup()
    renderApp('/admin/products')

    await screen.findByText(/gala apples/i)
    await user.click(screen.getByRole('button', { name: /edit gala apples/i }))
    const priceInput = screen.getByLabelText(/price \(£\)$/i)
    await user.clear(priceInput)
    await user.type(priceInput, '2.10')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() =>
      expect(
        (fixtures.products[0] as Record<string, unknown>).price,
      ).toBe(2.1),
    )
    expect(await screen.findByText(/£2\.10/)).toBeTruthy()
  })
})

describe('admin categories', () => {
  it('creates, reorders, and refuses to delete a stocked aisle', async () => {
    mockState.session = fakeSession
    grantAdmin()
    const user = userEvent.setup()
    renderApp('/admin/categories')

    const list = await screen.findByRole('list', { name: /categories/i })
    // Create an empty aisle.
    await user.click(screen.getByRole('button', { name: /^new$/i }))
    await user.type(screen.getByLabelText(/^name$/i), 'Flowers')
    await user.type(screen.getByLabelText(/emoji/i), '💐')
    await user.click(screen.getByRole('button', { name: /create category/i }))
    expect(await within(list).findByText(/flowers/i)).toBeTruthy()
    expect(within(list).getByText(/0 products/i)).toBeTruthy()

    // Reorder: move Vegetables above Fruits.
    await user.click(screen.getByRole('button', { name: /move vegetables up/i }))
    await waitFor(() => {
      const names = within(screen.getByRole('list', { name: /categories/i }))
        .getAllByText(/^(Fruits|Vegetables)$/)
        .map((el) => el.textContent)
      expect(names.indexOf('Vegetables')).toBeLessThan(names.indexOf('Fruits'))
    })

    // Deleting a stocked aisle is refused with an explanation.
    await user.click(screen.getByRole('button', { name: /delete fruits/i }))
    expect(await screen.findByText(/still has 3 products/i)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /delete category/i }))
    expect(await screen.findByText(/move or delete its products first/i)).toBeTruthy()
    expect(fixtures.categories.some((c) => (c as Record<string, unknown>).slug === 'fruits')).toBe(true)

    // The empty aisle deletes cleanly.
    await user.click(screen.getByRole('button', { name: /delete flowers/i }))
    await user.click(await screen.findByRole('button', { name: /delete category/i }))
    await waitFor(() =>
      expect(fixtures.categories.some((c) => (c as Record<string, unknown>).slug === 'flowers')).toBe(false),
    )
  })
})

describe('admin inventory', () => {
  it('adjusts stock and zero forces unavailability (trigger behaviour)', async () => {
    mockState.session = fakeSession
    grantAdmin()
    ;(fixtures.products[1] as Record<string, unknown>).stock_quantity = 1 // Bananas
    const user = userEvent.setup()
    renderApp('/admin/inventory')

    await user.click(await screen.findByRole('button', { name: /decrease stock of bananas/i }))
    await waitFor(() => {
      const bananas = fixtures.products[1] as Record<string, unknown>
      expect(bananas.stock_quantity).toBe(0)
      expect(bananas.in_stock).toBe(false)
    })
    // Two out-of-stock now: Victoria Plums + Bananas.
    expect(await screen.findByText(/2 out of stock/i)).toBeTruthy()
  })
})

describe('admin orders', () => {
  it('lists every customer order with payment status and filters by status', async () => {
    mockState.session = fakeSession
    grantAdmin()
    seedOrders()
    const user = userEvent.setup()
    renderApp('/admin/orders')

    expect(await screen.findByText('#order-1')).toBeTruthy()
    expect(screen.getByText('#order-2')).toBeTruthy()
    const list = screen.getByRole('list', { name: /all orders/i })
    expect(within(list).getByText('Pay at door')).toBeTruthy()
    expect(within(list).getByText('Paid')).toBeTruthy()

    await user.selectOptions(screen.getByRole('combobox', { name: /status/i }), 'delivered')
    await waitFor(() => expect(screen.queryByText('#order-1')).toBeNull())
    expect(screen.getByText('#order-2')).toBeTruthy()
  })

  it('marks a COD order delivered and settles its payment', async () => {
    mockState.session = fakeSession
    grantAdmin()
    seedOrders()
    const user = userEvent.setup()
    renderApp('/admin/orders')

    await user.click(await screen.findByRole('button', { name: /order order-1 details/i }))
    await user.selectOptions(
      screen.getByRole('combobox', { name: /status of order order-1/i }),
      'delivered',
    )

    await waitFor(() => {
      expect(mockState.orders[0]).toMatchObject({ status: 'delivered', payment_status: 'paid' })
      expect(mockState.payments[0]).toMatchObject({ status: 'paid' })
    })
  })
})

describe('admin customers', () => {
  it('lists customers with contact, address, and order totals; search works', async () => {
    mockState.session = fakeSession
    grantAdmin()
    seedOrders()
    Object.assign(fixtures.profiles[0]!, { address_label: 'Home', address_line: '12 Rosemary Lane' })
    const user = userEvent.setup()
    renderApp('/admin/customers')

    expect(await screen.findByText('Alex Fresher')).toBeTruthy()
    expect(screen.getByText(/alex@example\.com/)).toBeTruthy()
    expect(screen.getByText(/home · 12 rosemary lane/i)).toBeTruthy()
    expect(screen.getByText(/2 orders/i)).toBeTruthy()
    expect(screen.getByText('£37.67')).toBeTruthy()

    await user.type(screen.getByRole('searchbox', { name: /search customers/i }), 'nobody')
    expect(await screen.findByText(/no customers match/i)).toBeTruthy()
  })
})

describe('admin analytics', () => {
  it('shows sales, orders by status, and top sellers', async () => {
    mockState.session = fakeSession
    grantAdmin()
    seedOrders()
    renderApp('/admin/analytics')

    expect(await screen.findByText('£37.67')).toBeTruthy()
    const statusSection = screen.getByRole('region', { name: /orders by status/i })
    expect(within(statusSection).getByText('Placed')).toBeTruthy()
    expect(within(statusSection).getByText('Delivered')).toBeTruthy()

    const popular = screen.getByRole('region', { name: /most popular products/i })
    const names = within(popular).getAllByText(/Semi-Skimmed Milk|Bananas/)
    // Milk (3200 sold) outranks Bananas (2310).
    expect(names[0]!.textContent).toMatch(/semi-skimmed milk/i)

    const cats = screen.getByRole('region', { name: /top-selling categories/i })
    expect(within(cats).getByText('Fruits')).toBeTruthy()
  })
})

describe('admin dialog accessibility', () => {
  it('traps Tab focus within an open form sheet and restores it on close', async () => {
    mockState.session = fakeSession
    grantAdmin()
    const user = userEvent.setup()
    renderApp('/admin/categories')

    const newButton = await screen.findByRole('button', { name: /^new$/i })
    await user.click(newButton)

    const dialog = await screen.findByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    // The dialog is labelled by its visible heading.
    expect(dialog.getAttribute('aria-labelledby')).toBe('sheet-title')

    // Identify the real first and last tabbable elements in the dialog.
    const tabbables = Array.from(
      dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea'),
    )
    expect(tabbables.length).toBeGreaterThan(1)
    const first = tabbables[0]!
    const last = tabbables[tabbables.length - 1]!

    // From the last element, Tab must wrap to the first (not escape the page).
    last.focus()
    await user.tab()
    expect(document.activeElement).toBe(first)

    // From the first, Shift+Tab must wrap back to the last.
    first.focus()
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(last)

    // And focus never leaves the dialog while cycling forward.
    for (let i = 0; i < tabbables.length + 2; i += 1) {
      await user.tab()
      expect(dialog.contains(document.activeElement)).toBe(true)
    }

    // Escape closes and returns focus to the trigger (WCAG 2.4.3).
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(newButton)
  })
})
