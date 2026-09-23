import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useNotifications } from '../../context/NotificationsContext'

/** Header bell with an unread badge, linking to the notification centre. */
export function NotificationBell() {
  const { unreadCount } = useNotifications()
  const label =
    unreadCount === 0
      ? 'Notifications'
      : `Notifications, ${unreadCount} unread`

  return (
    <Link
      to="/notifications"
      aria-label={label}
      className="relative grid h-10 w-10 place-items-center rounded-full bg-surface text-ink shadow-card transition-transform active:scale-90"
    >
      <Bell size={17} aria-hidden />
      {unreadCount > 0 && (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-danger px-1 text-[0.625rem] font-extrabold leading-none text-white"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
