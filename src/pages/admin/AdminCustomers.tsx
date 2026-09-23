import { useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { AdminSearch } from '../../components/admin/AdminSearch'
import { PageHeader } from '../../components/layout/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { EmptyState } from '../../components/ui/EmptyState'
import { useAsync } from '../../hooks/useAsync'
import { useDebounce } from '../../hooks/useDebounce'
import { fetchAllOrders, fetchCustomers } from '../../lib/adminService'
import { formatPrice } from '../../lib/format'

/** Registered customers with search, addresses, and order summaries. */
export function AdminCustomers() {
  const customers = useAsync(fetchCustomers, [])
  const orders = useAsync(() => fetchAllOrders(), [])
  const [term, setTerm] = useState('')
  const debounced = useDebounce(term.trim().toLowerCase(), 200)

  const orderSummary = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>()
    for (const o of orders.data ?? []) {
      const entry = map.get(o.user_id) ?? { count: 0, total: 0 }
      entry.count += 1
      if (o.status !== 'cancelled') entry.total += o.total
      map.set(o.user_id, entry)
    }
    return map
  }, [orders.data])

  const visible = useMemo(() => {
    const list = customers.data ?? []
    if (!debounced) return list
    return list.filter((c) =>
      [c.full_name ?? '', c.email ?? '', c.phone ?? ''].some((f) =>
        f.toLowerCase().includes(debounced),
      ),
    )
  }, [customers.data, debounced])

  return (
    <>
      <PageHeader title="Customers" subtitle={`${customers.data?.length ?? 0} registered`} />

      <AdminSearch label="Search customers" placeholder="Search name, email, phone…" value={term} onChange={setTerm} />

      <div className="mt-3">
        {customers.loading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : customers.error ? (
          <ErrorBanner message="Couldn't load customers." onRetry={customers.reload} />
        ) : visible.length === 0 ? (
          <EmptyState icon={<Users size={28} />} title="No customers match" description="Try a different search." />
        ) : (
          <ul aria-label="Customers" className="flex flex-col gap-2">
            {visible.map((c) => {
              const summary = orderSummary.get(c.id)
              const initial = (c.full_name ?? c.email ?? '?').trim().charAt(0).toUpperCase()
              return (
                <li key={c.id} className="flex items-center gap-3 rounded-card bg-surface p-3.5 shadow-card">
                  <span
                    aria-hidden
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-extrabold text-primary"
                  >
                    {initial}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{c.full_name ?? 'Unnamed'}</p>
                    <p className="truncate text-xs text-muted">
                      {c.email ?? 'No email on file'}
                      {c.phone ? ` · ${c.phone}` : ''}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {c.address_label && c.address_line
                        ? `${c.address_label} · ${c.address_line}`
                        : 'No address saved'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-ink">{summary?.count ?? 0} orders</p>
                    <p className="text-xs text-muted">{formatPrice(summary?.total ?? 0)}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
