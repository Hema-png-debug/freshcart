import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import { BackHeader } from '../../components/layout/BackHeader'
import { ProductCard } from '../../components/catalog/ProductCard'
import { Skeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { useFavourites } from '../../context/FavouritesContext'
import { useAsync } from '../../hooks/useAsync'
import { useCategoryNames } from '../../hooks/useCategoryNames'
import { fetchProductsByIds } from '../../lib/catalog'

/** Everything the user has hearted; unhearting removes items live. */
export function Favourites() {
  const navigate = useNavigate()
  const { ids } = useFavourites()
  const categoryNames = useCategoryNames()

  // Fetch keyed on the id set so the grid follows hearts in real time.
  const idKey = useMemo(() => [...ids].sort().join(','), [ids])
  const products = useAsync(
    useCallback(
      () => fetchProductsByIds(idKey ? idKey.split(',') : [], { includeOutOfStock: true }),
      [idKey],
    ),
    [idKey],
  )

  return (
    <>
      <BackHeader
        to="/profile"
        backLabel="Back to profile"
        title="Favourites"
        subtitle={ids.size === 0 ? 'Your saved items' : `${ids.size} saved ${ids.size === 1 ? 'item' : 'items'}`}
      />

      {products.loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : products.error ? (
        <ErrorBanner message="Couldn't load your favourites." onRetry={products.reload} />
      ) : (products.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<Heart size={28} />}
          title="No favourites yet"
          description="Tap the heart on any product and it will be saved here."
          actionLabel="Browse categories"
          onAction={() => navigate('/categories')}
        />
      ) : (
        <ul aria-label="Favourite products" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {products.data!.map((p, i) => (
            <motion.li
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.25, ease: 'easeOut' }}
            >
              <ProductCard product={p} categoryName={categoryNames[p.category_id]} />
            </motion.li>
          ))}
        </ul>
      )}
    </>
  )
}
