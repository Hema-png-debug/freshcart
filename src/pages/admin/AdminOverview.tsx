import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  LayoutGrid,
  PackageX,
  ReceiptText,
  ShoppingBasket,
  Users,
} from 'lucide-react'
import { StatCard } from '../../components/admin/StatCard'
import { PageHeader } from '../../components/layout/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { StatusChip, PaymentChip } from '../../components/orders/StatusChip'
import { useAsync } from '../../hooks/useAsync'
import { fetchAdminStats, LOW_STOCK_THRESHOLD } from '../../lib/adminService'
import { formatDate, formatPrice } from '../../lib/format'

/** The dashboard front page: metrics, recent orders, low-stock alerts. */
export function AdminOverview() {
  const stats = useAsync(fetchAdminStats, [])

  if (stats.loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    )
  }
  if (stats.error || !stats.data) {
    return <ErrorBanner message="Couldn't load the overview." onRetry={stats.reload} />
  }
  const s = stats.data

  return (
    <>
      <PageHeader title="Overview" subtitle="How the shop is doing" />

      <section aria-label="Store metrics" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Total products" value={String(s.totalProducts)} icon={<ShoppingBasket size={13} aria-hidden />} />
        <StatCard label="Total categories" value={String(s.totalCategories)} icon={<LayoutGrid size={13} aria-hidden />} />
        <StatCard label="Total customers" value={String(s.totalCustomers)} icon={<Users size={13} aria-hidden />} />
        <StatCard label="Total orders" value={String(s.totalOrders)} icon={<ReceiptText size={13} aria-hidden />} />
        <StatCard label="Pending orders" value={String(s.pendingOrders)} tone="accent" />
        <StatCard label="Completed orders" value={String(s.completedOrders)} />
        <StatCard label="Revenue" value={formatPrice(s.totalRevenue)} icon={<Banknote size={13} aria-hidden />} />
        <StatCard label="Today's orders" value={String(s.todaysOrders)} icon={<CalendarDays size={13} aria-hidden />} />
        <StatCard label="Today's revenue" value={formatPrice(s.todaysRevenue)} />
        <StatCard
          label="Low stock"
          value={String(s.lowStock.length)}
          tone={s.lowStock.length > 0 ? 'accent' : 'default'}
          icon={<AlertTriangle size={13} aria-hidden />}
        />
        <StatCard
          label="Out of stock"
          value={String(s.outOfStockCount)}
          tone={s.outOfStockCount > 0 ? 'danger' : 'default'}
          icon={<PackageX size={13} aria-hidden />}
        />
      </section>

      <section aria-label="Recent orders" className="mt-6">
        <h2 className="mb-2 font-display text-base font-bold text-ink">Recent orders</h2>
        {s.recentOrders.length === 0 ? (
          <p className="rounded-card bg-surface p-4 text-sm text-muted shadow-card">
            No orders yet — they'll appear here as they come in.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {s.recentOrders.map((order) => (
              <li key={order.id}>
                <Link
                  to="/admin/orders"
                  className="flex items-center gap-3 rounded-card bg-surface p-3.5 shadow-card"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
                      #{order.id.slice(0, 8)}
                      <StatusChip status={order.status} />
                      <PaymentChip method={order.payment_method} status={order.payment_status} />
                    </p>
                    <p className="text-xs text-muted">
                      {formatDate(order.created_at)} · {order.items.length}{' '}
                      {order.items.length === 1 ? 'line' : 'lines'}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-ink">
                    {formatPrice(order.total)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Low stock products" className="mt-6">
        <h2 className="mb-2 font-display text-base font-bold text-ink">
          Low stock (≤ {LOW_STOCK_THRESHOLD})
        </h2>
        {s.lowStock.length === 0 ? (
          <p className="rounded-card bg-surface p-4 text-sm text-muted shadow-card">
            Nothing is running low.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {s.lowStock.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-card bg-surface p-3.5 shadow-card"
              >
                <span aria-hidden className="text-xl">{p.emoji}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                  {p.name}
                </span>
                <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
                  {p.stock_quantity} left
                </span>
                <Link to="/admin/inventory" className="shrink-0 text-xs font-bold text-primary underline">
                  Restock
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
