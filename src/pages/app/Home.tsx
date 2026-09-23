import { useCallback } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { ThemeToggle } from '../../components/ui/ThemeToggle'
import { NotificationBell } from '../../components/ui/NotificationBell'
import { AddressButton } from '../../components/catalog/AddressButton'
import { HomeSearchButton } from '../../components/catalog/HomeSearchButton'
import { OfferCarousel } from '../../components/catalog/OfferCarousel'
import { CategoryRail } from '../../components/catalog/CategoryRail'
import { ProductCarousel } from '../../components/catalog/ProductCarousel'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { useCategoryNames } from '../../hooks/useCategoryNames'
import {
  fetchCategories,
  fetchOffers,
  fetchProducts,
  fetchRecentlyBought,
} from '../../lib/catalog'

function greetingForNow(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function Home() {
  const { profile, user } = useAuth()
  const firstName =
    profile?.full_name?.split(' ')[0] ??
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ??
    'there'
  const userId = user?.id

  const offers = useAsync(fetchOffers, [])
  const categories = useAsync(fetchCategories, [])
  const featured = useAsync(() => fetchProducts({ featured: true, limit: 8 }), [])
  const popular = useAsync(() => fetchProducts({ sort: 'popularity', limit: 8 }), [])
  const bestSellers = useAsync(() => fetchProducts({ sort: 'best_selling', limit: 8 }), [])
  const recentlyBought = useAsync(
    useCallback(() => (userId ? fetchRecentlyBought(userId) : Promise.resolve([])), [userId]),
    [userId],
  )

  const categoryNames = useCategoryNames()

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <AddressButton />
        <NotificationBell />
        <ThemeToggle />
      </div>

      <div className="mt-4">
        <PageHeader
          title={`${greetingForNow()}, ${firstName}`}
          subtitle="What's on the list today?"
        />
      </div>

      <div className="-mt-4">
        <HomeSearchButton />
      </div>

      <OfferCarousel
        offers={offers.data}
        loading={offers.loading}
        error={offers.error}
        onRetry={offers.reload}
      />

      <CategoryRail
        categories={categories.data}
        loading={categories.loading}
        error={categories.error}
        onRetry={categories.reload}
      />

      <ProductCarousel
        title="Featured"
        categoryNames={categoryNames}
        seeAllTo="/products?section=featured"
        products={featured.data}
        loading={featured.loading}
        error={featured.error}
        onRetry={featured.reload}
      />

      <ProductCarousel
        title="Popular right now"
        categoryNames={categoryNames}
        seeAllTo="/products?sort=popularity"
        products={popular.data}
        loading={popular.loading}
        error={popular.error}
        onRetry={popular.reload}
      />

      <ProductCarousel
        title="Recently bought"
        categoryNames={categoryNames}
        seeAllTo="/products?section=recent"
        products={recentlyBought.data}
        loading={recentlyBought.loading}
        error={recentlyBought.error}
        onRetry={recentlyBought.reload}
        emptyMessage="Your repeat buys will appear here after your first order."
      />

      <ProductCarousel
        title="Best sellers"
        categoryNames={categoryNames}
        seeAllTo="/products?sort=best_selling"
        products={bestSellers.data}
        loading={bestSellers.loading}
        error={bestSellers.error}
        onRetry={bestSellers.reload}
      />
    </>
  )
}
