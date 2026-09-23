import { useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, PackageSearch } from 'lucide-react'
import { ProductCard } from '../../components/catalog/ProductCard'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { EmptyState } from '../../components/ui/EmptyState'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { useCategoryNames } from '../../hooks/useCategoryNames'
import {
  fetchCategoryBySlug,
  fetchOfferBySlug,
  fetchProducts,
  fetchRecentlyBought,
  type ProductSort,
} from '../../lib/catalog'
import type { Product } from '../../types'

interface ListResult {
  title: string
  subtitle: string
  products: Product[]
}

const SORTS: Record<string, ProductSort> = {
  popularity: 'popularity',
  best_selling: 'best_selling',
  newest: 'newest',
  price_asc: 'price_asc',
  price_desc: 'price_desc',
}

/**
 * One flexible list screen behind every "See all", category tile, and offer
 * banner. Reads its filter from the query string:
 *   /products?category=fruits · ?offer=fresh-week · ?section=featured
 *   ?section=recent · ?sort=best_selling
 */
export function ProductList() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuth()

  const categorySlug = params.get('category')
  const offerSlug = params.get('offer')
  const section = params.get('section')
  const sortParam = params.get('sort')
  const userId = user?.id

  const load = useCallback(async (): Promise<ListResult> => {
    if (categorySlug) {
      const category = await fetchCategoryBySlug(categorySlug)
      if (!category) return { title: 'Category not found', subtitle: '', products: [] }
      const products = await fetchProducts({ categoryId: category.id, sort: 'popularity' })
      return {
        title: `${category.emoji} ${category.name}`,
        subtitle: `${products.length} ${products.length === 1 ? 'item' : 'items'}`,
        products,
      }
    }
    if (offerSlug) {
      const offer = await fetchOfferBySlug(offerSlug)
      if (!offer) return { title: 'Offer not found', subtitle: '', products: [] }
      const products = await fetchProducts({ offerId: offer.id, sort: 'popularity' })
      return { title: offer.title, subtitle: offer.subtitle, products }
    }
    if (section === 'featured') {
      const products = await fetchProducts({ featured: true, sort: 'popularity' })
      return { title: 'Featured', subtitle: 'Hand-picked by FreshCart', products }
    }
    if (section === 'recent') {
      const products = userId ? await fetchRecentlyBought(userId, 50) : []
      return { title: 'Recently bought', subtitle: 'Your repeat buys', products }
    }
    const sort = (sortParam && SORTS[sortParam]) || 'popularity'
    const titles: Record<ProductSort, string> = {
      popularity: 'Popular right now',
      best_selling: 'Best sellers',
      newest: 'New in',
      price_asc: 'Lowest price first',
      price_desc: 'Highest price first',
      discount: 'Biggest savings',
      name_asc: 'A to Z',
      name_desc: 'Z to A',
    }
    const products = await fetchProducts({ sort })
    return { title: titles[sort], subtitle: 'Across the whole store', products }
  }, [categorySlug, offerSlug, section, sortParam, userId])

  const { data, loading, error, reload } = useAsync(load, [load])
  const categoryNames = useCategoryNames()

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-ink shadow-card"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-extrabold tracking-tight text-ink">
            {loading ? 'Loading…' : (data?.title ?? 'Products')}
          </h1>
          {!loading && data?.subtitle && (
            <p className="truncate text-sm text-muted">{data.subtitle}</p>
          )}
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-44" />
            ))}
          </div>
        ) : error ? (
          <ErrorBanner message="Couldn't load products." onRetry={reload} />
        ) : data && data.products.length === 0 ? (
          <EmptyState
            icon={<PackageSearch size={28} />}
            title="Nothing here yet"
            description={
              section === 'recent'
                ? 'Products you buy will collect here so you can reorder in a tap.'
                : 'No products matched this view. Try another category or offer.'
            }
          />
        ) : data ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data.products.map((p) => (
              <ProductCard key={p.id} product={p} categoryName={categoryNames[p.category_id]} />
            ))}
          </div>
        ) : null}
      </div>
    </>
  )
}
