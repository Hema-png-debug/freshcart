import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Logo } from '../components/ui/Logo'
import { useAuth } from '../context/AuthContext'

const MIN_SPLASH_MS = 1400

/**
 * First screen. Shows the brand while the Supabase session is restored,
 * then routes to the app (signed in) or the welcome screen (signed out).
 */
export function Splash() {
  const { initializing, session } = useAuth()
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS)
    return () => window.clearTimeout(t)
  }, [])

  if (minTimeElapsed && !initializing) {
    return <Navigate to={session ? '/home' : '/welcome'} replace />
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-primary">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          className="rounded-[1.75rem] bg-white/10 p-3 backdrop-blur"
        >
          <Logo size={72} />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="font-display text-3xl font-extrabold tracking-tight text-white"
        >
          FreshCart
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="text-sm font-medium text-white/80"
        >
          Groceries, delivered fresh.
        </motion.p>
      </motion.div>
    </div>
  )
}
