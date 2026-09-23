import { useMemo } from 'react'
import { useAsync } from './useAsync'
import { fetchCategories } from '../lib/catalog'

/**
 * category_id → name lookup for product cards, backed by the cached
 * categories fetch. Extracted in the Phase 6 architecture review: this map
 * was built identically in Home, ProductList, and Search.
 */
export function useCategoryNames(): Record<string, string> {
  const categories = useAsync(fetchCategories, [])
  return useMemo(
    () => Object.fromEntries((categories.data ?? []).map((c) => [c.id, c.name])),
    [categories.data],
  )
}
