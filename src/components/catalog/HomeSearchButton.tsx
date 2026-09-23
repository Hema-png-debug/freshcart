import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'

/**
 * The Home search bar. Tapping it opens the dedicated search screen with the
 * keyboard ready — the standard mobile pattern for grocery apps.
 */
export function HomeSearchButton() {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate('/search')}
      className="mt-4 flex h-12 w-full items-center gap-2.5 rounded-field border border-line bg-surface px-4 text-left text-[0.9375rem] text-muted shadow-card transition-transform duration-150 active:scale-[0.99]"
    >
      <Search size={18} aria-hidden className="shrink-0 text-primary" />
      Search fruit, milk, snacks…
    </button>
  )
}
