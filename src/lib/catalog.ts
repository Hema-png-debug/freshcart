import { supabase } from './supabase'
import type { Category, Offer, Product } from '../types'

/** Sort orders supported by product lists. */
export type ProductSort =
  | 'popularity'
  | 'best_selling'
  | 'price_asc'
  | 'price_desc'
  | 'discount'
  | 'newest'
  | 'name_asc'
  | 'name_desc'

export interface ProductQuery {
  featured?: boolean
  sort?: ProductSort
  categoryId?: string
  offerId?: string
  /** Matches name, brand, and description (case-insensitive). */
  search?: string
  limit?: number
  /** Category pages show out-of-stock items with a status; rails hide them. */
  includeOutOfStock?: boolean
  brands?: string[]
  priceMin?: number
  priceMax?: number
  organic?: boolean
  discounted?: boolean
  isNew?: boolean
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

// ---------------------------------------------------------------------------
// Tiny TTL cache for near-static reference data. Page transitions remount
// screens, so without this every tab visit refetches categories and offers.
// ---------------------------------------------------------------------------
const CACHE_TTL_MS = 45_000
const cache = new Map<string, { at: number; promise: Promise<unknown> }>()

function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.promise as Promise<T>
  // Cache the promise itself so concurrent callers share one request.
  const promise = fetcher().catch((err: unknown) => {
    cache.delete(key) // don't cache failures
    throw err
  })
  cache.set(key, { at: Date.now(), promise })
  return promise
}

/** Drops cached reference data (used by tests; call after admin edits). */
export function clearCatalogCache(): void {
  cache.clear()
}

/** Numeric columns can arrive as strings from PostgREST; normalize once here. */
function mapProduct(row: Product): Product {
  return {
    ...row,
    price: Number(row.price),
    original_price: row.original_price === null ? null : Number(row.original_price),
  }
}

export async function fetchCategories(): Promise<Category[]> {
  return cached('categories', async () => {
    const { data, error } = await requireClient()
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []) as Category[]
  })
}

export async function fetchCategoryBySlug(slug: string): Promise<Category | null> {
  const { data, error } = await requireClient()
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as Category | null) ?? null
}

export async function fetchOffers(): Promise<Offer[]> {
  return cached('offers', async () => {
    const { data, error } = await requireClient()
      .from('offers')
      .select('*')
      .eq('active', true)
      .order('discount_percent', { ascending: false })
    if (error) throw new Error(error.message)
    // Expiry handling + featuring, client-side on a small table: promotions
    // outside their date window never reach shoppers; featured ones lead.
    const now = Date.now()
    return ((data ?? []) as Offer[])
      .filter((o) => {
        if (o.starts_at && new Date(o.starts_at).getTime() > now) return false
        if (o.ends_at && new Date(o.ends_at).getTime() < now) return false
        return true
      })
      .sort((a, b) => Number(b.featured) - Number(a.featured))
  })
}

export async function fetchOfferBySlug(slug: string): Promise<Offer | null> {
  const { data, error } = await requireClient()
    .from('offers')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as Offer | null) ?? null
}

function escapeSearchTerm(term: string): string {
  // This term is interpolated into a PostgREST or-filter, so strip every
  // character with structural meaning there: comma and parentheses separate
  // and group conditions, `%` and `*` are ilike wildcards, and a backslash
  // could escape a following delimiter. What remains is matched literally.
  return term.replaceAll(/[,()%*\\]/g, ' ').trim()
}

/**
 * Stable, catalogue-wide product lists (Home rails, "featured", "best
 * selling") are safe to cache: they read only reference data, are identical
 * for every shopper, and change only when an admin edits the catalogue (which
 * clears the cache). User-specific or interactive queries — searches, price
 * or brand filters, and anything with a category/offer context that shifts as
 * the shopper browses — are NOT cached, so results stay live. Two Home visits
 * inside the TTL now share one request per rail instead of refetching four.
 */
function isCacheableProductQuery(query: ProductQuery): boolean {
  return (
    !query.search &&
    !query.categoryId &&
    !query.offerId &&
    !query.brands?.length &&
    query.priceMin === undefined &&
    query.priceMax === undefined &&
    !query.organic &&
    !query.isNew &&
    !query.discounted &&
    !query.includeOutOfStock
  )
}

export async function fetchProducts(query: ProductQuery = {}): Promise<Product[]> {
  if (isCacheableProductQuery(query)) {
    const key = `products:${query.featured ? 'featured' : 'all'}:${query.sort ?? 'popularity'}:${query.limit ?? 0}`
    return cached(key, () => runProductQuery(query))
  }
  return runProductQuery(query)
}

async function runProductQuery(query: ProductQuery): Promise<Product[]> {
  let q = requireClient().from('products').select('*')

  if (!query.includeOutOfStock) q = q.eq('in_stock', true)
  if (query.featured !== undefined) q = q.eq('featured', query.featured)
  if (query.categoryId) q = q.eq('category_id', query.categoryId)
  if (query.offerId) q = q.eq('offer_id', query.offerId)
  if (query.organic) q = q.eq('is_organic', true)
  if (query.isNew) q = q.eq('is_new', true)
  if (query.discounted) q = q.not('original_price', 'is', null)
  if (query.brands && query.brands.length > 0) q = q.in('brand', query.brands)
  if (query.priceMin !== undefined) q = q.gte('price', query.priceMin)
  if (query.priceMax !== undefined) q = q.lte('price', query.priceMax)
  if (query.search) {
    const term = escapeSearchTerm(query.search)
    if (term) {
      q = q.or(`name.ilike.%${term}%,brand.ilike.%${term}%,description.ilike.%${term}%`)
    }
  }

  switch (query.sort) {
    case 'best_selling':
      q = q.order('units_sold', { ascending: false })
      break
    case 'newest':
      q = q.order('created_at', { ascending: false })
      break
    case 'price_asc':
      q = q.order('price', { ascending: true })
      break
    case 'price_desc':
      q = q.order('price', { ascending: false })
      break
    case 'name_asc':
      q = q.order('name', { ascending: true })
      break
    case 'name_desc':
      q = q.order('name', { ascending: false })
      break
    case 'discount': // ordered client-side below (computed from two columns)
    case 'popularity':
    default:
      q = q.order('popularity', { ascending: false })
  }

  if (query.limit) q = q.limit(query.limit)

  const { data, error } = await q
  if (error) throw new Error(error.message)
  const products = ((data ?? []) as Product[]).map(mapProduct)

  if (query.sort === 'discount') {
    const pct = (p: Product) =>
      p.original_price && p.original_price > p.price ? 1 - p.price / p.original_price : 0
    products.sort((a, b) => pct(b) - pct(a))
  }
  return products
}

/**
 * Products matching the given ids. Defaults to in-stock only ("Order again"
 * must not add unbuyable items); Favourites passes includeOutOfStock to show
 * hearted items with their stock status instead of hiding them.
 */
export async function fetchProductsByIds(
  ids: string[],
  options: { includeOutOfStock?: boolean } = {},
): Promise<Product[]> {
  if (ids.length === 0) return []
  let q = requireClient().from('products').select('*').in('id', ids)
  if (!options.includeOutOfStock) q = q.eq('in_stock', true)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return ((data ?? []) as Product[]).map(mapProduct)
}

/** Distinct brands available in a category (for the filter sheet). */
export async function fetchCategoryBrands(categoryId: string): Promise<string[]> {
  const { data, error } = await requireClient()
    .from('products')
    .select('brand')
    .eq('category_id', categoryId)
  if (error) throw new Error(error.message)
  const brands = new Set(((data ?? []) as Array<{ brand: string }>).map((r) => r.brand))
  return [...brands].sort((a, b) => a.localeCompare(b))
}

/** In-stock product count per category id (cached; powers the Categories tab). */
export async function fetchCategoryCounts(): Promise<Record<string, number>> {
  return cached('category-counts', async () => {
    const { data, error } = await requireClient()
      .from('products')
      .select('category_id')
      .eq('in_stock', true)
    if (error) throw new Error(error.message)
    const counts: Record<string, number> = {}
    for (const row of (data ?? []) as Array<{ category_id: string }>) {
      counts[row.category_id] = (counts[row.category_id] ?? 0) + 1
    }
    return counts
  })
}

export interface ProductWithCategory extends Product {
  category: Category | null
}

/** One round trip: the product plus its category via a PostgREST join. */
export async function fetchProductWithCategory(id: string): Promise<ProductWithCategory | null> {
  const { data, error } = await requireClient()
    .from('products')
    .select('*, category:categories(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const row = data as ProductWithCategory
  return { ...mapProduct(row), category: row.category ?? null }
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const { data, error } = await requireClient()
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapProduct(data as Product) : null
}

export async function fetchCategoryById(id: string): Promise<Category | null> {
  const { data, error } = await requireClient()
    .from('categories')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as Category | null) ?? null
}

interface PurchaseHistoryRow {
  product_id: string
  times_purchased: number
  last_purchased_at: string
  product: Product | null
}

/** Products this user has bought before, most recent first. */
export async function fetchRecentlyBought(userId: string, limit = 10): Promise<Product[]> {
  const { data, error } = await requireClient()
    .from('purchase_history')
    .select('product_id, times_purchased, last_purchased_at, product:products(*)')
    .eq('user_id', userId)
    .order('last_purchased_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as unknown as PurchaseHistoryRow[]
  return rows.flatMap((r) => (r.product ? [mapProduct(r.product)] : []))
}
