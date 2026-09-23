import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info } from 'lucide-react'

type Tone = 'error' | 'success' | 'info'

const tones: Record<Tone, { box: string; Icon: typeof Info }> = {
  error: { box: 'bg-danger-soft text-danger', Icon: CircleAlert },
  success: { box: 'bg-success-soft text-success', Icon: CircleCheck },
  info: { box: 'bg-primary-soft text-primary', Icon: Info },
}

/** Inline feedback banner for forms and page-level messages. */
export function Alert({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  const { box, Icon } = tones[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2.5 rounded-field p-3 text-sm font-medium ${box}`}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  )
}
