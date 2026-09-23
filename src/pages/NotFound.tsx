import { useNavigate } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { EmptyState } from '../components/ui/EmptyState'

export function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="grid min-h-dvh place-items-center bg-bg">
      <EmptyState
        icon={<SearchX size={28} />}
        title="Page not found"
        description="That aisle doesn't exist. Let's get you back to the store."
        actionLabel="Go home"
        onAction={() => navigate('/')}
      />
    </div>
  )
}
