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
import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../lib/notificationService'
import type { AppNotification } from '../types'

interface NotificationsContextValue {
  items: AppNotification[]
  unreadCount: number
  loading: boolean
  error: boolean
  reload: () => void
  /** Optimistic; resolves after the row is persisted. */
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  remove: (id: string) => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

/**
 * The signed-in user's notification inbox. Loaded once per session (and on
 * demand via reload); mutations update local state optimistically and roll
 * back if the write fails.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id ?? null

  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    if (!userId) {
      setItems([])
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    setError(false)
    fetchNotifications(userId)
      .then((rows) => {
        if (active) setItems(rows)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [userId, generation])

  const reload = useCallback(() => setGeneration((g) => g + 1), [])

  const markRead = useCallback(
    async (id: string) => {
      if (!userId) return
      const previous = items
      setItems((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)))
      try {
        await markNotificationRead(userId, id)
      } catch {
        setItems(previous)
      }
    },
    [userId, items],
  )

  const markAllRead = useCallback(async () => {
    if (!userId) return
    const previous = items
    setItems((list) => list.map((n) => ({ ...n, read: true })))
    try {
      await markAllNotificationsRead(userId)
    } catch {
      setItems(previous)
    }
  }, [userId, items])

  const remove = useCallback(
    async (id: string) => {
      if (!userId) return
      const previous = items
      setItems((list) => list.filter((n) => n.id !== id))
      try {
        await deleteNotification(userId, id)
      } catch {
        setItems(previous)
      }
    },
    [userId, items],
  )

  const value = useMemo(
    () => ({
      items,
      unreadCount: items.filter((n) => !n.read).length,
      loading,
      error,
      reload,
      markRead,
      markAllRead,
      remove,
    }),
    [items, loading, error, reload, markRead, markAllRead, remove],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationsProvider>')
  return ctx
}
