import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Sheet } from '../ui/Sheet'
import { useAuth } from '../../context/AuthContext'

/**
 * Permanent account deletion behind an explicit confirmation sheet. The
 * deletion itself runs server-side (delete-account Edge Function) and
 * cascades through every user-owned table.
 */
export function DangerZone({
  onFeedback,
}: {
  onFeedback: (tone: 'success' | 'error', text: string) => void
}) {
  const navigate = useNavigate()
  const { deleteAccount } = useAuth()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteAccount()
    if (result.ok) {
      navigate('/welcome', { replace: true })
      return
    }
    setDeleting(false)
    setConfirming(false)
    onFeedback('error', result.message ?? 'Could not delete the account.')
  }

  return (
    <>
      <Card className="border border-danger/25">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-danger-soft text-danger"
          >
            <Trash2 size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Delete account</p>
            <p className="text-sm text-muted">Permanently remove your account and all data</p>
          </div>
          <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
            Delete
          </Button>
        </div>
      </Card>

      <Sheet open={confirming} onClose={() => setConfirming(false)} title="Delete your account?">
        <p className="text-sm text-ink">
          This permanently deletes your profile, favourites, cart, and order history. It cannot
          be undone.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Button variant="danger" fullWidth loading={deleting} onClick={() => void handleDelete()}>
            Yes, delete everything
          </Button>
          <Button variant="secondary" fullWidth onClick={() => setConfirming(false)} disabled={deleting}>
            Keep my account
          </Button>
        </div>
      </Sheet>
    </>
  )
}
