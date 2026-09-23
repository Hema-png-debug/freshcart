import { supabase } from './supabase'
import type { CartItem, Product } from '../types'

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

// ---------------------------------------------------------------------------
// Favourites
// ---------------------------------------------------------------------------

export async function fetchFavouriteIds(userId: string): Promise<string[]> {
  const { data, error } = await requireClient()
    .from('favourites')
    .select('product_id')
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  return ((data ?? []) as Array<{ product_id: string }>).map((r) => r.product_id)
}

export async function addFavourite(userId: string, productId: string): Promise<void> {
  const { error } = await requireClient()
    .from('favourites')
    .upsert({ user_id: userId, product_id: productId })
  if (error) throw new Error(error.message)
}

export async function removeFavourite(userId: string, productId: string): Promise<void> {
  const { error } = await requireClient()
    .from('favourites')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

interface CartRow {
  quantity: number
  product: Product | null
}

export async function fetchCartItems(userId: string): Promise<CartItem[]> {
  const { data, error } = await requireClient()
    .from('cart_items')
    .select('quantity, product:products(*)')
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as unknown as CartRow[]
  return rows.flatMap((r) =>
    r.product
      ? [
          {
            quantity: r.quantity,
            product: {
              ...r.product,
              price: Number(r.product.price),
              original_price:
                r.product.original_price === null ? null : Number(r.product.original_price),
            },
          },
        ]
      : [],
  )
}

export async function upsertCartItem(
  userId: string,
  productId: string,
  quantity: number,
): Promise<void> {
  const { error } = await requireClient()
    .from('cart_items')
    .upsert({ user_id: userId, product_id: productId, quantity, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
}

export async function deleteCartItem(userId: string, productId: string): Promise<void> {
  const { error } = await requireClient()
    .from('cart_items')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId)
  if (error) throw new Error(error.message)
}
