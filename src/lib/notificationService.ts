import { supabase } from './supabase'
import type { AppNotification, NotificationType } from '../types'

/**
 * Notification inbox service. Customers read/update/delete only their own
 * rows (RLS); cross-user writes (status changes, broadcasts, low-stock
 * alerts) happen server-side via triggers and the send_broadcast RPC.
 */

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await requireClient()
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as AppNotification[]
}

/** Client-created rows (a user notifying themself, e.g. order placed). */
export async function addNotification(input: {
  userId: string
  type: NotificationType
  title: string
  message: string
  orderId?: string | null
}): Promise<void> {
  const { error } = await requireClient().from('notifications').insert({
    id: crypto.randomUUID(),
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    order_id: input.orderId ?? null,
    read: false,
    created_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}

export async function markNotificationRead(userId: string, id: string): Promise<void> {
  const { error } = await requireClient()
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await requireClient()
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
  if (error) throw new Error(error.message)
}

export async function deleteNotification(userId: string, id: string): Promise<void> {
  const { error } = await requireClient()
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/** Admin broadcast; p_user_ids stays ready for targeting (null = everyone). */
export async function sendBroadcast(input: {
  type: 'promo' | 'announcement'
  title: string
  message: string
  userIds?: string[] | null
}): Promise<number> {
  const { data, error } = await requireClient().rpc('send_broadcast', {
    p_type: input.type,
    p_title: input.title,
    p_message: input.message,
    p_user_ids: input.userIds ?? null,
  })
  if (error) throw new Error(error.message)
  return (data as number) ?? 0
}
