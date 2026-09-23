import { Search as SearchIcon } from 'lucide-react'

/** Debounce-friendly admin search field. Extracted in the Phase 8 review
 * from three identical copies (Products, Orders, Customers). */
export function AdminSearch({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="relative mt-2">
      <SearchIcon
        size={16}
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-primary"
      />
      <input
        type="search"
        role="searchbox"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-field border border-line bg-surface pl-9 pr-3 text-[0.9375rem] text-ink placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
      />
    </div>
  )
}
