import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight, ReceiptText } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { PaymentChip, StatusChip } from '../../components/orders/StatusChip'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { fetchOrders } from '../../lib/orders'
import { formatDate, formatPrice } from '../../lib/format'

/** Order history, newest first. */
export function Orders() {
  const { user } = useAuth()
  const userId = user?.id

  const orders = useAsync(
    useCallback(() => (userId ? fetchOrders(userId) : Promise.resolve([])), [userId]),
    [userId],
  )

  return (
    <>
      <PageHeader title="Orders" subtitle="Your order history" />

      {orders.loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : orders.error ? (
        <ErrorBanner message="Couldn't load your orders." onRetry={orders.reload} />
      ) : (orders.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<ReceiptText size={28} />}
          title="No orders yet"
          description="Once you place your first order, it will show up here with live status."
        />
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Past orders">
          {orders.data!.map((order, i) => {
            const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
            return (
              <motion.li
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.25, ease: 'easeOut' }}
              >
                <Link
                  to={`/order/${order.id}`}
                  aria-label={`Order from ${formatDate(order.created_at)}, ${formatPrice(order.total)}`}
                  className="flex items-center gap-3 rounded-card bg-surface p-4 shadow-card transition-transform duration-150 active:scale-[0.98]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-ink">
                        {formatDate(order.created_at)}
                      </span>
                      <StatusChip status={order.status} />
                      <PaymentChip method={order.payment_method} status={order.payment_status} />
                    </div>
                    <p className="mt-1 truncate text-lg" aria-hidden>
                      {order.items.slice(0, 6).map((item) => item.emoji).join(' ')}
                    </p>
                    <p className="text-xs text-muted">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'} · {order.delivery_slot}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-sm font-bold text-ink">{formatPrice(order.total)}</span>
                    <ChevronRight size={16} aria-hidden className="text-muted" />
                  </div>
                </Link>
              </motion.li>
            )
          })}
        </ul>
      )}
    </>
  )
}
