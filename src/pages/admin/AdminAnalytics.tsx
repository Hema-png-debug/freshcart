import { PageHeader } from '../../components/layout/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { useAsync } from '../../hooks/useAsync'
import { fetchAnalytics } from '../../lib/adminService'
import { formatPrice } from '../../lib/format'
import { StatusChip } from '../../components/orders/StatusChip'

/** Horizontal proportion bar (pure CSS — honest, no chart library). */
function Bar({ value, max }: { value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100)
  return (
    <span aria-hidden className="block h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </span>
  )
}

/** Basic analytics: sales, orders by status, top products and categories. */
export function AdminAnalytics() {
  const analytics = useAsync(fetchAnalytics, [])

  if (analytics.loading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    )
  }
  if (analytics.error || !analytics.data) {
    return <ErrorBanner message="Couldn't load analytics." onRetry={analytics.reload} />
  }
  const a = analytics.data
  const maxUnits = Math.max(1, ...a.topProducts.map((p) => p.units_sold))
  const maxCategoryUnits = Math.max(1, ...a.topCategories.map((c) => c.unitsSold))
  const maxStatus = Math.max(1, ...a.ordersByStatus.map((s) => s.count))

  return (
    <>
      <PageHeader title="Analytics" subtitle="A quick read on what's selling" />

      <section aria-label="Sales summary" className="rounded-card bg-surface p-4 shadow-card">
        <p className="text-xs font-semibold text-muted">Total sales (excluding cancelled)</p>
        <p className="mt-1 font-display text-2xl font-extrabold text-ink">
          {formatPrice(a.totalRevenue)}
        </p>
      </section>

      <section aria-label="Orders by status" className="mt-4 rounded-card bg-surface p-4 shadow-card">
        <h2 className="mb-3 font-display text-base font-bold text-ink">Orders by status</h2>
        {a.ordersByStatus.length === 0 ? (
          <p className="text-sm text-muted">No orders yet.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {a.ordersByStatus.map((row) => (
              <li key={row.status} className="flex items-center gap-3">
                <span className="w-36 shrink-0"><StatusChip status={row.status} /></span>
                <Bar value={row.count} max={maxStatus} />
                <span className="w-6 shrink-0 text-right text-sm font-bold text-ink">{row.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Most popular products" className="mt-4 rounded-card bg-surface p-4 shadow-card">
        <h2 className="mb-3 font-display text-base font-bold text-ink">Most popular products</h2>
        <ul className="flex flex-col gap-2.5">
          {a.topProducts.map((p) => (
            <li key={p.id} className="flex items-center gap-3">
              <span aria-hidden className="shrink-0 text-lg">{p.emoji}</span>
              <span className="w-36 shrink-0 truncate text-sm font-semibold text-ink">{p.name}</span>
              <Bar value={p.units_sold} max={maxUnits} />
              <span className="w-12 shrink-0 text-right text-xs font-bold text-muted">
                {p.units_sold.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Top-selling categories" className="mt-4 rounded-card bg-surface p-4 shadow-card">
        <h2 className="mb-3 font-display text-base font-bold text-ink">Top-selling categories</h2>
        <ul className="flex flex-col gap-2.5">
          {a.topCategories.map((row) => (
            <li key={row.category.id} className="flex items-center gap-3">
              <span aria-hidden className="shrink-0 text-lg">{row.category.emoji}</span>
              <span className="w-36 shrink-0 truncate text-sm font-semibold text-ink">
                {row.category.name}
              </span>
              <Bar value={row.unitsSold} max={maxCategoryUnits} />
              <span className="w-12 shrink-0 text-right text-xs font-bold text-muted">
                {row.unitsSold.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
