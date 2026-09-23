import { NavLink, Link, Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { ThemeToggle } from '../ui/ThemeToggle'

const TABS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/inventory', label: 'Inventory' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/analytics', label: 'Analytics' },
  { to: '/admin/promotions', label: 'Promotions' },
  { to: '/admin/notifications', label: 'Notifications' },
]

/** Dashboard chrome: header, scrollable section tabs, page outlet. */
export function AdminLayout() {
  const { pathname } = useLocation()
  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            to="/home"
            aria-label="Back to the shop"
            className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
          >
            <ArrowLeft size={17} aria-hidden />
          </Link>
          <p className="min-w-0 flex-1 truncate font-display text-lg font-extrabold text-ink">
            FreshCart Admin
          </p>
          <ThemeToggle />
        </div>
        <nav aria-label="Admin sections" className="mx-auto max-w-3xl overflow-x-auto px-4 pb-3">
          <ul className="flex w-max gap-2">
            {TABS.map((tab) => (
              <li key={tab.to}>
                <NavLink
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    `block rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-2 text-ink hover:bg-line'
                    }`
                  }
                >
                  {tab.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="mx-auto max-w-3xl px-4 py-5 pb-16"
      >
        <Outlet />
      </motion.main>
    </div>
  )
}
