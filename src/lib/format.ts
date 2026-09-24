const lkr = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'LKR' })

/** Format a price in the store currency. */
export function formatPrice(value: number): string {
  return lkr.format(value)
}

/** Whole-number percentage saved when a product is discounted. */
export function discountPercent(price: number, originalPrice: number): number {
  return Math.round((1 - price / originalPrice) * 100)
}

/** "17 Jul 2026", optionally with the weekday ("Fri, 17 Jul 2026"). */
export function formatDate(iso: string, withWeekday = false): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    ...(withWeekday ? { weekday: 'short' as const } : {}),
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
