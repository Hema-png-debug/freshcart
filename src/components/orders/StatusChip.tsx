import { memo } from 'react'
import type { OrderStatus, PaymentMethod, PaymentStatus } from '../../types'

const STATUS_META: Record<OrderStatus, { label: string; className: string }> = {
  placed: { label: 'Placed', className: 'bg-primary-soft text-primary' },
  preparing: { label: 'Preparing', className: 'bg-accent/15 text-accent' },
  out_for_delivery: { label: 'Out for delivery', className: 'bg-accent/15 text-accent' },
  delivered: { label: 'Delivered', className: 'bg-primary-soft text-primary' },
  cancelled: { label: 'Cancelled', className: 'bg-danger-soft text-danger' },
}

/** Small pill describing an order's lifecycle state. */
export const StatusChip = memo(function StatusChip({ status }: { status: OrderStatus }) {
  const meta = STATUS_META[status]
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.className}`}
    >
      {meta.label}
    </span>
  )
})

const PAYMENT_META: Record<PaymentStatus, { label: string; className: string }> = {
  pending: { label: 'Pay at door', className: 'bg-surface-2 text-muted' },
  processing: { label: 'Processing payment', className: 'bg-accent/15 text-accent' },
  paid: { label: 'Paid', className: 'bg-primary-soft text-primary' },
  failed: { label: 'Payment failed', className: 'bg-danger-soft text-danger' },
  refunded: { label: 'Refunded', className: 'bg-surface-2 text-muted' },
}

/** Pill describing how (and whether) an order has been paid. */
export const PaymentChip = memo(function PaymentChip({
  method,
  status,
}: {
  method: PaymentMethod
  status: PaymentStatus
}) {
  // COD's 'pending' means "settle at the door", which is its own message;
  // a card payment pending/processing is genuinely in flight.
  const meta =
    method === 'cod' && status === 'pending'
      ? PAYMENT_META.pending
      : PAYMENT_META[status]
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.className}`}>
      {meta.label}
    </span>
  )
})
