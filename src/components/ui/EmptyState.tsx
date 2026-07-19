import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 px-6 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-primary-50)' }}
      >
        <Icon className="w-7 h-7" style={{ color: 'var(--color-primary-500)' }} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {description && <p className="text-sm text-gray-400 max-w-xs">{description}</p>}
      </div>
      {action}
    </div>
  )
}
