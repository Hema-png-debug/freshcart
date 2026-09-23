import { memo, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Minus, Plus, Star } from 'lucide-react'
import type { Product } from '../../types'
import { formatPrice, discountPercent } from '../../lib/format'
import { useCart } from '../../context/CartContext'
import { useFavourites } from '../../context/FavouritesContext'

export interface ProductCardProps {
  product: Product
  /** Fixed width for horizontal carousels; fluid in grids. */
  fixedWidth?: boolean
  /** Category name shown under the product name (spec: card shows category). */
  categoryName?: string
}

/** Stops taps on inner controls from following the card's detail link. */
function guard(e: MouseEvent, action: () => void) {
  e.preventDefault()
  e.stopPropagation()
  action()
}

/**
 * Tappable product tile linking to the product's detail page, with instant
 * favourite and cart actions (optimistic, no refresh).
 */
export const ProductCard = memo(function ProductCard({
  product,
  fixedWidth = false,
  categoryName,
}: ProductCardProps) {
  const { quantityOf, add, increment, decrement } = useCart()
  const { isFavourite, toggle } = useFavourites()

  const discounted = product.original_price !== null && product.original_price > product.price
  const quantity = quantityOf(product.id)
  const fav = isFavourite(product.id)

  return (
    <Link
      to={`/product/${product.id}`}
      aria-label={`${product.name}, ${formatPrice(product.price)}${product.in_stock ? '' : ', out of stock'}`}
      className={`group relative flex flex-col rounded-card bg-surface p-3 shadow-card transition-transform duration-150 active:scale-[0.97] ${
        fixedWidth ? 'w-40 shrink-0 sm:w-44' : ''
      }`}
    >
      <span
        aria-hidden
        className={`relative grid h-20 place-items-center rounded-xl bg-surface-2 text-4xl transition-transform duration-200 group-hover:scale-105 ${
          product.in_stock ? '' : 'opacity-45 grayscale'
        }`}
      >
        {product.emoji}
        {discounted && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-accent px-2 py-0.5 text-[0.6875rem] font-bold text-white">
            −{discountPercent(product.price, product.original_price!)}%
          </span>
        )}
      </span>

      <button
        type="button"
        onClick={(e) => guard(e, () => toggle(product.id))}
        aria-label={fav ? `Remove ${product.name} from favourites` : `Add ${product.name} to favourites`}
        aria-pressed={fav}
        className={`absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-surface shadow-card transition-colors ${
          fav ? 'text-danger' : 'text-muted hover:text-ink'
        }`}
      >
        <Heart size={15} fill={fav ? 'currentColor' : 'none'} aria-hidden />
      </button>

      <span className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-ink">
        {product.name}
      </span>
      <span className="mt-0.5 truncate text-xs text-muted">
        {categoryName ? `${categoryName} · ` : ''}
        {product.unit}
      </span>

      <span className="mt-1 flex items-center gap-1 text-xs font-medium text-ink">
        <Star size={12} aria-hidden className="fill-accent text-accent" />
        {product.rating.toFixed(1)}
        <span className="text-muted">({product.rating_count.toLocaleString()})</span>
        {!product.in_stock && (
          <span className="ml-auto rounded-full bg-danger-soft px-1.5 py-0.5 text-[0.625rem] font-bold text-danger">
            Out of stock
          </span>
        )}
      </span>

      <span className="mt-auto flex items-center justify-between gap-2 pt-2">
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="text-[0.9375rem] font-bold text-ink">{formatPrice(product.price)}</span>
          {discounted && <s className="text-xs text-muted">{formatPrice(product.original_price!)}</s>}
        </span>

        {!product.in_stock ? null : quantity === 0 ? (
          <button
            type="button"
            onClick={(e) => guard(e, () => add(product))}
            aria-label={`Add ${product.name} to cart`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-on-primary shadow-card transition-transform active:scale-90"
          >
            <Plus size={16} aria-hidden />
          </button>
        ) : (
          <span
            className="flex shrink-0 items-center gap-1 rounded-full bg-primary-soft p-0.5"
            role="group"
            aria-label={`${product.name} quantity`}
          >
            <button
              type="button"
              onClick={(e) => guard(e, () => decrement(product.id))}
              aria-label={`Decrease quantity of ${product.name}`}
              className="grid h-7 w-7 place-items-center rounded-full text-primary transition-transform active:scale-90"
            >
              <Minus size={14} aria-hidden />
            </button>
            <span aria-live="polite" className="min-w-4 text-center text-sm font-bold text-primary">
              {quantity}
            </span>
            <button
              type="button"
              onClick={(e) => guard(e, () => increment(product.id))}
              aria-label={`Increase quantity of ${product.name}`}
              className="grid h-7 w-7 place-items-center rounded-full bg-primary text-on-primary transition-transform active:scale-90"
            >
              <Plus size={14} aria-hidden />
            </button>
          </span>
        )}
      </span>
    </Link>
  )
})
