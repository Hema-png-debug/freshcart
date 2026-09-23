/** Notifications (Phase 8A): inbox, preferences, lifecycle triggers, admin broadcasts. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/supabase', async () => (await import('./helpers/state')).supabaseMockModule())
vi.mock('../lib/payments/stripeProvider', async () =>
  (await import('./helpers/state')).stripeMockModule())

import { mockState, fixtures, fakeSession, setProfileAddress } from './helpers/state'
import { renderApp, resetTestState } from './helpers/render'

beforeEach(resetTestState)

function seedNotifications() {
  mockState.notifications = [
    {
      id: 'n-old', user_id: 'user-1', type: 'order_status', title: 'Order delivered',
      message: 'Order #order-99 has been delivered. Enjoy!', order_id: 'order-99',
      read: true, created_at: '2026-07-10T09:00:00Z',
    },
    {
      id: 'n-new', user_id: 'user-1', type: 'announcement', title: 'New delivery hours',
      message: 'We now deliver until 10 pm.', order_id: null,
      read: false, created_at: '2026-07-18T09:00:00Z',
    },
  ]
}

function seedDeliveredOrder() {
  mockState.orders = [
    {
      id: 'order-99', user_id: 'user-1', address_label: 'Home', address_line: '12 Rosemary Lane',
      delivery_slot: 'Today, 4 pm–6 pm', status: 'delivered', subtotal: 10, delivery_fee: 0,
      total: 10, payment_method: 'cod', payment_status: 'paid', created_at: '2026-07-10T08:00:00Z',
    },
  ]
  mockState.orderItems = [
    { id: 'oi-99', order_id: 'order-99', product_id: 'p1', name: 'Gala Apples', emoji: 'A', unit: 'each', price: 5, quantity: 2 },
  ]
}

describe('notification creation', () => {
  it('placing an order writes an "Order placed" notification', async () => {
    mockState.session = fakeSession
    setProfileAddress('Home', '12 Rosemary Lane')
    mockState.cartItems = [{ user_id: 'user-1', product_id: 'p1', quantity: 2 }]
    const user = userEvent.setup()
    renderApp('/checkout')

    await user.click(await screen.findByRole('button', { name: /place order/i }))
    await screen.findByText(/order placed!/i)

    expect(mockState.notifications).toHaveLength(1)
    expect(mockState.notifications[0]).toMatchObject({
      user_id: 'user-1',
      type: 'order_placed',
      title: 'Order placed',
      read: false,
    })
    expect(String(mockState.notifications[0]!.message)).toMatch(/pay £6\.09 at the door/i)
  })

  it('respects the order-updates preference (no row when switched off)', async () => {
    mockState.session = fakeSession
    setProfileAddress('Home', '12 Rosemary Lane')
    ;(fixtures.profiles[0] as Record<string, unknown>).notify_orders = false
    mockState.cartItems = [{ user_id: 'user-1', product_id: 'p1', quantity: 1 }]
    const user = userEvent.setup()
    renderApp('/checkout')

    await user.click(await screen.findByRole('button', { name: /place order/i }))
    await screen.findByText(/order placed!/i)
    expect(mockState.notifications).toHaveLength(0)
  })

  it('an admin status change notifies the customer (trigger behaviour)', async () => {
    mockState.session = fakeSession
    mockState.adminUsers = [{ user_id: 'user-1' }]
    seedDeliveredOrder()
    mockState.orders[0]!.status = 'placed'
    const user = userEvent.setup()
    renderApp('/admin/orders')

    await user.click(await screen.findByRole('button', { name: /order order-99 details/i }))
    await user.selectOptions(
      screen.getByRole('combobox', { name: /status of order order-99/i }),
      'out_for_delivery',
    )

    await waitFor(() => {
      expect(mockState.notifications).toHaveLength(1)
    })
    expect(mockState.notifications[0]).toMatchObject({
      user_id: 'user-1',
      type: 'order_status',
      title: 'Order dispatched',
      order_id: 'order-99',
    })
    expect(String(mockState.notifications[0]!.message)).toMatch(/on its way/i)
  })
})

describe('notification centre', () => {
  it('lists notifications with unread highlighted, and filters to unread', async () => {
    mockState.session = fakeSession
    seedNotifications()
    const user = userEvent.setup()
    renderApp('/notifications')

    const list = await screen.findByRole('list', { name: /notifications/i })
    expect(within(list).getByText('Order delivered')).toBeTruthy()
    expect(within(list).getByText('New delivery hours')).toBeTruthy()

    // The unread row is visually highlighted; its accessible name says so.
    expect(screen.getByRole('button', { name: /unread: new delivery hours/i })).toBeTruthy()

    await user.click(screen.getByRole('radio', { name: /unread \(1\)/i }))
    expect(screen.queryByText('Order delivered')).toBeNull()
    expect(screen.getByText('New delivery hours')).toBeTruthy()
  })

  it('opening an order notification marks it read and shows the order', async () => {
    mockState.session = fakeSession
    seedNotifications()
    seedDeliveredOrder()
    const user = userEvent.setup()
    renderApp('/notifications')

    await user.click(
      await screen.findByRole('button', { name: /order delivered, opens the order/i }),
    )
    expect(await screen.findByRole('heading', { name: /order details/i })).toBeTruthy()
    expect(screen.getByText(/gala apples/i)).toBeTruthy()
  })

  it('marks a single notification read on open', async () => {
    mockState.session = fakeSession
    seedNotifications()
    const user = userEvent.setup()
    renderApp('/notifications')

    await user.click(await screen.findByRole('button', { name: /unread: new delivery hours/i }))
    await waitFor(() => {
      expect(mockState.notifications.find((n) => n.id === 'n-new')!.read).toBe(true)
    })
    // No unread left: the filter chip drops its count and mark-all disappears.
    expect(screen.getByRole('radio', { name: /^unread$/i })).toBeTruthy()
  })

  it('marks everything read at once', async () => {
    mockState.session = fakeSession
    seedNotifications()
    mockState.notifications.push({
      id: 'n-3', user_id: 'user-1', type: 'promo', title: 'Fruit festival',
      message: '25% off all week.', order_id: null, read: false, created_at: '2026-07-18T10:00:00Z',
    })
    const user = userEvent.setup()
    renderApp('/notifications')

    await user.click(await screen.findByRole('button', { name: /mark all as read/i }))
    await waitFor(() => {
      expect(mockState.notifications.every((n) => n.read)).toBe(true)
    })
    expect(screen.queryByRole('button', { name: /mark all as read/i })).toBeNull()
  })

  it('deletes a notification and reaches the empty state', async () => {
    mockState.session = fakeSession
    mockState.notifications = [
      {
        id: 'n-solo', user_id: 'user-1', type: 'announcement', title: 'Spring opening',
        message: 'Our new depot is open.', order_id: null, read: true,
        created_at: '2026-07-15T09:00:00Z',
      },
    ]
    const user = userEvent.setup()
    renderApp('/notifications')

    await user.click(
      await screen.findByRole('button', { name: /delete notification: spring opening/i }),
    )
    await waitFor(() => expect(mockState.notifications).toHaveLength(0))
    expect(await screen.findByText(/no notifications yet/i)).toBeTruthy()
  })

  it('shows the unread count on the home bell and the profile row', async () => {
    mockState.session = fakeSession
    seedNotifications()
    renderApp('/home')
    expect(await screen.findByRole('link', { name: /notifications, 1 unread/i })).toBeTruthy()

    renderApp('/profile')
    expect(await screen.findByText(/1 unread/i)).toBeTruthy()
  })
})

describe('notification preferences', () => {
  it('persists toggles from the profile', async () => {
    mockState.session = fakeSession
    const user = userEvent.setup()
    renderApp('/profile')

    await user.click(await screen.findByRole('checkbox', { name: /^promotions$/i }))
    await waitFor(() => {
      expect((fixtures.profiles[0] as Record<string, unknown>).notify_promos).toBe(false)
    })
    expect(
      (screen.getByRole('checkbox', { name: /^promotions$/i }) as HTMLInputElement).checked,
    ).toBe(false)
    expect((fixtures.profiles[0] as Record<string, unknown>).notify_orders).toBe(true)
  })
})

describe('admin broadcasts', () => {
  it('previews and sends to customers, honouring their preferences', async () => {
    mockState.session = fakeSession
    mockState.adminUsers = [{ user_id: 'user-1' }]
    fixtures.profiles.push({
      ...(fixtures.profiles[0] as Record<string, unknown>),
      id: 'user-2', full_name: 'Sam Shopper', email: 'sam@example.com', notify_promos: false,
    } as (typeof fixtures.profiles)[0])
    const user = userEvent.setup()
    renderApp('/admin/notifications')

    await user.selectOptions(await screen.findByRole('combobox', { name: /type/i }), 'promo')
    await user.type(screen.getByLabelText(/^title$/i), 'Fruit festival')
    await user.type(screen.getByLabelText(/^message$/i), '25% off all week.')

    // The preview mirrors the inbox rendering live.
    const preview = screen.getByRole('region', { name: /notification preview/i })
    expect(within(preview).getByText('Fruit festival')).toBeTruthy()
    expect(within(preview).getByText('25% off all week.')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /send notification/i }))
    // Sam opted out of promotions: only one recipient.
    expect(await screen.findByText(/sent to 1 customer\./i)).toBeTruthy()
    expect(mockState.notifications).toHaveLength(1)
    expect(mockState.notifications[0]).toMatchObject({ user_id: 'user-1', type: 'promo' })
  })

  it('rejects non-admin senders server-side', async () => {
    mockState.session = fakeSession
    // No adminUsers row: the guard 404s the page, and even a direct RPC fails.
    renderApp('/admin/notifications')
    expect(await screen.findByText(/page not found/i)).toBeTruthy()

    const { sendBroadcast } = await import('../lib/notificationService')
    await expect(
      sendBroadcast({ type: 'announcement', title: 'X', message: 'Y' }),
    ).rejects.toThrow(/only administrators/i)
    expect(mockState.notifications).toHaveLength(0)
  })
})
