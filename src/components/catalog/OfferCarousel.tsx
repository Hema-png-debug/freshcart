import { memo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BadgePercent } from 'lucide-react'
import type { Offer } from '../../types'
import { Skeleton } from '../ui/Skeleton'
import { ErrorBanner } from '../ui/ErrorBanner'

export interface OfferCarouselProps {
  offers: Offer[] | null
  loading: boolean
  error: string | null
  onRetry: () => void
}

/** "Today's offers" banner rail; each banner opens that offer's products. */
export const OfferCarousel = memo(function OfferCarousel({ offers, loading, error, onRetry }: OfferCarouselProps) {
  if (loading) {
    return <Skeleton className="mt-5 h-28 w-full" />
  }
  if (error) {
    return (
      <div className="mt-5">
        <ErrorBanner message="Couldn't load today's offers." onRetry={onRetry} />
      </div>
    )
  }
  if (!offers || offers.length === 0) return null

  return (
    <section aria-label="Today's offers" className="mt-5">
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6">
        {offers.map((offer, i) => (
          <motion.div
            key={offer.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            className="w-[85%] shrink-0 snap-start sm:w-[70%]"
          >
            <Link
              to={`/products?offer=${offer.slug}`}
              className="relative block overflow-hidden rounded-card p-5 text-white shadow-card transition-transform duration-150 active:scale-[0.98]"
              style={{ backgroundColor: offer.color }}
            >
              <span
                aria-hidden
                className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/15"
              />
              <span
                aria-hidden
                className="absolute -bottom-10 right-10 h-24 w-24 rounded-full bg-white/10"
              />
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide opacity-90">
                <BadgePercent size={14} aria-hidden /> Today's offer
              </span>
              <span className="mt-1.5 block font-display text-xl font-extrabold leading-tight">
                {offer.title}
              </span>
              <span className="mt-1 block text-sm font-medium opacity-90">{offer.subtitle}</span>
              <span className="mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                Save up to {offer.discount_percent}% →
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
})
