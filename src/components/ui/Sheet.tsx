import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/** Bottom sheet modal: backdrop, slide-up panel, Escape/backdrop close. */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  // Remember what was focused before the sheet opened, so keyboard and
  // screen-reader users return there on close instead of the document top.
  const returnFocusRef = useRef<HTMLElement | null>(null)

  // Keep the latest onClose without re-running the open effect (which would
  // re-focus the panel and steal focus from inputs on every parent render).
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    // Collect the tabbable elements inside the dialog, skipping any that are
    // hidden. We avoid offsetParent for visibility: it is null for
    // position:fixed subtrees (the sheet lives inside a fixed overlay) and in
    // jsdom, either of which would wrongly empty the list.
    const focusablesIn = () =>
      panel
        ? Array.from(
            panel.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => !el.hasAttribute('hidden') && el.getAttribute('aria-hidden') !== 'true')
        : []

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      // Trap Tab within the dialog so keyboard users can't wander into the
      // page behind an aria-modal sheet (WCAG 2.1.2 / 2.4.3).
      if (e.key !== 'Tab') return
      const focusables = focusablesIn()
      if (focusables.length === 0) {
        e.preventDefault()
        panel?.focus()
        return
      }
      const first = focusables[0]!
      const last = focusables[focusables.length - 1]!
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    // Remember the trigger, then move focus into the dialog for keyboard users.
    returnFocusRef.current = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      // Return focus to whatever opened the sheet (WCAG 2.4.3).
      returnFocusRef.current?.focus?.()
    }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.button
            type="button"
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 h-full w-full cursor-default bg-black/40"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sheet-title"
            tabIndex={-1}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="absolute inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-3xl bg-surface p-5 shadow-nav outline-none"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="sheet-title" className="font-display text-lg font-bold text-ink">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-ink hover:bg-line"
              >
                <X size={16} />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
