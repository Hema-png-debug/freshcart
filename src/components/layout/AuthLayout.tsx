import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '../ui/Logo'

export interface AuthLayoutProps {
  title: string
  subtitle: string
  backTo?: string
  children: ReactNode
}

/** Shared frame for the auth screens: logo, heading, and a card for the form. */
export function AuthLayout({ title, subtitle, backTo, children }: AuthLayoutProps) {
  return (
    <div className="min-h-dvh bg-bg px-5 pb-10 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          {backTo ? (
            <Link
              to={backTo}
              aria-label="Go back"
              className="grid h-10 w-10 place-items-center rounded-full bg-surface text-ink shadow-card"
            >
              <ArrowLeft size={18} />
            </Link>
          ) : (
            <span />
          )}
          <Logo size={36} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <h1 className="font-display text-[1.75rem] font-extrabold leading-tight tracking-tight text-ink">
            {title}
          </h1>
          <p className="mt-1.5 text-[0.9375rem] text-muted">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </motion.div>
      </div>
    </div>
  )
}
