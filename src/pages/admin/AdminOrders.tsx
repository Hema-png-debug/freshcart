import { useCallback, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, ReceiptText } from 'lucide-react'
import { AdminSearch } from '../../components/admin/AdminSearch'
import { AdminSelect } from '../../components/admin/AdminSelect'
import { PageHeader } from '../../components/layout/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusChip, PaymentChip } from '../../components/orders/StatusChip'
import { useAsync } from '../../hooks/useAsync'
import { useDebounce } from '../../hooks/useDebounce'
import { fetchAllOrders, fetchCustomers, updateOrderStatus } from '../../lib/adminService'
import { formatDate, formatPrice } from '../../lib/format'
import type { Order, OrderStatus } from '../../types'

const STATUS_OPTIONS: Array<{ value: OrderStatus; label: string }> = [
  { value: 'placed', label: 'Placed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'out_for_delivery', label: 'Out for delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

/** All orders across customers: search, filter, expand, advance status. */
export function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')
  const [paymentFilter, setPaymentFilter] = useState<'all' | Order['payment_status']>('all')

  const orders = useAsync(
    useCallback(
      () =>
        fetchAllOrders({
          status: statusFilter === 'all' ? undefined : statusFilter,
          paymentStatus: paymentFilter === 'all' ? undefined : paymentFilter,
        }),
      [statusFilter, paymentFilter],
    ),
    [statusFilter, paymentFilter],
  )
  const customers = useAsync(fetchCustomers, [])

  const [term, setTerm] = useState('')
  const debounced = useDebounce(term.trim().toLowerCase(), 200)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const customerById = useMemo(
    () => new Map((customers.data ?? []).map((c) => [c.id, c])),
    [customers.data],
  )

  const visible = useMemo(() => {
    let list = orders.data ?? []
    if (debounced) {
      list = list.filter((o) => {
        const customer = customerById.get(o.user_id)
        return [o.id, o.address_line, customer?.full_name ?? '', customer?.email ?? '']
          .some((f) => f.toLowerCase().includes(debounced))
      })
    }
    return list
  }, [orders.data, debounced, customerById])

  const changeStatus = async (order: Order, status: OrderStatus) => {
    if (status === order.status) return
    setPendingId(order.id)
    setActionError(null)
    try {
      await updateOrderStatus(order, status)
      orders.reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update the order.')
    } finally {
      setPendingId(null)
    }
  }

  const selectClass =
    'h-10 rounded-field border border-line bg-surface px-2.5 text-sm font-semibold text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60'

  return (
    <>
      <PageHeader title="Orders" subtitle={`${orders.data?.length ?? 0} shown`} />

      <AdminSearch label="Search orders" placeholder="Search order id, customer, address…" value={term} onChange={setTerm} />

      <div className="mt-2 flex flex-wrap gap-2">
        <AdminSelect
          label="Status"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as 'all' | OrderStatus)}
        >
          <option value="all">All</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </AdminSelect>
        <AdminSelect
          label="Payment"
          value={paymentFilter}
          onChange={(v) => setPaymentFilter(v as 'all' | Order['payment_status'])}
        >
          <option value="all">All</option>
          <option value="pending">Pay at door</option>
          <option value="processing">Processing</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </AdminSelect>
      </div>

      {actionError && (
        <p role="alert" className="mt-3 rounded-card bg-danger-soft p-3 text-sm font-medium text-danger">
          {actionError}
        </p>
      )}

      <div className="mt-4">
        {orders.loading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : orders.error ? (
          <ErrorBanner message="Couldn't load orders." onRetry={orders.reload} />
        ) : visible.length === 0 ? (
          <EmptyState icon={<ReceiptText size={28} />} title="No orders match" description="Adjust the search or filters." />
        ) : (
          <ul aria-label="All orders" className="flex flex-col gap-2">
            {visible.map((order) => {
              const customer = customerById.get(order.user_id)
              const expanded = expandedId === order.id
              return (
                <li key={order.id} className="rounded-card bg-surface p-3.5 shadow-card">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : order.id)}
                    aria-expanded={expanded}
                    aria-label={`Order ${order.id.slice(0, 8)} details`}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
                        #{order.id.slice(0, 8)}
                        <StatusChip status={order.status} />
                        <PaymentChip method={order.payment_method} status={order.payment_status} />
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {customer?.full_name ?? 'Unknown customer'} · {formatDate(order.created_at)} ·{' '}
                        {order.delivery_slot}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-ink">{formatPrice(order.total)}</span>
                    {expanded ? (
                      <ChevronUp size={16} aria-hidden className="shrink-0 text-muted" />
                    ) : (
                      <ChevronDown size={16} aria-hidden className="shrink-0 text-muted" />
                    )}
                  </button>

                  {expanded && (
                    <div className="mt-3 border-t border-line pt-3">
                      <p className="text-xs text-muted">
                        {customer?.email ?? 'No email'} · {order.address_label} · {order.address_line}
                      </p>
                      <ul className="mt-2 flex flex-col gap-1">
                        {order.items.map((item) => (
                          <li key={item.id} className="flex items-baseline justify-between gap-2 text-sm">
                            <span className="min-w-0 truncate text-ink">
                              <span aria-hidden className="mr-1">{item.emoji}</span>
                              {item.name}
                              <span className="text-muted"> × {item.quantity}</span>
                            </span>
                            <span className="shrink-0 font-semibold text-ink">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
                        <span>
                          Subtotal {formatPrice(order.subtotal)} · Delivery{' '}
                          {order.delivery_fee === 0 ? 'free' : formatPrice(order.delivery_fee)}
                        </span>
                      </div>
                      <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-muted">
                        Update status
                        <select
                          value={order.status}
                          disabled={pendingId === order.id}
                          onChange={(e) => void changeStatus(order, e.target.value as OrderStatus)}
                          aria-label={`Status of order ${order.id.slice(0, 8)}`}
                          className={selectClass}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
