import { useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, PackageX, Star, TrendingUp } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { EmptyState } from '../../components/ui/EmptyState'
import { useAsync } from '../../hooks/useAsync'
import { fetchProductWithCategory, type ProductWithCategory } from '../../lib/catalog'
import { discountPercent, formatPrice } from '../../lib/format'

export function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Product + category arrive in one round trip (embedded join).
  const load = useCallback(
    async (): Promise<ProductWithCategory | null> => (id ? fetchProductWithCategory(id) : null),
    [id],
  )

  const { data, loading, error, reload } = useAsync(load, [load])
  const product = data ?? null
  const category = data?.category ?? null
  const discounted =
    product !== null && product.original_price !== null && product.original_price > product.price

  return (
    <>
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="Go back"
        className="grid h-10 w-10 place-items-center rounded-full bg-surface text-ink shadow-card"
      >
        <ArrowLeft size={18} />
      </button>

      {loading ? (
        <div className="mt-5 flex flex-col gap-4">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : error ? (
        <div className="mt-5">
          <ErrorBanner message="Couldn't load this product." onRetry={reload} />
        </div>
      ) : !product ? (
        <EmptyState
          icon={<PackageX size={28} />}
          title="Product not found"
          description="It may have been removed from the store."
          actionLabel="Back to Home"
          onAction={() => navigate('/home')}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="mt-5"
        >
          <div className="relative grid h-56 place-items-center rounded-card bg-surface-2">
            {discounted && (
              <span className="absolute left-4 top-4 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-white">
                −{discountPercent(product.price, product.original_price!)}% off
              </span>
            )}
            <motion.span
              aria-hidden
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="text-8xl"
            >
              {product.emoji}
            </motion.span>
          </div>

          <div className="mt-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
                {product.name}
              </h1>
              <p className="mt-0.5 text-sm text-muted">{product.unit}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-2xl font-extrabold text-ink">{formatPrice(product.price)}</p>
              {discounted && (
                <s className="text-sm text-muted">{formatPrice(product.original_price!)}</s>
              )}
            </div>
          </div>

          {category && (
            <Link
              to={`/category/${category.slug}`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-semibold text-primary"
            >
              <span aria-hidden>{category.emoji}</span> {category.name}
            </Link>
          )}

          <p className="mt-4 leading-relaxed text-ink">{product.description}</p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Card outlined className="flex items-center gap-3 !p-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary" aria-hidden>
                <TrendingUp size={17} />
              </span>
              <span>
                <span className="block text-sm font-bold text-ink">
                  {product.units_sold.toLocaleString()}
                </span>
                <span className="block text-xs text-muted">sold recently</span>
              </span>
            </Card>
            <Card outlined className="flex items-center gap-3 !p-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-accent" aria-hidden>
                <Star size={17} />
              </span>
              <span>
                <span className="block text-sm font-bold text-ink">
                  {product.featured ? 'Featured' : 'In stock'}
                </span>
                <span className="block text-xs text-muted">
                  {product.featured ? 'FreshCart pick' : 'Ready to deliver'}
                </span>
              </span>
            </Card>
          </div>
        </motion.div>
      )}
    </>
  )
}
