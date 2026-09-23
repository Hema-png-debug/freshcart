import { supabase } from './supabase'
import { clearCatalogCache } from './catalog'
import type {
  Category,
  Order,
  OrderStatus,
  OrderWithItems,
  Product,
  Profile,
} from '../types'

/**
 * Admin dashboard service. Every call here is protected server-side by the
 * phase7 RLS policies (public.is_admin()); the client-side route guard is a
 * UX convenience, not the security boundary. Catalog mutations clear the
 * customer-facing cache so shoppers see changes immediately.
 */

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export const LOW_STOCK_THRESHOLD = 5

function mapProduct(p: Product): Product {
  return {
    ...p,
    price: Number(p.price),
    original_price: p.original_price === null ? null : Number(p.original_price),
  }
}

function mapOrder<T extends Order>(o: T): T {
  return {
    ...o,
    subtotal: Number(o.subtotal),
    delivery_fee: Number(o.delivery_fee),
    total: Number(o.total),
  }
}

// ---------------------------------------------------------------------------
// Overview stats
// ---------------------------------------------------------------------------

export interface AdminStats {
  totalProducts: number
  totalCategories: number
  totalCustomers: number
  totalOrders: number
  pendingOrders: number
  completedOrders: number
  totalRevenue: number
  todaysOrders: number
  todaysRevenue: number
  lowStock: Product[]
  outOfStockCount: number
  recentOrders: OrderWithItems[]
}

const OPEN_STATUSES: OrderStatus[] = ['placed', 'preparing', 'out_for_delivery']

export async function fetchAdminStats(): Promise<AdminStats> {
  const client = requireClient()
  const [productsRes, categoriesRes, customersRes, ordersRes, recentRes] = await Promise.all([
    client.from('products').select('*'),
    client.from('categories').select('id'),
    client.from('profiles').select('id'),
    client.from('orders').select('id, status, total, created_at'),
    client
      .from('orders')
      .select('*, items:order_items(*)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])
  for (const res of [productsRes, categoriesRes, customersRes, ordersRes, recentRes]) {
    if (res.error) throw new Error(res.error.message)
  }

  const products = ((productsRes.data ?? []) as Product[]).map(mapProduct)
  const orders = (ordersRes.data ?? []) as Array<
    Pick<Order, 'id' | 'status' | 'total' | 'created_at'>
  >
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const isToday = (iso: string) => new Date(iso).getTime() >= startOfToday.getTime()
  const revenueOf = (rows: Array<{ total: number; status: OrderStatus }>) =>
    rows
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total), 0)

  const lowStock = products
    .filter((p) => p.stock_quantity > 0 && p.stock_quantity <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.stock_quantity - b.stock_quantity)

  return {
    totalProducts: products.length,
    totalCategories: (categoriesRes.data ?? []).length,
    totalCustomers: (customersRes.data ?? []).length,
    totalOrders: orders.length,
    pendingOrders: orders.filter((o) => OPEN_STATUSES.includes(o.status)).length,
    completedOrders: orders.filter((o) => o.status === 'delivered').length,
    totalRevenue: revenueOf(orders),
    todaysOrders: orders.filter((o) => isToday(o.created_at)).length,
    todaysRevenue: revenueOf(orders.filter((o) => isToday(o.created_at))),
    lowStock,
    outOfStockCount: products.filter((p) => p.stock_quantity === 0).length,
    recentOrders: ((recentRes.data ?? []) as unknown as OrderWithItems[]).map((o) => ({
      ...mapOrder(o),
      items: (o.items ?? []).map((i) => ({ ...i, price: Number(i.price) })),
    })),
  }
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export interface AdminOrderFilters {
  status?: OrderStatus
  paymentStatus?: Order['payment_status']
}

export async function fetchAllOrders(filters: AdminOrderFilters = {}): Promise<OrderWithItems[]> {
  let q = requireClient()
    .from('orders')
    .select('*, items:order_items(*)')
    .order('created_at', { ascending: false })
  if (filters.status) q = q.eq('status', filters.status)
  if (filters.paymentStatus) q = q.eq('payment_status', filters.paymentStatus)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as OrderWithItems[]).map((o) => ({
    ...mapOrder(o),
    items: (o.items ?? []).map((i) => ({ ...i, price: Number(i.price) })),
  }))
}

/**
 * Advances an order's lifecycle. Marking a cash-on-delivery order delivered
 * settles its payment (the driver was paid at the door); card settlement
 * stays exclusively with the Stripe webhook.
 */
export async function updateOrderStatus(order: Order, status: OrderStatus): Promise<void> {
  const client = requireClient()
  const settleCod =
    status === 'delivered' && order.payment_method === 'cod' && order.payment_status === 'pending'

  const patch: Record<string, unknown> = { status }
  if (settleCod) patch.payment_status = 'paid'

  const { error } = await client.from('orders').update(patch).eq('id', order.id)
  if (error) throw new Error(error.message)

  if (settleCod) {
    const { error: payError } = await client
      .from('payments')
      .update({ status: 'paid' })
      .eq('order_id', order.id)
    if (payError) throw new Error(payError.message)
  }
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export async function fetchCustomers(): Promise<Profile[]> {
  const { data, error } = await requireClient()
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as Profile[]
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9\s-]/g, '')
    .replaceAll(/[\s-]+/g, '-')
    .replace(/^-|-$/g, '')
}

export interface ProductInput {
  name: string
  description: string
  emoji: string
  unit: string
  price: number
  original_price: number | null
  category_id: string
  brand: string
  stock_quantity: number
  /** Manual availability; forced off automatically at zero stock. */
  available: boolean
  featured: boolean
  is_organic: boolean
  is_new: boolean
}

function productRow(input: ProductInput): Record<string, unknown> {
  return {
    name: input.name.trim(),
    description: input.description.trim(),
    emoji: input.emoji.trim(),
    unit: input.unit.trim(),
    price: input.price,
    original_price: input.original_price,
    category_id: input.category_id,
    brand: input.brand.trim(),
    stock_quantity: input.stock_quantity,
    // Mirrors the DB trigger so the UI is correct even before refetching.
    in_stock: input.available && input.stock_quantity > 0,
    featured: input.featured,
    is_organic: input.is_organic,
    is_new: input.is_new,
  }
}

export async function createProduct(input: ProductInput): Promise<void> {
  const { error } = await requireClient()
    .from('products')
    .insert({ id: crypto.randomUUID(), slug: slugify(input.name), ...productRow(input) })
  if (error) throw new Error(error.message)
  clearCatalogCache()
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  const { error } = await requireClient().from('products').update(productRow(input)).eq('id', id)
  if (error) throw new Error(error.message)
  clearCatalogCache()
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await requireClient().from('products').delete().eq('id', id)
  if (error) throw new Error(error.message)
  clearCatalogCache()
}

/** Inventory quick-set; availability re-derives like the DB trigger. */
export async function setStockQuantity(product: Product, quantity: number): Promise<void> {
  const { error } = await requireClient()
    .from('products')
    .update({
      stock_quantity: quantity,
      in_stock: quantity > 0 && (product.in_stock || product.stock_quantity === 0),
    })
    .eq('id', product.id)
  if (error) throw new Error(error.message)
  clearCatalogCache()
}

export async function fetchAllProducts(): Promise<Product[]> {
  const { data, error } = await requireClient()
    .from('products')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return ((data ?? []) as Product[]).map(mapProduct)
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export interface CategoryInput {
  name: string
  emoji: string
  color: string
  tagline: string
}

export async function createCategory(input: CategoryInput): Promise<void> {
  const client = requireClient()
  const { data } = await client
    .from('categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
  const maxSort = ((data ?? [])[0] as { sort_order: number } | undefined)?.sort_order ?? 0
  const { error } = await client.from('categories').insert({
    id: crypto.randomUUID(),
    slug: slugify(input.name),
    name: input.name.trim(),
    emoji: input.emoji.trim(),
    color: input.color,
    tagline: input.tagline.trim(),
    sort_order: maxSort + 10,
  })
  if (error) throw new Error(error.message)
  clearCatalogCache()
}

export async function updateCategory(id: string, input: CategoryInput): Promise<void> {
  const { error } = await requireClient()
    .from('categories')
    .update({
      name: input.name.trim(),
      emoji: input.emoji.trim(),
      color: input.color,
      tagline: input.tagline.trim(),
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  clearCatalogCache()
}

/**
 * Deletes an EMPTY category. The FK cascade would silently delete the
 * category's products, so the service refuses unless the aisle is empty —
 * callers show the product count and ask admins to move products first.
 */
export async function deleteCategory(id: string, productCount: number): Promise<void> {
  if (productCount > 0) {
    throw new Error('Move or delete its products first — deleting now would remove them all.')
  }
  const { error } = await requireClient().from('categories').delete().eq('id', id)
  if (error) throw new Error(error.message)
  clearCatalogCache()
}

/** Swaps sort_order with the neighbour above/below. */
export async function moveCategory(
  categories: Category[],
  id: string,
  direction: 'up' | 'down',
): Promise<void> {
  const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order)
  const index = sorted.findIndex((c) => c.id === id)
  const swapWith = direction === 'up' ? sorted[index - 1] : sorted[index + 1]
  const current = sorted[index]
  if (!current || !swapWith) return
  const client = requireClient()
  const first = await client
    .from('categories')
    .update({ sort_order: swapWith.sort_order })
    .eq('id', current.id)
  if (first.error) throw new Error(first.error.message)
  const second = await client
    .from('categories')
    .update({ sort_order: current.sort_order })
    .eq('id', swapWith.id)
  if (second.error) throw new Error(second.error.message)
  clearCatalogCache()
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface AdminAnalytics {
  totalRevenue: number
  ordersByStatus: Array<{ status: OrderStatus; count: number }>
  topProducts: Product[]
  topCategories: Array<{ category: Category; unitsSold: number }>
}

export async function fetchAnalytics(): Promise<AdminAnalytics> {
  const client = requireClient()
  const [ordersRes, productsRes, categoriesRes] = await Promise.all([
    client.from('orders').select('status, total'),
    client.from('products').select('*'),
    client.from('categories').select('*').order('sort_order', { ascending: true }),
  ])
  for (const res of [ordersRes, productsRes, categoriesRes]) {
    if (res.error) throw new Error(res.error.message)
  }
  const orders = (ordersRes.data ?? []) as Array<Pick<Order, 'status' | 'total'>>
  const products = ((productsRes.data ?? []) as Product[]).map(mapProduct)
  const categories = (categoriesRes.data ?? []) as Category[]

  const statuses: OrderStatus[] = [
    'placed',
    'preparing',
    'out_for_delivery',
    'delivered',
    'cancelled',
  ]
  const byCategory = new Map<string, number>()
  for (const p of products) {
    byCategory.set(p.category_id, (byCategory.get(p.category_id) ?? 0) + p.units_sold)
  }

  return {
    totalRevenue: orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total), 0),
    ordersByStatus: statuses
      .map((status) => ({ status, count: orders.filter((o) => o.status === status).length }))
      .filter((row) => row.count > 0),
    topProducts: [...products].sort((a, b) => b.units_sold - a.units_sold).slice(0, 5),
    topCategories: categories
      .map((category) => ({ category, unitsSold: byCategory.get(category.id) ?? 0 }))
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5),
  }
}
