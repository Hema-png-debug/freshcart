import { memo } from 'react'
import { Check } from 'lucide-react'
import { Sheet } from '../ui/Sheet'
import type { ProductSort } from '../../lib/catalog'

export const SORT_OPTIONS: ReadonlyArray<{ value: ProductSort; label: string }> = [
  { value: 'popularity', label: 'Popular' },
  { value: 'best_selling', label: 'Best selling' },
  { value: 'price_asc', label: 'Lowest price' },
  { value: 'price_desc', label: 'Highest price' },
  { value: 'discount', label: 'Highest discount' },
  { value: 'newest', label: 'Newest products' },
  { value: 'name_asc', label: 'Alphabetical (A–Z)' },
  { value: 'name_desc', label: 'Alphabetical (Z–A)' },
]

export interface SortSheetProps {
  open: boolean
  onClose: () => void
  value: ProductSort
  onChange: (sort: ProductSort) => void
}

/** Radio-style sort picker; selection applies instantly and closes the sheet. */
export const SortSheet = memo(function SortSheet({ open, onClose, value, onChange }: SortSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Sort by">
      <div role="radiogroup" aria-label="Sort products by" className="flex flex-col gap-1">
        {SORT_OPTIONS.map((opt) => {
          const selected = opt.value === value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                onChange(opt.value)
                onClose()
              }}
              className={`flex items-center justify-between rounded-field px-3.5 py-3 text-left text-[0.9375rem] font-medium transition-colors ${
                selected ? 'bg-primary-soft text-primary' : 'text-ink hover:bg-surface-2'
              }`}
            >
              {opt.label}
              {selected && <Check size={17} aria-hidden />}
            </button>
          )
        })}
      </div>
    </Sheet>
  )
})
