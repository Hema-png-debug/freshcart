import { Card } from '../components/ui/Card'
import { Logo } from '../components/ui/Logo'

/**
 * Shown instead of the app when Supabase credentials are missing, so a fresh
 * clone explains itself rather than failing silently on every auth call.
 */
export function SetupNotice() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-5">
      <Card className="w-full max-w-md">
        <Logo size={40} withWordmark />
        <h1 className="mt-5 font-display text-xl font-extrabold text-ink">
          Connect your Supabase project
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          FreshCart needs Supabase credentials before authentication can work.
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink">
          <li>
            Copy <code className="rounded bg-surface-2 px-1.5 py-0.5">.env.example</code> to{' '}
            <code className="rounded bg-surface-2 px-1.5 py-0.5">.env</code>
          </li>
          <li>
            Fill in <code className="rounded bg-surface-2 px-1.5 py-0.5">VITE_SUPABASE_URL</code> and{' '}
            <code className="rounded bg-surface-2 px-1.5 py-0.5">VITE_SUPABASE_ANON_KEY</code> from
            your project's API settings
          </li>
          <li>
            Run the SQL in{' '}
            <code className="rounded bg-surface-2 px-1.5 py-0.5">supabase/schema.sql</code> in the
            Supabase SQL editor
          </li>
          <li>Restart the dev server</li>
        </ol>
      </Card>
    </div>
  )
}
