import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { useToastStore } from '@/store/toast'
import type { ToastType } from '@/store/toast'

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#16a34a' }} />,
  error: <XCircle className="w-4 h-4 shrink-0" style={{ color: '#dc2626' }} />,
  info: <Info className="w-4 h-4 shrink-0" style={{ color: '#2563eb' }} />,
}

const BORDER: Record<ToastType, string> = {
  success: '#bbf7d0',
  error: '#fecaca',
  info: '#bfdbfe',
}

export default function ToastContainer() {
  const { toasts, remove } = useToastStore()
  if (!toasts.length) return null
  return (
    <div style={{
      position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '360px',
    }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
            padding: '0.75rem 1rem', borderRadius: '0.75rem', background: '#fff',
            border: `1px solid ${BORDER[t.type]}`,
            boxShadow: '0 4px 12px rgb(0 0 0 / 0.12)',
          }}
        >
          {ICONS[t.type]}
          <p style={{ fontSize: '0.875rem', color: '#1e293b', flex: 1, lineHeight: '1.4', margin: 0 }}>
            {t.message}
          </p>
          {t.action && (
            <button
              onClick={() => {
                t.action!.onClick()
                remove(t.id)
              }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                color: 'var(--color-primary-600)', fontSize: '0.8125rem', fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {t.action.label}
            </button>
          )}
          <button
            onClick={() => remove(t.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8', display: 'flex' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
