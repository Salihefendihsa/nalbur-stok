import { RotateCcw } from 'lucide-react'
import Modal from '@/components/ui/Modal'

interface DeletedItemsModalProps<T> {
  open: boolean
  onClose: () => void
  title: string
  items: T[]
  isLoading?: boolean
  keyExtractor: (item: T) => string
  renderItem: (item: T) => React.ReactNode
  onRestore: (item: T) => void
  restoringId?: string | null
  emptyMessage?: string
}

export default function DeletedItemsModal<T>({
  open,
  onClose,
  title,
  items,
  isLoading,
  keyExtractor,
  renderItem,
  onRestore,
  restoringId,
  emptyMessage = 'Silinmiş kayıt yok.',
}: DeletedItemsModalProps<T>) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-lg">
      <div style={{ padding: '1rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '48px', borderRadius: '0.5rem' }} />
          ))
        ) : items.length === 0 ? (
          <p style={{ padding: '1.5rem 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
            {emptyMessage}
          </p>
        ) : (
          items.map((item) => {
            const id = keyExtractor(item)
            return (
              <div
                key={id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.625rem 0.75rem', borderRadius: '0.625rem',
                  backgroundColor: '#fef2f2', border: '1px solid #fecaca',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>{renderItem(item)}</div>
                <button
                  onClick={() => onRestore(item)}
                  disabled={restoringId === id}
                  className="btn-secondary"
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', flexShrink: 0 }}
                >
                  <RotateCcw className="w-3 h-3" />
                  {restoringId === id ? 'Geri yükleniyor…' : 'Geri Yükle'}
                </button>
              </div>
            )
          })
        )}
      </div>
    </Modal>
  )
}
