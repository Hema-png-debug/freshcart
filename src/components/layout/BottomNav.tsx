import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, LayoutGrid, ShoppingCart, ReceiptText, User } from 'lucide-react'
import { useCart } from '../../context/CartContext'

const tabs = [
  { to: '/home', label: 'Home', Icon: Home },
  { to: '/categories', label: 'Categories', Icon: LayoutGrid },
  { to: '/cart', label: 'Cart', Icon: ShoppingCart },
  { to: '/orders', label: 'Orders', Icon: ReceiptText },
  { to: '/profile', label: 'Profile', Icon: User },
] as const

/** Fixed five-tab bottom navigation for the main app. */
export function BottomNav() {
  const { pathname } = useLocation()
  const { count } = useCart()

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 shadow-nav backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex h-16 max-w-lg items-stretch">
        {tabs.map(({ to, label, Icon }) => {
          const active = pathname.startsWith(to)
          return (
            <li key={to} className="relative flex-1">
              {active && (
                <motion.span
                  layoutId="nav-active-pill"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  className="absolute left-1/2 top-1.5 h-1 w-8 -translate-x-1/2 rounded-full bg-primary"
                  aria-hidden
                />
              )}
              <NavLink
                to={to}
                aria-current={active ? 'page' : undefined}
                aria-label={to === '/cart' && count > 0 ? `Cart, ${count} items` : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold transition-colors ${
                  active ? 'text-primary' : 'text-muted hover:text-ink'
                }`}
              >
                <span className="relative">
                  <Icon size={22} strokeWidth={active ? 2.4 : 2} aria-hidden />
                  {to === '/cart' && count > 0 && (
                    <span
                      aria-hidden
                      className="absolute -right-2.5 -top-1.5 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-accent px-1 text-[0.625rem] font-bold leading-none text-white"
                    >
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </span>
                {label}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
