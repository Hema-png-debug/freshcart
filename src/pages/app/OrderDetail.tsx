import { useCallback, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, MapPin, PackageSearch, RotateCcw } from 'lucide-react'
import { BackHeader } from '../../components/layout/BackHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { EmptyState } from '../../components/ui/EmptyState'
import { PaymentChip, StatusChip } from '../../components/orders/StatusChip'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useAsync } from '../../hooks/useAsync'
import { fetchOrderWithItems } from '../../lib/orders'
import { fetchProductsByIds } from '../../lib/catalog'
import { formatDate, formatPrice } from '../../lib/format'

/** A single order: confirmation banner (after checkout), snapshot, reorder. */
export function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const justPlaced = Boolean((location.state as { placed?: boolean } | null)?.placed)

  const { user } = useAuth()
  const userId = user?.id
  const { addItems } = useCart()
  const [reordering, setReordering] = useState(false)
  const [reorderNote, setReorderNote] = useState<string | null>(null)

  const order = useAsync(
    useCallback(
      () => (userId && id ? fetchOrderWithItems(userId, id) : Promise.resolve(null)),
      [userId, id],
    ),
    [userId, id],
  )

  const orderAgain = async () => {
    const items = order.data?.items ?? []
    if (items.length === 0) return
    setReordering(true)
    setReorderNote(null)
    try {
      const ids = items.flatMap((i) => (i.product_id ? [i.product_id] : []))
      const products = await fetchProductsByIds(ids)
      const available = new Map(products.map((p) => [p.id, p]))
      const lines = items.flatMap((i) => {
        const product = i.product_id ? available.get(i.product_id) : undefined
        return product ? [{ product, quantity: i.quantity }] : []
      })
      addItems(lines)
      const skipped = items.length - lines.length
      if (lines.length === 0) {
        setReorderNote('None of these items are available right now.')
        setReordering(false)
        return
      }
      if (skipped > 0) {
        setReorderNote(
          `Added ${lines.length} of ${items.length} items — ${skipped} no longer available.`,
        )
        setReordering(false)
        return
      }
      navigate('/cart')
    } catch {
      setReorderNote('Could not add these items right now. Please try again.')
      setReordering(false)
    }
  }

  if (!order.loading && !order.error && order.data === null) {
    return (
      <EmptyState
        icon={<PackageSearch size={28} />}
        title="Order not found"
        description="We couldn't find that order on your account."
        actionLabel="All orders"
        onAction={() => navigate('/orders')}
      />
    )
  }

  return (
    <>
      <BackHeader to="/orders" backLabel="Back to orders" title="Order details" />

      {order.loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-28" />
          <Skeleton className="h-40" />
        </div>
      ) : order.error ? (
        <ErrorBanner message="Couldn't load this order." onRetry={order.reload} />
      ) : order.data ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex flex-col gap-4"
        >
          {justPlaced && (
            <div
              role="status"
              className="flex items-center gap-2.5 rounded-card bg-primary-soft p-4 text-sm font-semibold text-primary"
            >
              <CheckCircle2 size={20} aria-hidden className="shrink-0" />
              Order placed! We'll get picking — it's booked for {order.data.delivery_slot.toLowerCase()}.
            </div>
          )}

          <Card className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-ink">{formatDate(order.data.created_at, true)}</p>
              <p className="text-xs text-muted">Order #{order.data.id.slice(0, 8)}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <StatusChip status={order.data.status} />
              <PaymentChip
                method={order.data.payment_method}
                status={order.data.payment_status}
              />
            </div>
          </Card>

          <Card className="flex flex-col gap-2 text-sm">
            <p className="flex items-center gap-1.5 text-ink">
              <MapPin size={15} aria-hidden className="shrink-0 text-primary" />
              <span className="font-semibold">{order.data.address_label}</span>
              <span className="truncate text-muted">· {order.data.address_line}</span>
            </p>
            <p className="flex items-center gap-1.5 text-ink">
              <Clock size={15} aria-hidden className="shrink-0 text-primary" />
              {order.data.delivery_slot}
            </p>
          </Card>

          <Card>
            <h2 className="mb-2 text-sm font-bold text-ink">Items</h2>
            <ul className="flex flex-col gap-2">
              {order.data.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 text-sm">
                  <span
                    aria-hidden
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-xl"
                  >
                    {item.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{item.name}</span>
                    <span className="block text-xs text-muted">
                      {item.unit} · {formatPrice(item.price)} × {item.quantity}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold text-ink">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3 text-sm">
              <p className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span>{formatPrice(order.data.subtotal)}</span>
              </p>
              <p className="flex justify-between text-muted">
                <span>Delivery</span>
                <span>
                  {order.data.delivery_fee === 0 ? 'Free' : formatPrice(order.data.delivery_fee)}
                </span>
              </p>
              <p className="mt-1 flex justify-between text-base font-bold text-ink">
                <span>Total</span>
                <span className="font-display text-lg font-extrabold">
                  {formatPrice(order.data.total)}
                </span>
              </p>
            </div>
          </Card>

          {reorderNote && <Alert tone="info">{reorderNote}</Alert>}

          <Button
            variant="secondary"
            fullWidth
            onClick={() => void orderAgain()}
            loading={reordering}
          >
            <RotateCcw size={15} aria-hidden className="mr-1.5" />
            Order again
          </Button>
        </motion.div>
      ) : null}
    </>
  )
}
