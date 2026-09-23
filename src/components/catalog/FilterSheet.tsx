import { memo, type ChangeEvent } from 'react'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { Toggle } from '../ui/Toggle'

/** Filter state for a category grid. All fields optional = inactive. */
export interface ProductFilters {
  priceMin?: number
  priceMax?: number
  brands: string[]
  inStockOnly: boolean
  discounted: boolean
  organic: boolean
  isNew: boolean
  featured: boolean
}

export const EMPTY_FILTERS: ProductFilters = {
  brands: [],
  inStockOnly: false,
  discounted: false,
  organic: false,
  isNew: false,
  featured: false,
}

/** Number of active filters (drives the badge on the Filter button). */
export function countActiveFilters(f: ProductFilters): number {
  return (
    (f.priceMin !== undefined || f.priceMax !== undefined ? 1 : 0) +
    (f.brands.length > 0 ? 1 : 0) +
    (f.inStockOnly ? 1 : 0) +
    (f.discounted ? 1 : 0) +
    (f.organic ? 1 : 0) +
    (f.isNew ? 1 : 0) +
    (f.featured ? 1 : 0)
  )
}

export interface FilterSheetProps {
  open: boolean
  onClose: () => void
  filters: ProductFilters
  onChange: (filters: ProductFilters) => void
  /** Brands available in this category. */
  brands: string[]
}

function parsePrice(e: ChangeEvent<HTMLInputElement>): number | undefined {
  const v = e.target.value.trim()
  if (v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}


/** Filters apply instantly on every change — no Apply button needed. */
export const FilterSheet = memo(function FilterSheet({
  open,
  onClose,
  filters,
  onChange,
  brands,
}: FilterSheetProps) {
  const set = (patch: Partial<ProductFilters>) => onChange({ ...filters, ...patch })
  const activeCount = countActiveFilters(filters)

  return (
    <Sheet open={open} onClose={onClose} title="Filters">
      <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto pb-1">
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-ink">Price range</legend>
          <div className="flex items-center gap-3">
            <label className="flex-1">
              <span className="mb-1 block text-xs font-semibold text-muted">Min (£)</span>
              <input
                type="number"
                min={0}
                step="0.1"
                inputMode="decimal"
                placeholder="0"
                value={filters.priceMin ?? ''}
                onChange={(e) => set({ priceMin: parsePrice(e) })}
                className="h-11 w-full rounded-field border border-line bg-surface px-3 text-[0.9375rem] text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
              />
            </label>
            <span aria-hidden className="mt-5 text-muted">
              –
            </span>
            <label className="flex-1">
              <span className="mb-1 block text-xs font-semibold text-muted">Max (£)</span>
              <input
                type="number"
                min={0}
                step="0.1"
                inputMode="decimal"
                placeholder="Any"
                value={filters.priceMax ?? ''}
                onChange={(e) => set({ priceMax: parsePrice(e) })}
                className="h-11 w-full rounded-field border border-line bg-surface px-3 text-[0.9375rem] text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
              />
            </label>
          </div>
        </fieldset>

        {brands.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-sm font-bold text-ink">Brand</legend>
            <div className="flex flex-wrap gap-2">
              {brands.map((brand) => {
                const selected = filters.brands.includes(brand)
                return (
                  <button
                    key={brand}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      set({
                        brands: selected
                          ? filters.brands.filter((b) => b !== brand)
                          : [...filters.brands, brand],
                      })
                    }
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                      selected
                        ? 'border-primary bg-primary-soft text-primary'
                        : 'border-line bg-surface text-ink hover:bg-surface-2'
                    }`}
                  >
                    {brand}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend className="mb-1 text-sm font-bold text-ink">Show only</legend>
          <Toggle
            label="In stock"
            checked={filters.inStockOnly}
            onToggle={(v) => set({ inStockOnly: v })}
          />
          <Toggle
            label="Discounted items"
            checked={filters.discounted}
            onToggle={(v) => set({ discounted: v })}
          />
          <Toggle label="Organic" checked={filters.organic} onToggle={(v) => set({ organic: v })} />
          <Toggle
            label="New arrivals"
            checked={filters.isNew}
            onToggle={(v) => set({ isNew: v })}
          />
          <Toggle
            label="Featured products"
            checked={filters.featured}
            onToggle={(v) => set({ featured: v })}
          />
        </fieldset>

        <div className="flex gap-3">
          {activeCount > 0 && (
            <Button variant="secondary" fullWidth onClick={() => onChange(EMPTY_FILTERS)}>
              Clear all ({activeCount})
            </Button>
          )}
          <Button fullWidth onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Sheet>
  )
})
