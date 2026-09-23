import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { Card } from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/Button'
import { useCart } from '../../context/CartContext'
import { formatPrice } from '../../lib/format'

/** The basket: live line items with quantity controls and a running subtotal. */
export function Cart() {
  const navigate = useNavigate()
  const { items, count, subtotal, loading, increment, decrement, remove } = useCart()

  return (
    <>
      <PageHeader
        title="Cart"
        subtitle={count === 0 ? 'Your basket' : `${count} ${count === 1 ? 'item' : 'items'}`}
      />

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart size={28} />}
          title="Your cart is empty"
          description="Items you add will collect here, ready for checkout."
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3" aria-label="Cart items">
            {items.map((item) => (
              <motion.li
                key={item.product.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card flush className="flex items-center gap-3 p-3">
                  <Link
                    to={`/product/${item.product.id}`}
                    aria-label={`View ${item.product.name}`}
                    className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-surface-2 text-2xl"
                  >
                    <span aria-hidden>{item.product.emoji}</span>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{item.product.name}</p>
                    <p className="text-xs text-muted">
                      {item.product.unit} · {formatPrice(item.product.price)} each
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-ink">
                      {formatPrice(item.product.price * item.quantity)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <button
                      type="button"
                      onClick={() => remove(item.product.id)}
                      aria-label={`Remove ${item.product.name} from cart`}
                      className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                    <span
                      className="flex items-center gap-1 rounded-full bg-primary-soft p-0.5"
                      role="group"
                      aria-label={`${item.product.name} quantity`}
                    >
                      <button
                        type="button"
                        onClick={() => decrement(item.product.id)}
                        aria-label={`Decrease quantity of ${item.product.name}`}
                        className="grid h-7 w-7 place-items-center rounded-full text-primary transition-transform active:scale-90"
                      >
                        <Minus size={14} aria-hidden />
                      </button>
                      <span
                        aria-live="polite"
                        className="min-w-4 text-center text-sm font-bold text-primary"
                      >
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => increment(item.product.id)}
                        aria-label={`Increase quantity of ${item.product.name}`}
                        className="grid h-7 w-7 place-items-center rounded-full bg-primary text-on-primary transition-transform active:scale-90"
                      >
                        <Plus size={14} aria-hidden />
                      </button>
                    </span>
                  </div>
                </Card>
              </motion.li>
            ))}
          </ul>

          <Card className="mt-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-muted">Subtotal</span>
            <span className="font-display text-xl font-extrabold text-ink">
              {formatPrice(subtotal)}
            </span>
          </Card>
          <Button fullWidth className="mt-3" onClick={() => navigate('/checkout')}>
            Checkout · {formatPrice(subtotal)}
          </Button>
        </>
      )}
    </>
  )
}
