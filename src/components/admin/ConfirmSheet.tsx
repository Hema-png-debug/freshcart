import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/Button'

/** Simple destructive-action confirmation used across admin screens. */
export function ConfirmSheet({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  onConfirm,
  busy = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  busy?: boolean
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="text-sm text-ink">{description}</p>
      <div className="mt-4 flex flex-col gap-2">
        <Button variant="danger" fullWidth loading={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button variant="secondary" fullWidth onClick={onClose} disabled={busy}>
          Cancel
        </Button>
      </div>
    </Sheet>
  )
}
