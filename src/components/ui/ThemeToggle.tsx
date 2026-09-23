import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

/** Icon button that flips between light and dark mode. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={dark}
      className={`grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-ink transition-colors hover:bg-line ${className}`}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
