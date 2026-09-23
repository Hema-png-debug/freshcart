/** Catalog: home, search, product detail, categories (Phases 2–3) — split from app.smoke.test.tsx. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/supabase', async () => (await import('./helpers/state')).supabaseMockModule())
vi.mock('../lib/payments/stripeProvider', async () =>
  (await import('./helpers/state')).stripeMockModule())

import { mockState, fakeSession } from './helpers/state'
import { renderApp, resetTestState } from './helpers/render'

beforeEach(resetTestState)

describe('home screen catalog', () => {
  it('renders offers, categories, and product sections from the store', async () => {
    mockState.session = fakeSession
    renderApp('/home')

    expect(await screen.findByText(/fresh week/i)).toBeTruthy()
    expect(screen.getByText(/up to 25% off fruit & veg/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /fruits/i })).toBeTruthy()
    expect((await screen.findAllByText(/gala apples/i)).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/bananas/i).length).toBeGreaterThan(0)
    // No purchases yet: the recently-bought rail explains itself instead of lying.
    expect(screen.getByText(/after your first order/i)).toBeTruthy()
  })

  it('shows recently bought products once purchase history exists', async () => {
    mockState.session = fakeSession
    mockState.purchaseHistory = [
      {
        user_id: 'user-1',
        product_id: 'p3',
        times_purchased: 2,
        last_purchased_at: '2026-07-10',
        product: {
          id: 'p3', slug: 'broccoli', category_id: 'c2', name: 'Broccoli', price: 0.68,
          description: 'Tasty.', emoji: 'B', unit: 'each', original_price: null, offer_id: null,
          featured: false, popularity: 66, units_sold: 720, in_stock: true, created_at: '2026-01-01',
          brand: 'FreshFields', rating: 4.2, rating_count: 210, is_organic: false, is_new: false,
        },
      },
    ]
    renderApp('/home')
    await screen.findByText(/fresh week/i)
    expect(screen.queryByText(/after your first order/i)).toBeNull()
    const rail = screen.getByRole('region', { name: /recently bought/i })
    expect(within(rail).getByText(/broccoli/i)).toBeTruthy()
  })

  it('category tile opens a list filtered to that category', async () => {
    mockState.session = fakeSession
    const user = userEvent.setup()
    renderApp('/home')
    await user.click(await screen.findByRole('link', { name: /fruits/i }))

    expect(await screen.findByRole('heading', { name: /fruits/i })).toBeTruthy()
    expect(screen.getByText(/gala apples/i)).toBeTruthy()
    expect(screen.getByText(/bananas/i)).toBeTruthy()
    expect(screen.queryByText(/broccoli/i)).toBeNull()
    expect(screen.queryByText(/semi-skimmed milk/i)).toBeNull()
  })

  it("offer banner opens that offer's products", async () => {
    mockState.session = fakeSession
    const user = userEvent.setup()
    renderApp('/home')
    await user.click(await screen.findByRole('link', { name: /fresh week/i }))

    expect(await screen.findByRole('heading', { name: /fresh week/i })).toBeTruthy()
    expect(screen.getByText(/gala apples/i)).toBeTruthy()
    expect(screen.queryByText(/bananas/i)).toBeNull()
  })

  it('"See all" on Featured lists only featured products', async () => {
    mockState.session = fakeSession
    const user = userEvent.setup()
    renderApp('/home')
    const featuredRail = await screen.findByRole('region', { name: /^featured$/i })
    await user.click(within(featuredRail).getByRole('link', { name: /see all/i }))

    expect(await screen.findByText(/hand-picked by freshcart/i)).toBeTruthy()
    expect(screen.getByText(/gala apples/i)).toBeTruthy()
    expect(screen.queryByText(/bananas/i)).toBeNull()
  })
})

describe('search', () => {
  it('searches the store live from the home search bar', async () => {
    mockState.session = fakeSession
    const user = userEvent.setup()
    renderApp('/home')
    await user.click(await screen.findByRole('button', { name: /search fruit, milk/i }))

    const box = await screen.findByRole('searchbox', { name: /search products/i })
    await user.type(box, 'bana')

    expect(await screen.findByText(/1 result/i)).toBeTruthy()
    expect(screen.getByText(/bananas/i)).toBeTruthy()
    expect(screen.queryByText(/gala apples/i)).toBeNull()

    await user.click(screen.getByRole('button', { name: /clear search/i }))
    expect(await screen.findByText(/type at least two letters/i)).toBeTruthy()
  })
})

describe('delivery address', () => {
  it('saves a delivery address and shows it in the header', async () => {
    mockState.session = fakeSession
    const user = userEvent.setup()
    renderApp('/home')

    await user.click(await screen.findByRole('button', { name: /set your delivery address/i }))
    await user.type(screen.getByLabelText(/^address$/i), '12 Portobello Road, London')
    await user.click(screen.getByRole('button', { name: /save address/i }))

    expect(
      await screen.findByRole('button', { name: /delivery address: 12 portobello road/i }),
    ).toBeTruthy()
  })
})

describe('product detail', () => {
  it('opens a product from the home rails with price, discount and category link', async () => {
    mockState.session = fakeSession
    const user = userEvent.setup()
    renderApp('/home')
    const cards = await screen.findAllByRole('link', { name: /gala apples/i })
    await user.click(cards[0]!)

    expect(await screen.findByRole('heading', { name: /gala apples/i })).toBeTruthy()
    expect(screen.getByText('£1.80')).toBeTruthy()
    expect(screen.getByText('£2.40')).toBeTruthy()
    expect(screen.getByText(/−25% off/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /fruits/i })).toBeTruthy()
    expect(screen.getByText(/1,240/)).toBeTruthy()
  })
})

describe('performance safeguards', () => {
  it('loads product detail (with category) in a single products query', async () => {
    mockState.session = fakeSession
    renderApp('/product/p1')

    expect(await screen.findByRole('heading', { name: /gala apples/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /fruits/i })).toBeTruthy()

    const catalogQueries = mockState.queryLog.filter(
      (t) => !['profiles', 'cart_items', 'favourites', 'admin_users', 'notifications'].includes(t),
    )
    expect(catalogQueries).toEqual(['products'])
  })

  it('serves categories and offers from cache on repeat visits', async () => {
    mockState.session = fakeSession
    const first = renderApp('/home')
    await screen.findByText(/fresh week/i)
    first.unmount()

    const before = {
      categories: mockState.queryLog.filter((t) => t === 'categories').length,
      offers: mockState.queryLog.filter((t) => t === 'offers').length,
    }
    expect(before.categories).toBe(1)
    expect(before.offers).toBe(1)

    renderApp('/home')
    await screen.findByText(/fresh week/i)
    expect(mockState.queryLog.filter((t) => t === 'categories').length).toBe(1)
    expect(mockState.queryLog.filter((t) => t === 'offers').length).toBe(1)
  })

  it('serves the Home product rails from cache on repeat visits', async () => {
    mockState.session = fakeSession
    const first = renderApp('/home')
    await screen.findByText(/fresh week/i)
    first.unmount()

    // The Home rails (featured / popularity / best_selling) are stable,
    // catalogue-wide product queries — cacheable. Record how many product
    // reads the first visit made, then assert the second visit adds none.
    const afterFirst = mockState.queryLog.filter((t) => t === 'products').length
    expect(afterFirst).toBeGreaterThan(0)

    renderApp('/home')
    await screen.findByText(/fresh week/i)
    expect(mockState.queryLog.filter((t) => t === 'products').length).toBe(afterFirst)
  })

  it('does NOT cache interactive product queries (search stays live)', async () => {
    mockState.session = fakeSession
    const user = userEvent.setup()
    renderApp('/search')

    const box = await screen.findByRole('searchbox')
    await user.type(box, 'apple')
    await screen.findByText(/gala apples/i)
    const afterApple = mockState.queryLog.filter((t) => t === 'products').length

    await user.clear(box)
    await user.type(box, 'banana')
    await screen.findByText(/bananas/i)
    // A different search term must hit the database again, not a cache.
    expect(mockState.queryLog.filter((t) => t === 'products').length).toBeGreaterThan(afterApple)
  })

  it('strips PostgREST filter metacharacters from search terms', async () => {
    mockState.session = fakeSession
    const user = userEvent.setup()
    renderApp('/search')

    const box = await screen.findByRole('searchbox')
    // A term crafted to break out of the ilike or-filter.
    await user.type(box, 'a),name.eq.x%*\\')
    await waitFor(() => expect(mockState.orFilters.length).toBeGreaterThan(0))

    // Every or-filter the query layer built must be structurally intact:
    // exactly our three ilike clauses, and each interpolated term (the text
    // between the %...% wildcards) free of characters that could inject a new
    // column/operator or wildcard.
    for (const expr of mockState.orFilters) {
      const clauses = expr.split(',')
      expect(clauses).toHaveLength(3)
      for (const clause of clauses) {
        expect(clause).toMatch(/^(name|brand|description)\.ilike\.%.*%$/)
        const term = clause.replace(/^\w+\.ilike\.%/, '').replace(/%$/, '')
        expect(term).not.toMatch(/[,()%*\\]/)
      }
    }
  })
})

describe('categories tab', () => {
  it('lists every aisle with live product counts and opens a category', async () => {
    mockState.session = fakeSession
    const user = userEvent.setup()
    renderApp('/categories')

    expect(await screen.findByText(/browse every aisle/i)).toBeTruthy()
    const fruits = await screen.findByRole('link', { name: /fruits/i })
    // Fruits has p1, p2 in stock (p5 is out of stock) => "2 products"
    expect(within(fruits).getByText(/2 products/i)).toBeTruthy()

    await user.click(fruits)
    expect(await screen.findByRole('heading', { name: /fruits/i })).toBeTruthy()
    expect(screen.getByText(/picked ripe, delivered fast/i)).toBeTruthy()
    // Banner counts every product in the aisle, including out of stock.
    expect(await screen.findByText(/3 products available/i)).toBeTruthy()
    // Out-of-stock items appear with a status instead of being hidden.
    expect(screen.getByText(/victoria plums/i)).toBeTruthy()
    expect(screen.getByText(/out of stock/i)).toBeTruthy()
  })
})

describe('category sorting', () => {
  it('sorts alphabetically when A\u2013Z is chosen', async () => {
    mockState.session = fakeSession
    const user = userEvent.setup()
    renderApp('/category/fruits')
    await screen.findByText(/victoria plums/i)

    await user.click(screen.getByRole('button', { name: /popular/i }))
    await user.click(await screen.findByRole('radio', { name: /alphabetical \(a\u2013z\)/i }))

    await waitFor(() => {
      const names = screen
        .getAllByRole('link', { name: /£/ })
        .map((el) => el.textContent ?? '')
      const order = ['Bananas', 'Gala Apples', 'Victoria Plums'].map((n) =>
        names.findIndex((t) => t.includes(n)),
      )
      expect(order[0]).toBeGreaterThanOrEqual(0)
      expect(order[0]!).toBeLessThan(order[1]!)
      expect(order[1]!).toBeLessThan(order[2]!)
    })
  })
})

describe('category filtering', () => {
  it('applies filters instantly: organic, price range, in-stock', async () => {
    mockState.session = fakeSession
    const user = userEvent.setup()
    renderApp('/category/fruits')
    await screen.findByText(/victoria plums/i)

    await user.click(screen.getByRole('button', { name: /^filters?$/i }))

    // Organic → only Bananas
    await user.click(await screen.findByLabelText(/^organic$/i))
    await waitFor(() => expect(screen.queryByText(/gala apples/i)).toBeNull())
    expect(screen.getByText(/bananas/i)).toBeTruthy()
    await user.click(screen.getByLabelText(/^organic$/i)) // off again

    // In stock only → hides Victoria Plums
    await user.click(screen.getByLabelText(/^in stock$/i))
    await waitFor(() => expect(screen.queryByText(/victoria plums/i)).toBeNull())
    expect(screen.getByText(/gala apples/i)).toBeTruthy()
    await user.click(screen.getByLabelText(/^in stock$/i))

    // Max price £1 → only Bananas (0.98)
    await user.type(screen.getByLabelText(/max \(£\)/i), '1')
    await waitFor(() => expect(screen.queryByText(/gala apples/i)).toBeNull())
    expect(screen.getByText(/bananas/i)).toBeTruthy()

    // Clear all restores everything
    await user.click(screen.getByRole('button', { name: /clear all/i }))
    expect(await screen.findByText(/victoria plums/i)).toBeTruthy()
  })
})

describe('category search', () => {
  it('matches brands and descriptions, not just names', async () => {
    mockState.session = fakeSession
    const user = userEvent.setup()
    renderApp('/category/fruits')
    await screen.findByText(/victoria plums/i)

    // "Sungrove" is Bananas' brand — name search alone would find nothing.
    await user.type(screen.getByRole('searchbox', { name: /search in fruits/i }), 'sungrove')
    await waitFor(() => expect(screen.queryByText(/gala apples/i)).toBeNull())
    expect(screen.getByText(/bananas/i)).toBeTruthy()
  })
})
