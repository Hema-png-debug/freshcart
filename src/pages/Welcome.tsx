import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Leaf, Timer, BadgePercent } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'
import { ThemeToggle } from '../components/ui/ThemeToggle'

const points = [
  { Icon: Leaf, text: 'Farm-fresh produce, picked daily' },
  { Icon: Timer, text: 'Delivery to your door in under an hour' },
  { Icon: BadgePercent, text: 'Weekly deals on the things you buy most' },
] as const

/** Signed-out landing screen. */
export function Welcome() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-dvh flex-col bg-bg px-6 pb-10 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <div className="flex items-center justify-between">
        <Logo size={40} withWordmark />
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10"
      >
        <h1 className="font-display text-[2.5rem] font-extrabold leading-[1.05] tracking-tight text-ink">
          Your market,
          <br />
          <span className="text-primary">minutes away.</span>
        </h1>
        <p className="mt-4 max-w-sm text-[0.9375rem] leading-relaxed text-muted">
          Shop everything from crisp greens to pantry staples, and have it at your door before the
          kettle boils.
        </p>

        <ul className="mt-8 flex flex-col gap-4">
          {points.map(({ Icon, text }, i) => (
            <motion.li
              key={text}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.12, duration: 0.35 }}
              className="flex items-center gap-3 text-sm font-medium text-ink"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                <Icon size={17} aria-hidden />
              </span>
              {text}
            </motion.li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.35 }}
        className="mx-auto flex w-full max-w-md flex-col gap-3"
      >
        <Button size="lg" fullWidth onClick={() => navigate('/register')}>
          Create account
        </Button>
        <Button size="lg" variant="secondary" fullWidth onClick={() => navigate('/login')}>
          I already have an account
        </Button>
      </motion.div>
    </div>
  )
}
