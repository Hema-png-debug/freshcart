/** A row in the public.profiles table. */
export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  email: string | null
  notify_orders: boolean
  notify_promos: boolean
  notify_announcements: boolean
  address_label: string | null
  address_line: string | null
  created_at: string
  updated_at: string
}

/** A row in public.categories. */
export interface Category {
  id: string
  slug: string
  name: string
  emoji: string
  color: string
  sort_order: number
  tagline: string
}

/** A row in public.offers. */
export interface Offer {
  id: string
  slug: string
  title: string
  subtitle: string
  discount_percent: number
  color: string
  active: boolean
  /** Scheduling window; null bounds are open-ended. */
  starts_at: string | null
  ends_at: string | null
  /** Featured promotions lead the homepage carousel. */
  featured: boolean
}

/** A row in public.products. */
export interface Product {
  id: string
  slug: string
  category_id: string
  offer_id: string | null
  name: string
  description: string
  emoji: string
  unit: string
  price: number
  original_price: number | null
  featured: boolean
  popularity: number
  units_sold: number
  in_stock: boolean
  /** Units on hand; the DB forces in_stock=false at zero. */
  stock_quantity: number
  brand: string
  rating: number
  rating_count: number
  is_organic: boolean
  is_new: boolean
  created_at: string
}

/** An item in the user's cart, joined with its product. */
export interface CartItem {
  product: Product
  quantity: number
}

/** Result shape returned by all auth actions in AuthContext. */
export interface AuthResult {
  ok: boolean
  /** Human-readable message for the UI (error text, or info such as "check your email"). */
  message?: string
}

export type ThemeMode = 'light' | 'dark'

/** What the user asked for; 'system' follows the OS setting live. */
export type ThemePreference = ThemeMode | 'system'

/** Lifecycle states an order can be in. */
export type OrderStatus = 'placed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'

/** How an order is (or will be) paid. */
export type PaymentMethod = 'cod' | 'card'

/** Settlement state of an order's payment. */
export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'refunded'

/** A row in public.orders. */
export interface Order {
  id: string
  user_id: string
  address_label: string
  address_line: string
  delivery_slot: string
  status: OrderStatus
  subtotal: number
  delivery_fee: number
  total: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  created_at: string
}

/** A line item snapshot in public.order_items. */
export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  name: string
  emoji: string
  unit: string
  price: number
  quantity: number
}

/** An order joined with its line items. */
export interface OrderWithItems extends Order {
  items: OrderItem[]
}

/** Kinds of notification the inbox can hold. */
export type NotificationType =
  | 'order_placed'
  | 'payment'
  | 'order_status'
  | 'promo'
  | 'announcement'

/** A row in public.notifications. */
export interface AppNotification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  order_id: string | null
  read: boolean
  created_at: string
}


