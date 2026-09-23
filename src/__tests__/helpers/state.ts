/**
 * Shared test harness state: fixtures, mutable mock state, and the mock
 * module factories for '../lib/supabase' and '../lib/payments/stripeProvider'.
 *
 * IMPORTANT: this module must import NOTHING from src app code — the mock
 * factories in each test file dynamically import it while the app modules are
 * still loading, so an app import here would create a cycle.
 */
import { vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'

const categories = [
  { id: 'c1', slug: 'fruits', name: 'Fruits', emoji: '\u{1F34E}', color: '#e0503c', sort_order: 10, tagline: 'Picked ripe, delivered fast' },
  { id: 'c2', slug: 'vegetables', name: 'Vegetables', emoji: '\u{1F966}', color: '#157347', sort_order: 20, tagline: 'Crisp, seasonal and local' },
  { id: 'c3', slug: 'dairy', name: 'Dairy', emoji: '\u{1F95B}', color: '#4c8fd1', sort_order: 30, tagline: 'From dawn milking to your door' },
]
const offers = [
  { id: 'o1', slug: 'fresh-week', title: 'Fresh Week', subtitle: 'Up to 25% off fruit & veg', discount_percent: 25, color: '#157347', active: true, starts_at: null, ends_at: null, featured: false },
]
const product = (p: Record<string, unknown>) => ({
  description: 'Tasty.', emoji: '\u{1F34E}', unit: 'each', original_price: null, offer_id: null,
  featured: false, popularity: 50, units_sold: 100, in_stock: true, created_at: '2026-01-01',
  brand: 'FreshFields', rating: 4.5, rating_count: 320, is_organic: false, is_new: false, stock_quantity: 40, ...p,
})
const products = [
  product({ id: 'p1', slug: 'gala-apples', category_id: 'c1', name: 'Gala Apples', price: 1.8, original_price: 2.4, featured: true, popularity: 88, units_sold: 1240, offer_id: 'o1' }),
  product({ id: 'p2', slug: 'bananas', category_id: 'c1', name: 'Bananas', price: 0.98, popularity: 97, units_sold: 2310, is_organic: true, brand: 'Sungrove' }),
  product({ id: 'p3', slug: 'broccoli', category_id: 'c2', name: 'Broccoli', price: 0.68, popularity: 66, units_sold: 720 }),
  product({ id: 'p4', slug: 'semi-skimmed-milk', category_id: 'c3', name: 'Semi-Skimmed Milk', price: 1.2, popularity: 95, units_sold: 3200, brand: 'Meadow & Co' }),
  product({ id: 'p5', slug: 'plums', category_id: 'c1', name: 'Victoria Plums', price: 2.5, popularity: 40, units_sold: 150, in_stock: false, stock_quantity: 0 }),
]
const profiles = [
  { id: 'user-1', full_name: 'Alex Fresher', email: 'alex@example.com', avatar_url: null, phone: null, notify_orders: true, notify_promos: true, notify_announcements: true, address_label: null, address_line: null, created_at: '', updated_at: '' },
]
export const mockState = {
    configured: true,
    session: null as Session | null,
    sessionDelayMs: 0,
    purchaseHistory: [] as Array<Record<string, unknown>>,
    cartItems: [] as Array<Record<string, unknown>>,
    favourites: [] as Array<Record<string, unknown>>,
    orders: [] as Array<Record<string, unknown>>,
    orderItems: [] as Array<Record<string, unknown>>,
    payments: [] as Array<Record<string, unknown>>,
    updateUserError: null as string | null,
    updateUserCalls: [] as Array<Record<string, unknown>>,
    deleteAccountError: null as string | null,
    functionCalls: [] as string[],
    stripeConfigured: false,
    stripeConfirmQueue: [] as Array<{ ok: boolean; error?: string; id?: string }>,
    adminUsers: [] as Array<Record<string, unknown>>,
  notifications: [] as Array<Record<string, unknown>>,
  queryLog: [] as string[],
  orFilters: [] as string[],
}

export const fixtures = { categories, offers, products, profiles }
// Deep snapshot taken before any test runs; resetMockState restores ALL
// fixture tables from it (admin CRUD tests mutate products/categories).
const pristineFixtures = JSON.parse(JSON.stringify(fixtures)) as typeof fixtures
export const signInWithPassword = vi.fn()
export const signOutMock = vi.fn(async () => ({ error: null }))

const fakeUser = {
  id: 'user-1',
  email: 'alex@example.com',
  user_metadata: { full_name: 'Alex Fresher' },
} as unknown as Session['user']

export const fakeSession = { user: fakeUser, access_token: 't', refresh_token: 'r' } as unknown as Session

/** Factory for vi.mock("../lib/supabase") — call from an async mock factory. */
export function supabaseMockModule() {
  type Row = Record<string, unknown>

  function tableRows(table: string): Row[] {
    if (table === 'purchase_history') return mockState.purchaseHistory
    if (table === 'cart_items') return mockState.cartItems
    if (table === 'favourites') return mockState.favourites
    if (table === 'orders') return mockState.orders
    if (table === 'order_items') return mockState.orderItems
    if (table === 'payments') return mockState.payments
    if (table === 'admin_users') return mockState.adminUsers
    if (table === 'notifications') return mockState.notifications
    return (fixtures as Record<string, Row[]>)[table] ?? []
  }

  const profileAllows = (userId: unknown, pref: string) => {
    const p = fixtures.profiles.find((r) => (r as Record<string, unknown>).id === userId) as
      | Record<string, unknown>
      | undefined
    return Boolean(p?.[pref])
  }

  const pushNotification = (row: Record<string, unknown>) => {
    mockState.notifications.push({
      id: `n-${mockState.notifications.length + 1}`,
      read: false,
      order_id: null,
      created_at: new Date().toISOString(),
      ...row,
    })
  }

  // Mirrors the phase8.sql notify_order_status / notify_payment_paid triggers.
  function emulateUpdateTriggers(
    table: string,
    oldRow: Record<string, unknown>,
    newRow: Record<string, unknown>,
  ) {
    if (table === 'orders' && newRow.status !== oldRow.status) {
      if (!profileAllows(newRow.user_id, 'notify_orders')) return
      const shortId = String(newRow.id).slice(0, 8)
      const map: Record<string, [string, string]> = {
        preparing: ['Order confirmed', `We're picking your order #${shortId} now.`],
        out_for_delivery: [
          'Order dispatched',
          `Order #${shortId} is on its way — ${newRow.delivery_slot}.`,
        ],
        delivered: ['Order delivered', `Order #${shortId} has been delivered. Enjoy!`],
        cancelled: ['Order cancelled', `Order #${shortId} was cancelled.`],
      }
      const [title, message] = map[String(newRow.status)] ?? [
        'Order update',
        `Order #${shortId} was updated.`,
      ]
      pushNotification({
        user_id: newRow.user_id,
        type: 'order_status',
        title,
        message,
        order_id: newRow.id,
      })
    }
    if (
      table === 'payments' &&
      newRow.status === 'paid' &&
      oldRow.status !== 'paid' &&
      newRow.provider === 'stripe'
    ) {
      if (!profileAllows(newRow.user_id, 'notify_orders')) return
      pushNotification({
        user_id: newRow.user_id,
        type: 'payment',
        title: 'Payment successful',
        message: `Your card payment of £${Number(newRow.amount).toFixed(2)} went through.`,
        order_id: newRow.order_id,
      })
    }
  }

  /** Minimal PostgREST-style builder: filters, ordering, limits, updates. */
  function builder(table: string) {
    mockState.queryLog.push(table)
    const filters: Array<(row: Row) => boolean> = []
    let orderBy: { col: string; asc: boolean } | null = null
    let limitN: number | null = null
    let pendingUpdate: Row | null = null
    let pendingInsert: Row[] | null = null
    let pendingDelete = false
    let selectArg = '*'

    const resolveRows = (): Row[] => {
      const source = tableRows(table)
      if (pendingInsert) {
        if (table === 'products') {
          for (const row of pendingInsert) {
            if (row.stock_quantity === 0) row.in_stock = false
          }
        }
        if (table === 'order_items') {
          // Mirrors the phase7 decrement_stock trigger.
          for (const row of pendingInsert) {
            const product = fixtures.products.find(
              (p) => (p as Record<string, unknown>).id === row.product_id,
            ) as Record<string, unknown> | undefined
            if (product && typeof product.stock_quantity === 'number') {
              product.stock_quantity = Math.max(
                0,
                product.stock_quantity - ((row.quantity as number) ?? 0),
              )
              if (product.stock_quantity === 0) product.in_stock = false
            }
          }
        }
        // upsert semantics: replace a row with the same natural key, else append
        for (const row of pendingInsert) {
          const idx = source.findIndex((r) =>
            row.user_id !== undefined && row.product_id !== undefined
              ? r.user_id === row.user_id && r.product_id === row.product_id
              : r.id === row.id,
          )
          if (idx >= 0) source[idx] = { ...source[idx], ...row }
          else source.push({ ...row })
        }
        return pendingInsert.map((r) => ({ ...r }))
      }
      let rows = source.filter((r) => filters.every((f) => f(r)))
      if (pendingDelete) {
        for (const row of rows) source.splice(source.indexOf(row), 1)
        return rows.map((r) => ({ ...r }))
      }
      if (orderBy) {
        const { col, asc } = orderBy
        rows = [...rows].sort((a, b) => {
          const av = a[col] as number | string
          const bv = b[col] as number | string
          return (av < bv ? -1 : av > bv ? 1 : 0) * (asc ? 1 : -1)
        })
      }
      if (limitN !== null) rows = rows.slice(0, limitN)
      if (pendingUpdate) {
        if (table === 'products' && pendingUpdate.stock_quantity === 0) {
          pendingUpdate.in_stock = false
        }
        const oldRows = rows.map((r) => ({ ...r }))
        rows.forEach((r) => Object.assign(r, pendingUpdate))
        rows.forEach((r, i) => emulateUpdateTriggers(table, oldRows[i]!, r))
      }
      // Clone rows like a real network response would — never shared references.
      return rows.map((r) => {
        const clone: Row = { ...r }
        // Emulate PostgREST embedding for `category:categories(*)`.
        if (table === 'products' && selectArg.includes('category:categories')) {
          clone.category =
            fixtures.categories.find((c) => c.id === (r.category_id as string)) ?? null
        }
        if (table === 'orders' && selectArg.includes('items:order_items')) {
          clone.items = mockState.orderItems
            .filter((i) => i.order_id === r.id)
            .map((i) => ({ ...i }))
        }
        if (table === 'cart_items' && selectArg.includes('product:products')) {
          const rows = fixtures.products as unknown as Row[]
          const match = rows.find((p) => p.id === (r.product_id as string))
          clone.product = match ? { ...match } : null
        }
        return clone
      })
    }

    const api = {
      select: (arg?: string) => {
        if (arg) selectArg = arg
        return api
      },
      update: (fields: Row) => {
        pendingUpdate = fields
        return api
      },
      insert: (rows: Row | Row[]) => {
        pendingInsert = Array.isArray(rows) ? rows : [rows]
        return api
      },
      upsert: (rows: Row | Row[]) => {
        pendingInsert = Array.isArray(rows) ? rows : [rows]
        return api
      },
      delete: () => {
        pendingDelete = true
        return api
      },
      eq: (col: string, val: unknown) => {
        filters.push((r) => r[col] === val)
        return api
      },
      gte: (col: string, val: number) => {
        filters.push((r) => (r[col] as number) >= val)
        return api
      },
      lte: (col: string, val: number) => {
        filters.push((r) => (r[col] as number) <= val)
        return api
      },
      in: (col: string, vals: unknown[]) => {
        filters.push((r) => vals.includes(r[col]))
        return api
      },
      not: (col: string, op: string, val: unknown) => {
        if (op === 'is' && val === null) filters.push((r) => r[col] !== null)
        return api
      },
      or: (expr: string) => {
        mockState.orFilters.push(expr)
        // supports `col.ilike.%term%` clauses joined by commas
        const clauses = expr.split(',').map((clause) => {
          const [col, op, ...rest] = clause.split('.')
          const needle = rest.join('.').replaceAll('%', '').toLowerCase()
          return { col: col!, op, needle }
        })
        filters.push((r) =>
          clauses.some(
            (c) => c.op === 'ilike' && String(r[c.col]).toLowerCase().includes(c.needle),
          ),
        )
        return api
      },
      ilike: (col: string, pattern: string) => {
        const needle = pattern.replaceAll('%', '').toLowerCase()
        filters.push((r) => String(r[col]).toLowerCase().includes(needle))
        return api
      },
      order: (col: string, opts?: { ascending?: boolean }) => {
        orderBy = { col, asc: opts?.ascending !== false }
        return api
      },
      limit: (n: number) => {
        limitN = n
        return api
      },
      maybeSingle: async () => ({ data: resolveRows()[0] ?? null, error: null }),
      single: async () => {
        const row = resolveRows()[0]
        return row ? { data: row, error: null } : { data: null, error: { message: 'Row not found' } }
      },
      then: (
        onFulfilled: (v: { data: Row[]; error: null }) => unknown,
        onRejected?: (e: unknown) => unknown,
      ) => Promise.resolve({ data: resolveRows(), error: null }).then(onFulfilled, onRejected),
    }
    return api
  }

  const client = {
    auth: {
      getSession: async () => {
        if (mockState.sessionDelayMs > 0) {
          await new Promise((r) => setTimeout(r, mockState.sessionDelayMs))
        }
        return { data: { session: mockState.session } }
      },
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signInWithPassword,
      signOut: signOutMock,
      updateUser: async (attrs: Record<string, unknown>) => {
        mockState.updateUserCalls.push(attrs)
        if (mockState.updateUserError) {
          return { data: { user: null }, error: { message: mockState.updateUserError } }
        }
        return { data: { user: mockState.session?.user ?? null }, error: null }
      },
    },
    rpc: async (name: string, args: Record<string, unknown>) => {
      if (name !== 'send_broadcast') {
        return { data: null, error: { message: `Unknown function ${name}` } }
      }
      const callerId = mockState.session?.user?.id
      const isAdmin = mockState.adminUsers.some((a) => a.user_id === callerId)
      if (!isAdmin) {
        return { data: null, error: { message: 'Only administrators can send notifications.' } }
      }
      const type = String(args.p_type)
      const title = String(args.p_title ?? '').trim()
      const message = String(args.p_message ?? '').trim()
      if (!['promo', 'announcement'].includes(type)) {
        return { data: null, error: { message: 'Unsupported broadcast type.' } }
      }
      if (!title || !message) {
        return { data: null, error: { message: 'Title and message are required.' } }
      }
      const targets = args.p_user_ids as string[] | null | undefined
      const pref = type === 'promo' ? 'notify_promos' : 'notify_announcements'
      let count = 0
      for (const p of fixtures.profiles as Array<Record<string, unknown>>) {
        if (targets && !targets.includes(String(p.id))) continue
        if (!p[pref]) continue
        pushNotification({ user_id: p.id, type, title, message })
        count += 1
      }
      return { data: count, error: null }
    },
    functions: {
      invoke: async (name: string) => {
        mockState.functionCalls.push(name)
        if (name === 'delete-account') {
          if (mockState.deleteAccountError) {
            return { data: null, error: { message: mockState.deleteAccountError } }
          }
          return { data: { ok: true }, error: null }
        }
        return { data: null, error: { message: `Unknown function ${name}` } }
      },
    },
    from: builder,
  }
  return {
    get isSupabaseConfigured() {
      return mockState.configured
    },
    get supabase() {
      return mockState.configured ? client : null
    },
  }
}

/** Factory for vi.mock("../lib/payments/stripeProvider"). */
export function stripeMockModule() {
  return {
    isStripeConfigured: () => mockState.stripeConfigured,
    createStripeSession: async () => ({
      session: {
        stripe: {},
        elements: { create: () => ({ mount: () => {}, unmount: () => {} }) },
      },
    }),
    confirmStripeSession: async () => {
      const next = mockState.stripeConfirmQueue.shift()
      if (!next) return { ok: true, provider: 'stripe', providerPaymentId: 'pi_default' }
      return next.ok
        ? { ok: true, provider: 'stripe', providerPaymentId: next.id ?? 'pi_test' }
        : { ok: false, error: next.error ?? 'card_declined' }
    },
  }
}

export function setProfileAddress(label: string | null, line: string | null) {
  const profile = fixtures.profiles[0] as Record<string, unknown>
  profile.address_label = label
  profile.address_line = line
}

/** Full per-test state reset (everything except the catalog cache). */
export function resetMockState() {
  mockState.configured = true
  mockState.session = null
  mockState.sessionDelayMs = 0
  mockState.purchaseHistory = []
  mockState.cartItems = []
  mockState.favourites = []
  mockState.orders = []
  mockState.orderItems = []
  mockState.payments = []
  mockState.updateUserError = null
  mockState.updateUserCalls = []
  mockState.deleteAccountError = null
  mockState.functionCalls = []
  mockState.stripeConfigured = false
  mockState.stripeConfirmQueue = []
  mockState.queryLog = []
  mockState.orFilters = []
  for (const key of ['categories', 'offers', 'products', 'profiles'] as const) {
    const target = fixtures[key] as Array<Record<string, unknown>>
    target.splice(
      0,
      target.length,
      ...(JSON.parse(JSON.stringify(pristineFixtures[key])) as Array<Record<string, unknown>>),
    )
  }
  mockState.adminUsers = []
  mockState.notifications = []
  document.documentElement.classList.remove('dark')
  localStorage.clear()
  vi.clearAllMocks()
}
