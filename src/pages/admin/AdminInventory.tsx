import { useMemo, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { useAsync } from '../../hooks/useAsync'
import { fetchAllProducts, setStockQuantity, LOW_STOCK_THRESHOLD } from '../../lib/adminService'
import type { Product } from '../../types'

function stockBadge(p: Product) {
  if (p.stock_quantity === 0)
    return <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-bold text-danger">Out of stock</span>
  if (p.stock_quantity <= LOW_STOCK_THRESHOLD)
    return <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">Low</span>
  if (!p.in_stock)
    return <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-bold text-muted">Hidden</span>
  return <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">OK</span>
}

/** Stock levels sorted lowest-first, with quick adjustments. */
export function AdminInventory() {
  const products = useAsync(fetchAllProducts, [])
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const sorted = useMemo(
    () => [...(products.data ?? [])].sort((a, b) => a.stock_quantity - b.stock_quantity),
    [products.data],
  )
  const outCount = sorted.filter((p) => p.stock_quantity === 0).length
  const lowCount = sorted.filter(
    (p) => p.stock_quantity > 0 && p.stock_quantity <= LOW_STOCK_THRESHOLD,
  ).length

  const adjust = async (p: Product, delta: number) => {
    const next = Math.max(0, p.stock_quantity + delta)
    if (next === p.stock_quantity) return
    setPendingId(p.id)
    setActionError(null)
    try {
      await setStockQuantity(p, next)
      products.reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update stock.')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle={`${outCount} out of stock · ${lowCount} running low`}
      />

      {actionError && (
        <p role="alert" className="mt-2 rounded-card bg-danger-soft p-3 text-sm font-medium text-danger">
          {actionError}
        </p>
      )}

      <div className="mt-3">
        {products.loading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : products.error ? (
          <ErrorBanner message="Couldn't load inventory." onRetry={products.reload} />
        ) : (
          <ul aria-label="Inventory" className="flex flex-col gap-2">
            {sorted.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-card bg-surface p-3 shadow-card">
                <span aria-hidden className="text-2xl">{p.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{p.name}</p>
                  <div className="mt-0.5 flex items-center gap-2">{stockBadge(p)}</div>
                </div>
                <div
                  className="flex shrink-0 items-center gap-1 rounded-full bg-surface-2 p-0.5"
                  role="group"
                  aria-label={`${p.name} stock`}
                >
                  <button
                    type="button"
                    disabled={pendingId === p.id || p.stock_quantity === 0}
                    onClick={() => void adjust(p, -1)}
                    aria-label={`Decrease stock of ${p.name}`}
                    className="grid h-8 w-8 place-items-center rounded-full text-ink hover:bg-line disabled:opacity-35"
                  >
                    <Minus size={14} aria-hidden />
                  </button>
                  <span
                    aria-live="polite"
                    aria-label={`${p.name}: ${p.stock_quantity} in stock`}
                    className="min-w-8 text-center text-sm font-bold text-ink"
                  >
                    {p.stock_quantity}
                  </span>
                  <button
                    type="button"
                    disabled={pendingId === p.id}
                    onClick={() => void adjust(p, 1)}
                    aria-label={`Increase stock of ${p.name}`}
                    className="grid h-8 w-8 place-items-center rounded-full bg-primary text-on-primary active:scale-90 disabled:opacity-35"
                  >
                    <Plus size={14} aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
