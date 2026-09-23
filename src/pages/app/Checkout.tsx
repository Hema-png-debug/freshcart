import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Banknote, Clock, CreditCard, MapPin, ShoppingCart } from 'lucide-react'
import { BackHeader } from '../../components/layout/BackHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { formatPrice } from '../../lib/format'
import { deliveryFeeFor, FREE_DELIVERY_OVER, placeOrder, upcomingSlots } from '../../lib/orders'
import {
  availablePaymentMethods,
  confirmCardPayment,
  humanPaymentError,
  processCashOnDelivery,
  startCardPayment,
  type CardSession,
  type PaymentResult,
} from '../../lib/paymentService'
import type { PaymentMethod } from '../../types'

/** Review-and-place screen: address, delivery slot, totals, place order. */
export function Checkout() {
  const navigate = useNavigate()
  const { user, profile, updateProfile } = useAuth()
  const { items, subtotal, loading, clearLocal } = useCart()

  const slots = useMemo(() => upcomingSlots(), [])
  const [slotId, setSlotId] = useState<string | null>(slots[0]?.id ?? null)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fee = deliveryFeeFor(subtotal)
  const total = subtotal + fee

  // Payment method selection + (when Stripe is configured) the card session.
  const paymentMethods = useMemo(() => availablePaymentMethods(), [])
  const [method, setMethod] = useState<PaymentMethod>('cod')
  const [cardSession, setCardSession] = useState<CardSession | null>(null)
  const [cardError, setCardError] = useState<string | null>(null)
  const cardMountRef = useRef<HTMLDivElement | null>(null)

  // Selecting Card prepares a PaymentIntent and mounts Stripe's hosted
  // Payment Element (card details never pass through app code).
  useEffect(() => {
    if (method !== 'card' || !user) return
    let active = true
    let mounted: { unmount: () => void } | null = null
    setCardError(null)
    void startCardPayment({ amount: total, currency: 'gbp', userId: user.id }).then((result) => {
      if (!active) return
      if ('error' in result) {
        setCardError(humanPaymentError(result.error))
        return
      }
      setCardSession(result.session)
      if (cardMountRef.current) {
        const element = result.session.elements.create('payment')
        element.mount(cardMountRef.current)
        mounted = element
      }
    })
    return () => {
      active = false
      mounted?.unmount()
      setCardSession(null)
    }
    // Recreates the intent if the basket total changes so the charged amount
    // can never drift from the order total.
  }, [method, user, total])

  // Inline address capture for users who haven't saved one yet.
  const hasAddress = Boolean(profile?.address_label && profile.address_line)
  const [addressLabel, setAddressLabel] = useState('Home')
  const [addressLine, setAddressLine] = useState('')
  const [savingAddress, setSavingAddress] = useState(false)

  const slot = slots.find((s) => s.id === slotId) ?? null

  const saveAddress = async () => {
    if (!addressLine.trim()) return
    setSavingAddress(true)
    setError(null)
    const result = await updateProfile({
      address_label: addressLabel.trim() || 'Home',
      address_line: addressLine.trim(),
    })
    if (!result.ok) setError(result.message ?? 'Could not save the address.')
    setSavingAddress(false)
  }

  const submit = async () => {
    if (!user || !profile?.address_label || !profile.address_line || !slot) return
    setPlacing(true)
    setError(null)
    try {
      // 1) Take (or arrange) the payment. On failure nothing is charged and
      //    no order exists — the user can retry or switch method freely.
      let payment: PaymentResult
      if (method === 'card') {
        if (!cardSession) {
          setError('The card form is still loading — one moment.')
          setPlacing(false)
          return
        }
        payment = await confirmCardPayment(cardSession)
      } else {
        payment = processCashOnDelivery()
      }
      if (!payment.ok) {
        setError(humanPaymentError(payment.error))
        setPlacing(false)
        return
      }

      // 2) Record the order with its payment snapshot + ledger row.
      const orderId = await placeOrder({
        userId: user.id,
        items,
        addressLabel: profile.address_label,
        addressLine: profile.address_line,
        slotLabel: slot.label,
        payment: {
          method,
          provider: payment.provider,
          providerPaymentId: payment.providerPaymentId,
        },
        notifyOrders: profile.notify_orders,
      })
      clearLocal()
      navigate(`/order/${orderId}`, { replace: true, state: { placed: true } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not place the order.')
      setPlacing(false)
    }
  }

  if (!loading && items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingCart size={28} />}
        title="Nothing to check out"
        description="Your cart is empty — add some items first."
        actionLabel="Browse categories"
        onAction={() => navigate('/categories')}
      />
    )
  }

  return (
    <>
      <BackHeader to="/cart" backLabel="Back to cart" title="Checkout" subtitle="Almost there" />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex flex-col gap-4"
      >
        {/* Delivery address */}
        <Card>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink">
            <MapPin size={15} aria-hidden className="text-primary" />
            Delivery address
          </h2>
          {hasAddress ? (
            <p className="text-sm text-ink">
              <span className="font-semibold">{profile!.address_label}</span>
              <span className="text-muted"> · {profile!.address_line}</span>
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted">Where should this order go?</p>
              <Input
                label="Label"
                value={addressLabel}
                onChange={(e) => setAddressLabel(e.target.value)}
                placeholder="Home"
              />
              <Input
                label="Address"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="12 Rosemary Lane, London"
              />
              <Button
                onClick={() => void saveAddress()}
                loading={savingAddress}
                disabled={!addressLine.trim()}
              >
                Save address
              </Button>
            </div>
          )}
        </Card>

        {/* Delivery slot */}
        <Card>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink">
            <Clock size={15} aria-hidden className="text-primary" />
            Delivery time
          </h2>
          <div role="radiogroup" aria-label="Delivery time slot" className="flex flex-wrap gap-2">
            {slots.map((s) => {
              const selected = s.id === slotId
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setSlotId(s.id)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                    selected
                      ? 'border-primary bg-primary-soft text-primary'
                      : 'border-line bg-surface text-ink hover:bg-surface-2'
                  }`}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </Card>

        {/* Payment method */}
        <Card>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink">
            <CreditCard size={15} aria-hidden className="text-primary" />
            Payment
          </h2>
          <div role="radiogroup" aria-label="Payment method" className="flex flex-col gap-2">
            {paymentMethods.map((option) => {
              const selected = option.method === method
              const Icon = option.method === 'cod' ? Banknote : CreditCard
              return (
                <button
                  key={option.method}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setMethod(option.method)}
                  className={`flex items-center gap-3 rounded-field border p-3 text-left transition-colors ${
                    selected
                      ? 'border-primary bg-primary-soft'
                      : 'border-line bg-surface hover:bg-surface-2'
                  }`}
                >
                  <Icon
                    size={18}
                    aria-hidden
                    className={selected ? 'shrink-0 text-primary' : 'shrink-0 text-muted'}
                  />
                  <span className="min-w-0">
                    <span
                      className={`block text-sm font-bold ${selected ? 'text-primary' : 'text-ink'}`}
                    >
                      {option.label}
                    </span>
                    <span className="block text-xs text-muted">{option.description}</span>
                  </span>
                </button>
              )
            })}
          </div>
          {method === 'card' && (
            <div className="mt-3">
              {cardError ? (
                <Alert tone="error">{cardError}</Alert>
              ) : (
                <div ref={cardMountRef} aria-label="Card details" />
              )}
            </div>
          )}
        </Card>

        {/* Order summary */}
        <Card>
          <h2 className="mb-2 text-sm font-bold text-ink">Order summary</h2>
          <ul className="flex flex-col gap-1.5">
            {items.map((i) => (
              <li key={i.product.id} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-ink">
                  <span aria-hidden className="mr-1">{i.product.emoji}</span>
                  {i.product.name}
                  <span className="text-muted"> × {i.quantity}</span>
                </span>
                <span className="shrink-0 font-semibold text-ink">
                  {formatPrice(i.product.price * i.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3 text-sm">
            <p className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </p>
            <p className="flex justify-between text-muted">
              <span>Delivery</span>
              <span>{fee === 0 ? 'Free' : formatPrice(fee)}</span>
            </p>
            {fee > 0 && (
              <p className="text-xs text-muted">
                Free delivery on orders over {formatPrice(FREE_DELIVERY_OVER)}.
              </p>
            )}
            <p className="mt-1 flex justify-between text-base font-bold text-ink">
              <span>Total</span>
              <span className="font-display text-lg font-extrabold">{formatPrice(total)}</span>
            </p>
          </div>
        </Card>

        {error && <Alert tone="error">{error}</Alert>}

        <Button
          fullWidth
          onClick={() => void submit()}
          loading={placing}
          disabled={!hasAddress || !slot || items.length === 0}
        >
          {method === 'cod' ? 'Place order' : 'Pay & place order'} · {formatPrice(total)}
        </Button>
        {!hasAddress && (
          <p className="text-center text-xs text-muted">Save a delivery address to place the order.</p>
        )}
      </motion.div>
    </>
  )
}
