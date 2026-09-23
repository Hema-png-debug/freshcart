import { useState, type FormEvent } from 'react'
import { Megaphone, Send, Tag } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { sendBroadcast } from '../../lib/notificationService'
import { AdminSelect } from '../../components/admin/AdminSelect'

type BroadcastType = 'announcement' | 'promo'

/**
 * Compose and send broadcasts. The audience selector is intentionally a real
 * control with one option for now — the send_broadcast function already
 * accepts a user-id list, so targeting specific customers is an additive UI
 * change, not an architectural one.
 */
export function AdminNotifications() {
  const [type, setType] = useState<BroadcastType>('announcement')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const canSend = title.trim().length > 0 && message.trim().length > 0

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!canSend) {
      setFeedback({ tone: 'error', text: 'Give the notification a title and a message.' })
      return
    }
    setSending(true)
    setFeedback(null)
    try {
      const count = await sendBroadcast({ type, title, message, userIds: null })
      setFeedback({
        tone: 'success',
        text: `Sent to ${count} ${count === 1 ? 'customer' : 'customers'}.`,
      })
      setTitle('')
      setMessage('')
    } catch (err) {
      setFeedback({
        tone: 'error',
        text: err instanceof Error ? err.message : 'The notification could not be sent.',
      })
    } finally {
      setSending(false)
    }
  }

  const PreviewIcon = type === 'promo' ? Tag : Megaphone
  return (
    <>
      <PageHeader title="Notifications" subtitle="Reach your customers' inboxes" />

      <form onSubmit={handleSend} noValidate className="mt-2 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <AdminSelect
            label="Type"
            variant="form"
            value={type}
            onChange={(v) => setType(v as BroadcastType)}
          >
            <option value="announcement">Announcement</option>
            <option value="promo">Promotion</option>
          </AdminSelect>
          <AdminSelect label="Audience" variant="form" value="all" onChange={() => {}}>
            <option value="all">All customers</option>
          </AdminSelect>
        </div>
        <p className="text-xs text-muted">
          Customers who switched off {type === 'promo' ? 'promotions' : 'announcements'} in their
          preferences won't receive it.
        </p>
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={type === 'promo' ? 'Weekend fruit festival' : 'New delivery hours'}
        />
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink">Message</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="What should customers know?"
            className="w-full rounded-field border border-line bg-surface px-3 py-2 text-[0.9375rem] text-ink placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
          />
        </label>

        <section aria-label="Notification preview">
          <h2 className="mb-1.5 text-sm font-semibold text-ink">Preview</h2>
          <div className="flex items-start gap-3 rounded-card bg-primary-soft p-3.5 shadow-card">
            <span
              aria-hidden
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-primary"
            >
              <PreviewIcon size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2">
                <span className="truncate text-sm font-bold text-ink">
                  {title.trim() || 'Your title here'}
                </span>
                <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-primary" />
              </p>
              <p className="mt-0.5 text-sm leading-snug text-muted">
                {message.trim() || 'Your message will read exactly like this in the customer inbox.'}
              </p>
            </div>
          </div>
        </section>

        {feedback && <Alert tone={feedback.tone}>{feedback.text}</Alert>}
        <Button type="submit" loading={sending} disabled={!canSend && !sending}>
          <Send size={15} aria-hidden className="mr-1.5" />
          Send notification
        </Button>
      </form>
    </>
  )
}
