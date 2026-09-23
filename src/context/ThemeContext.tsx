import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ThemeMode, ThemePreference } from '../types'

const STORAGE_KEY = 'freshcart-theme'

interface ThemeContextValue {
  /** The resolved mode actually applied to the document. */
  theme: ThemeMode
  /** What the user chose; 'system' means "follow the OS". */
  preference: ThemePreference
  toggleTheme: () => void
  setTheme: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

// Contract shared with the pre-paint script in index.html: an explicit choice
// is stored under STORAGE_KEY; "system" is represented by the key's absence.
function getInitialPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(getInitialPreference)
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  const theme: ThemeMode =
    preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

  // Apply the resolved mode; persist only explicit choices. (Phase 6 review
  // fix: persisting the resolved value unconditionally used to make the
  // follow-the-system behaviour unreachable after first load.)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    if (preference === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, preference)
  }, [theme, preference])

  // Track the OS setting live; it only takes effect while preference=system.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const setTheme = useCallback((next: ThemePreference) => setPreference(next), [])
  // Toggling is always an explicit choice: flip from whatever is resolved.
  const toggleTheme = useCallback(
    () => setPreference(theme === 'dark' ? 'light' : 'dark'),
    [theme],
  )

  const value = useMemo(
    () => ({ theme, preference, toggleTheme, setTheme }),
    [theme, preference, toggleTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
