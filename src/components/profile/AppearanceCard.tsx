import { Monitor, Moon, Sun } from 'lucide-react'
import { Card } from '../ui/Card'
import { useTheme } from '../../context/ThemeContext'
import type { ThemePreference } from '../../types'

const OPTIONS: Array<{ value: ThemePreference; label: string; Icon: typeof Sun }> = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'dark', label: 'Dark', Icon: Moon },
]

/** Three-way theme choice; System follows the OS setting live. */
export function AppearanceCard() {
  const { preference, setTheme } = useTheme()

  return (
    <Card>
      <p className="mb-2 text-sm font-semibold text-ink">Appearance</p>
      <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-3 gap-2">
        {OPTIONS.map(({ value, label, Icon }) => {
          const selected = preference === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(value)}
              className={`flex flex-col items-center gap-1.5 rounded-field border py-3 text-sm font-semibold transition-colors ${
                selected
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-line bg-surface text-ink hover:bg-surface-2'
              }`}
            >
              <Icon size={17} aria-hidden />
              {label}
            </button>
          )
        })}
      </div>
    </Card>
  )
}
