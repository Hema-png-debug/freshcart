import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BottomNav } from './BottomNav'
import { CartProvider } from '../../context/CartContext'
import { FavouritesProvider } from '../../context/FavouritesContext'
import { NotificationsProvider } from '../../context/NotificationsContext'

/** Shell for the signed-in app: page content above a fixed bottom nav. */
export function AppLayout() {
  const { pathname } = useLocation()
  return (
    <CartProvider>
      <FavouritesProvider>
        <NotificationsProvider>
        <div className="min-h-dvh bg-bg">
      {/* Keyed on pathname so each tab animates in on navigation. */}
      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="mx-auto w-full max-w-lg px-4 pb-28 pt-4 sm:px-6"
      >
        <Outlet />
      </motion.main>
          <BottomNav />
        </div>
        </NotificationsProvider>
      </FavouritesProvider>
    </CartProvider>
  )
}
