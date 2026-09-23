/**
 * Labelled checkbox row. Extracted in the Phase 9B review from a byte-identical
 * inline helper duplicated in ProductFormSheet and PromotionFormSheet.
 */
export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--c-primary)]"
      />
      {label}
    </label>
  )
}
