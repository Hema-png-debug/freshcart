import { supabase } from './supabase'
import { addNotification } from './notificationService'
import type { CartItem, Order, OrderItem, OrderWithItems, PaymentMethod } from '../types'

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

// ---------------------------------------------------------------------------
// Fees — stored on the order at placement so history stays accurate.
// ---------------------------------------------------------------------------
export const DELIVERY_FEE = 2.49
export const FREE_DELIVERY_OVER = 30

export function deliveryFeeFor(subtotal: number): number {
  return subtotal >= FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE
}

// ---------------------------------------------------------------------------
// Delivery slots — the next few two-hour windows across today and tomorrow.
// ---------------------------------------------------------------------------
export interface DeliverySlot {
  /** Stable identifier, e.g. "2026-07-18T18". */
  id: string
  /** e.g. "Today, 6–8 pm". */
  label: string
}

const SLOT_START_HOURS = [8, 10, 12, 14, 16, 18, 20]
const ORDER_CUTOFF_MINUTES = 90

function formatHour(hour: number): string {
  if (hour === 12) return '12 pm'
  return hour < 12 ? `${hour} am` : `${hour - 12} pm`
}

/** Two-hour windows still bookable today (with a cutoff), plus all of tomorrow's. */
export function upcomingSlots(now: Date = new Date()): DeliverySlot[] {
  const slots: DeliverySlot[] = []
  for (const dayOffset of [0, 1]) {
    const day = new Date(now)
    day.setDate(day.getDate() + dayOffset)
    const dayName = dayOffset === 0 ? 'Today' : 'Tomorrow'
    for (const hour of SLOT_START_HOURS) {
      if (dayOffset === 0) {
        const start = new Date(now)
        start.setHours(hour, 0, 0, 0)
        if (start.getTime() - now.getTime() < ORDER_CUTOFF_MINUTES * 60_000) continue
      }
      const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
      slots.push({
        id: `${iso}T${String(hour).padStart(2, '0')}`,
        label: `${dayName}, ${formatHour(hour)}–${formatHour(hour + 2)}`,
      })
    }
  }
  return slots
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

function mapOrder(o: Order): Order {
  return {
    ...o,
    subtotal: Number(o.subtotal),
    delivery_fee: Number(o.delivery_fee),
    total: Number(o.total),
  }
}

export async function fetchOrders(userId: string): Promise<OrderWithItems[]> {
  const { data, error } = await requireClient()
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as unknown as OrderWithItems[]
  return rows.map((o) => ({
    ...mapOrder(o),
    items: (o.items ?? []).map((i) => ({ ...i, price: Number(i.price) })),
  }))
}

export async function fetchOrderWithItems(
  userId: string,
  orderId: string,
): Promise<OrderWithItems | null> {
  const { data, error } = await requireClient()
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('user_id', userId)
    .eq('id', orderId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const row = data as unknown as OrderWithItems
  return {
    ...mapOrder(row),
    items: (row.items ?? []).map((i) => ({ ...i, price: Number(i.price) })),
  }
}

export interface PlaceOrderInput {
  userId: string
  items: CartItem[]
  addressLabel: string
  addressLine: string
  slotLabel: string
  payment: {
    method: PaymentMethod
    provider: 'cod' | 'stripe'
    /** External reference (e.g. Stripe PaymentIntent id); null for COD. */
    providerPaymentId: string | null
  }
  /** Whether to write the "Order placed" inbox notification. */
  notifyOrders?: boolean
}

/**
 * Places the order: inserts the order and its line-item snapshots, records the
 * purchases in purchase_history (powering "Recently bought"), and empties the
 * persisted cart. Returns the new order id.
 *
 * Supabase-js has no client-side transactions, so the order insert leads and
 * any later step that fails surfaces an error while the order itself remains
 * intact and visible in Orders.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<string> {
  const { userId, items, addressLabel, addressLine, slotLabel, payment } = input
  if (items.length === 0) throw new Error('The cart is empty.')
  const client = requireClient()

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.product.price, 0)
  const delivery_fee = deliveryFeeFor(subtotal)
  const total = Number((subtotal + delivery_fee).toFixed(2))
  const orderId = crypto.randomUUID()

  // COD settles at the door; a confirmed card payment stays 'processing'
  // until the Stripe webhook (service role) flips it to 'paid' server-side.
  const payment_status = payment.method === 'cod' ? 'pending' : 'processing'

  const { error: orderError } = await client.from('orders').insert({
    id: orderId,
    user_id: userId,
    address_label: addressLabel,
    address_line: addressLine,
    delivery_slot: slotLabel,
    status: 'placed',
    subtotal: Number(subtotal.toFixed(2)),
    delivery_fee,
    total,
    payment_method: payment.method,
    payment_status,
  })
  if (orderError) throw new Error(orderError.message)


  const { error: paymentError } = await client.from('payments').insert({
    id: crypto.randomUUID(),
    order_id: orderId,
    user_id: userId,
    provider: payment.provider,
    status: payment_status,
    amount: total,
    currency: 'gbp',
    provider_payment_id: payment.providerPaymentId,
    refunded_amount: 0,
  })
  if (paymentError) throw new Error(paymentError.message)

  const lines: Array<Omit<OrderItem, 'id'> & { id: string }> = items.map((i) => ({
    id: crypto.randomUUID(),
    order_id: orderId,
    product_id: i.product.id,
    name: i.product.name,
    emoji: i.product.emoji,
    unit: i.product.unit,
    price: i.product.price,
    quantity: i.quantity,
  }))
  const { error: itemsError } = await client.from('order_items').insert(lines)
  if (itemsError) throw new Error(itemsError.message)

  // Record purchases (read-modify-write; PK user_id+product_id).
  const productIds = items.map((i) => i.product.id)
  const { data: existing } = await client
    .from('purchase_history')
    .select('product_id, times_purchased')
    .eq('user_id', userId)
    .in('product_id', productIds)
  const previous = new Map(
    ((existing ?? []) as Array<{ product_id: string; times_purchased: number }>).map((r) => [
      r.product_id,
      r.times_purchased,
    ]),
  )
  const now = new Date().toISOString()
  const { error: historyError } = await client.from('purchase_history').upsert(
    items.map((i) => ({
      user_id: userId,
      product_id: i.product.id,
      times_purchased: (previous.get(i.product.id) ?? 0) + 1,
      last_purchased_at: now,
    })),
  )
  if (historyError) throw new Error(historyError.message)

  // Empty the persisted cart.
  const { error: clearError } = await client.from('cart_items').delete().eq('user_id', userId)
  if (clearError) throw new Error(clearError.message)

  if (input.notifyOrders !== false) {
    await addNotification({
      userId,
      type: 'order_placed',
      title: 'Order placed',
      message:
        payment.method === 'cod'
          ? `Order #${orderId.slice(0, 8)} is in — pay ${formatPriceForMessage(total)} at the door.`
          : `Order #${orderId.slice(0, 8)} is in — ${formatPriceForMessage(total)} paid by card.`,
      orderId,
    })
  }

  return orderId
}

function formatPriceForMessage(amount: number): string {
  return `£${amount.toFixed(2)}`
}
