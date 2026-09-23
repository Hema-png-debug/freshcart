import { useEffect, useState, type FormEvent } from 'react'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Alert } from '../ui/Alert'
import type { Category, Product } from '../../types'
import type { ProductInput } from '../../lib/adminService'
import { Checkbox } from '../ui/Checkbox'

/** Create/edit product form in a bottom sheet. Submits a full ProductInput. */
export function ProductFormSheet({
  open,
  onClose,
  categories,
  product,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  categories: Category[]
  /** When present, the sheet edits this product; otherwise it creates one. */
  product: Product | null
  onSubmit: (input: ProductInput) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')
  const [unit, setUnit] = useState('')
  const [brand, setBrand] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [originalPrice, setOriginalPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [stock, setStock] = useState('0')
  const [available, setAvailable] = useState(true)
  const [featured, setFeatured] = useState(false)
  const [organic, setOrganic] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Load the record (or defaults) whenever the sheet opens.
  useEffect(() => {
    if (!open) return
    setName(product?.name ?? '')
    setEmoji(product?.emoji ?? '')
    setUnit(product?.unit ?? '')
    setBrand(product?.brand ?? '')
    setDescription(product?.description ?? '')
    setPrice(product ? String(product.price) : '')
    setOriginalPrice(product?.original_price ? String(product.original_price) : '')
    setCategoryId(product?.category_id ?? categories[0]?.id ?? '')
    setStock(product ? String(product.stock_quantity) : '0')
    setAvailable(product ? product.in_stock || product.stock_quantity === 0 : true)
    setFeatured(product?.featured ?? false)
    setOrganic(product?.is_organic ?? false)
    setIsNew(product?.is_new ?? false)
    setError(null)
  }, [open, product, categories])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const priceNum = Number(price)
    const originalNum = originalPrice.trim() === '' ? null : Number(originalPrice)
    const stockNum = Number(stock)
    if (!name.trim() || !emoji.trim() || !unit.trim() || !brand.trim()) {
      setError('Name, emoji, unit, and brand are all required.')
      return
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setError('Enter a price greater than zero.')
      return
    }
    if (originalNum !== null && (!Number.isFinite(originalNum) || originalNum <= priceNum)) {
      setError('The original price must be higher than the sale price.')
      return
    }
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      setError('Stock must be a whole number of zero or more.')
      return
    }
    if (!categoryId) {
      setError('Choose a category.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await onSubmit({
        name,
        description,
        emoji,
        unit,
        brand,
        price: priceNum,
        original_price: originalNum,
        category_id: categoryId,
        stock_quantity: stockNum,
        available,
        featured,
        is_organic: organic,
        is_new: isNew,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the product.')
    } finally {
      setSaving(false)
    }
  }


  return (
    <Sheet open={open} onClose={onClose} title={product ? 'Edit product' : 'Add product'}>
      <form onSubmit={handleSubmit} noValidate className="flex max-h-[65vh] flex-col gap-3 overflow-y-auto pb-1">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Emoji (product image)"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="🍎"
          />
          <Input label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="1 kg" />
        </div>
        <Input label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-field border border-line bg-surface px-3 py-2 text-[0.9375rem] text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Price (£)"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <Input
            label="Original price (£, optional)"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={originalPrice}
            onChange={(e) => setOriginalPrice(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">Category</span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-11 w-full rounded-field border border-line bg-surface px-3 text-[0.9375rem] text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Stock quantity"
            type="number"
            inputMode="numeric"
            min={0}
            step="1"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </div>
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-1 text-sm font-semibold text-ink">Flags</legend>
          <Checkbox label="Available" checked={available} onChange={setAvailable} />
          <Checkbox label="Featured" checked={featured} onChange={setFeatured} />
          <Checkbox label="Organic" checked={organic} onChange={setOrganic} />
          <Checkbox label="New arrival" checked={isNew} onChange={setIsNew} />
        </fieldset>

        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" loading={saving}>
          {product ? 'Save changes' : 'Add product'}
        </Button>
      </form>
    </Sheet>
  )
}
