import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { addFavourite, fetchFavouriteIds, removeFavourite } from '../lib/userData'

interface FavouritesContextValue {
  /** Product ids the user has favourited. */
  ids: ReadonlySet<string>
  isFavourite: (productId: string) => boolean
  /** Optimistic toggle; rolls back if persistence fails. */
  toggle: (productId: string) => void
}

const FavouritesContext = createContext<FavouritesContextValue | null>(null)

export function FavouritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    if (!userId) {
      setIds(new Set())
      return
    }
    let active = true
    fetchFavouriteIds(userId).then(
      (list) => {
        if (active) setIds(new Set(list))
      },
      () => {},
    )
    return () => {
      active = false
    }
  }, [userId])

  const toggle = useCallback(
    (productId: string) => {
      if (!userId) return
      const prev = ids
      const next = new Set(prev)
      const adding = !next.has(productId)
      if (adding) next.add(productId)
      else next.delete(productId)
      setIds(next)
      const write = adding
        ? () => addFavourite(userId, productId)
        : () => removeFavourite(userId, productId)
      write().catch(() => setIds(prev))
    },
    [userId, ids],
  )

  const isFavourite = useCallback((productId: string) => ids.has(productId), [ids])

  const value = useMemo(() => ({ ids, isFavourite, toggle }), [ids, isFavourite, toggle])

  return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>
}

export function useFavourites(): FavouritesContextValue {
  const ctx = useContext(FavouritesContext)
  if (!ctx) throw new Error('useFavourites must be used inside <FavouritesProvider>')
  return ctx
}
