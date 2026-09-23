import { supabase } from './supabase'
import { clearCatalogCache } from './catalog'
import { slugify } from './adminService'
import type { Offer } from '../types'

/**
 * Promotion management. Promotions ARE the existing offers model (extended in
 * phase8b.sql) — shoppers keep seeing them through the Home banner carousel,
 * which hides anything inactive or outside its date window. Writes are
 * admin-only via the phase7 "offers_admin_all" RLS policy; every mutation
 * clears the shopper cache so banner changes appear immediately.
 */

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export interface PromotionInput {
  title: string
  /** Shown as the banner subtitle. */
  description: string
  discount_percent: number
  color: string
  starts_at: string | null
  ends_at: string | null
  featured: boolean
  active: boolean
}

/** Client-side validation; the DB re-checks its own constraints. */
export function promotionInputError(input: PromotionInput): string | null {
  if (!input.title.trim()) return 'Give the promotion a title.'
  if (!Number.isFinite(input.discount_percent) || input.discount_percent < 1 || input.discount_percent > 90) {
    return 'The discount must be between 1% and 90%.'
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(input.color)) {
    return 'Banner colour must be a hex value like #157347.'
  }
  if (input.starts_at && input.ends_at && new Date(input.ends_at) < new Date(input.starts_at)) {
    return 'The end date cannot be before the start date.'
  }
  return null
}

function promotionRow(input: PromotionInput): Record<string, unknown> {
  return {
    title: input.title.trim(),
    subtitle: input.description.trim(),
    discount_percent: input.discount_percent,
    color: input.color,
    starts_at: input.starts_at,
    ends_at: input.ends_at,
    featured: input.featured,
    active: input.active,
  }
}

/** Every promotion — active, scheduled, expired, or switched off. */
export async function fetchAllPromotions(): Promise<Offer[]> {
  const { data, error } = await requireClient()
    .from('offers')
    .select('*')
    .order('discount_percent', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data ?? []) as Offer[]).sort((a, b) => Number(b.featured) - Number(a.featured))
}

export async function createPromotion(input: PromotionInput): Promise<void> {
  const validation = promotionInputError(input)
  if (validation) throw new Error(validation)
  const { error } = await requireClient()
    .from('offers')
    .insert({ id: crypto.randomUUID(), slug: slugify(input.title), ...promotionRow(input) })
  if (error) throw new Error(error.message)
  clearCatalogCache()
}

export async function updatePromotion(id: string, input: PromotionInput): Promise<void> {
  const validation = promotionInputError(input)
  if (validation) throw new Error(validation)
  const { error } = await requireClient().from('offers').update(promotionRow(input)).eq('id', id)
  if (error) throw new Error(error.message)
  clearCatalogCache()
}

export async function setPromotionActive(id: string, active: boolean): Promise<void> {
  const { error } = await requireClient().from('offers').update({ active }).eq('id', id)
  if (error) throw new Error(error.message)
  clearCatalogCache()
}

/** products.offer_id is ON DELETE SET NULL, so deleting a campaign is safe:
 * attached products simply lose their badge — nothing cascades. */
export async function deletePromotion(id: string): Promise<void> {
  const { error } = await requireClient().from('offers').delete().eq('id', id)
  if (error) throw new Error(error.message)
  clearCatalogCache()
}

export type PromotionState = 'live' | 'scheduled' | 'expired' | 'inactive'

/** How the shopper-facing carousel treats this promotion right now. */
export function promotionState(offer: Offer, now: Date = new Date()): PromotionState {
  if (!offer.active) return 'inactive'
  if (offer.starts_at && new Date(offer.starts_at) > now) return 'scheduled'
  if (offer.ends_at && new Date(offer.ends_at) < now) return 'expired'
  return 'live'
}
