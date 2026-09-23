import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bell,
  BellOff,
  CheckCheck,
  CreditCard,
  Megaphone,
  ShoppingBag,
  Tag,
  Trash2,
  Truck,
} from 'lucide-react'
import { BackHeader } from '../../components/layout/BackHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { Skeleton } from '../../components/ui/Skeleton'
import { useNotifications } from '../../context/NotificationsContext'
import { formatDate } from '../../lib/format'
import type { AppNotification, NotificationType } from '../../types'

const TYPE_ICONS: Record<NotificationType, typeof Bell> = {
  order_placed: ShoppingBag,
  payment: CreditCard,
  order_status: Truck,
  promo: Tag,
  announcement: Megaphone,
}

type Filter = 'all' | 'unread'

/** The notification centre: filter, read, mark-all, delete, open orders. */
export function Notifications() {
  const navigate = useNavigate()
  const { items, unreadCount, loading, error, reload, markRead, markAllRead, remove } =
    useNotifications()
  const [filter, setFilter] = useState<Filter>('all')

  const visible = useMemo(
    () => (filter === 'unread' ? items.filter((n) => !n.read) : items),
    [items, filter],
  )

  const open = async (n: AppNotification) => {
    if (!n.read) await markRead(n.id)
    if (n.order_id) navigate(`/order/${n.order_id}`)
  }

  return (
    <>
      <BackHeader
        to="/home"
        backLabel="Back to home"
        title="Notifications"
        subtitle={unreadCount === 0 ? "You're all caught up" : `${unreadCount} unread`}
      />

      <div className="mb-3 flex items-center justify-between gap-2">
        <div role="radiogroup" aria-label="Filter notifications" className="flex gap-2">
          {(['all', 'unread'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={filter === value}
              onClick={() => setFilter(value)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                filter === value
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-2 text-ink hover:bg-line'
              }`}
            >
              {value === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="flex items-center gap-1.5 text-sm font-bold text-primary"
          >
            <CheckCheck size={15} aria-hidden />
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : error ? (
        <ErrorBanner message="Couldn't load your notifications." onRetry={reload} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={filter === 'unread' ? <BellOff size={28} /> : <Bell size={28} />}
          title={filter === 'unread' ? 'Nothing unread' : 'No notifications yet'}
          description={
            filter === 'unread'
              ? "You've read everything — nice."
              : 'Order updates and news from the shop will land here.'
          }
        />
      ) : (
        <ul aria-label="Notifications" className="flex flex-col gap-2">
          {visible.map((n, i) => {
            const Icon = TYPE_ICONS[n.type] ?? Bell
            return (
              <motion.li
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.25), duration: 0.2, ease: 'easeOut' }}
                className={`flex items-start gap-3 rounded-card p-3.5 shadow-card ${
                  n.read ? 'bg-surface' : 'bg-primary-soft'
                }`}
              >
                <span
                  aria-hidden
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                    n.read ? 'bg-surface-2 text-muted' : 'bg-surface text-primary'
                  }`}
                >
                  <Icon size={17} />
                </span>
                <button
                  type="button"
                  onClick={() => void open(n)}
                  className="min-w-0 flex-1 text-left"
                  aria-label={`${n.read ? '' : 'Unread: '}${n.title}${n.order_id ? ', opens the order' : ''}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold text-ink">{n.title}</span>
                    {!n.read && (
                      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </span>
                  <span className="mt-0.5 block text-sm leading-snug text-muted">{n.message}</span>
                  <span className="mt-1 block text-xs text-muted/80">
                    {formatDate(n.created_at, true)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void remove(n.id)}
                  aria-label={`Delete notification: ${n.title}`}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 size={15} aria-hidden />
                </button>
              </motion.li>
            )
          })}
        </ul>
      )}
    </>
  )
}
