import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { deleteCartItem, fetchCartItems, upsertCartItem } from '../lib/userData'
import type { CartItem, Product } from '../types'

interface CartContextValue {
  items: CartItem[]
  /** Total number of units across all lines (drives the nav badge). */
  count: number
  subtotal: number
  loading: boolean
  quantityOf: (productId: string) => number
  add: (product: Product) => void
  increment: (productId: string) => void
  decrement: (productId: string) => void
  remove: (productId: string) => void
  /** Merge several lines into the cart at once (used by "Order again"). */
  addItems: (newItems: CartItem[]) => void
  /** Reset local state after checkout has already emptied the persisted cart. */
  clearLocal: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function byName(a: CartItem, b: CartItem): number {
  return a.product.name.localeCompare(b.product.name)
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setItems([])
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    fetchCartItems(userId).then(
      (rows) => {
        if (!active) return
        setItems([...rows].sort(byName))
        setLoading(false)
      },
      () => {
        if (!active) return
        setLoading(false)
      },
    )
    return () => {
      active = false
    }
  }, [userId])

  /**
   * Single write path: optimistically set the new quantity (0 removes the
   * line), persist, and roll back the optimistic state if the write fails.
   */
  const setQuantity = useCallback(
    (product: Product, quantity: number) => {
      if (!userId) return
      const prev = items
      const rest = prev.filter((i) => i.product.id !== product.id)
      const next = quantity > 0 ? [...rest, { product, quantity }].sort(byName) : rest
      setItems(next)
      const write =
        quantity > 0
          ? () => upsertCartItem(userId, product.id, quantity)
          : () => deleteCartItem(userId, product.id)
      write().catch(() => setItems(prev))
    },
    [userId, items],
  )

  const quantityOf = useCallback(
    (productId: string) => items.find((i) => i.product.id === productId)?.quantity ?? 0,
    [items],
  )

  const add = useCallback(
    (product: Product) => setQuantity(product, quantityOf(product.id) + 1),
    [setQuantity, quantityOf],
  )

  const withItem = useCallback(
    (productId: string, fn: (item: CartItem) => void) => {
      const item = items.find((i) => i.product.id === productId)
      if (item) fn(item)
    },
    [items],
  )

  const increment = useCallback(
    (productId: string) => withItem(productId, (i) => setQuantity(i.product, i.quantity + 1)),
    [withItem, setQuantity],
  )

  const decrement = useCallback(
    (productId: string) => withItem(productId, (i) => setQuantity(i.product, i.quantity - 1)),
    [withItem, setQuantity],
  )

  const remove = useCallback(
    (productId: string) => withItem(productId, (i) => setQuantity(i.product, 0)),
    [withItem, setQuantity],
  )

  const addItems = useCallback(
    (newItems: CartItem[]) => {
      if (!userId || newItems.length === 0) return
      const prev = items
      const merged = new Map(prev.map((i) => [i.product.id, { ...i }]))
      for (const line of newItems) {
        const current = merged.get(line.product.id)
        merged.set(line.product.id, {
          product: line.product,
          quantity: (current?.quantity ?? 0) + line.quantity,
        })
      }
      const next = [...merged.values()].sort(byName)
      setItems(next)
      Promise.all(
        next
          .filter((i) => newItems.some((n) => n.product.id === i.product.id))
          .map((i) => upsertCartItem(userId, i.product.id, i.quantity)),
      ).catch(() => setItems(prev))
    },
    [userId, items],
  )

  const clearLocal = useCallback(() => setItems([]), [])

  const { count, subtotal } = useMemo(() => {
    let c = 0
    let s = 0
    for (const i of items) {
      c += i.quantity
      s += i.quantity * i.product.price
    }
    return { count: c, subtotal: s }
  }, [items])

  const value = useMemo<CartContextValue>(
    () => ({ items, count, subtotal, loading, quantityOf, add, increment, decrement, remove, addItems, clearLocal }),
    [items, count, subtotal, loading, quantityOf, add, increment, decrement, remove, addItems, clearLocal],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
