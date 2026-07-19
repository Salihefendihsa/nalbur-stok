import { useState } from 'react'
import { Plus, Edit2, Trash2, AlertTriangle, ArrowRightLeft, Archive, ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import DeletedItemsModal from '@/components/ui/DeletedItemsModal'
import {
  useMovements, useCreateMovement, useUpdateMovement, useDeleteMovement,
  useDeletedMovements, useRestoreMovement,
  type MovementInput,
} from '@/lib/queries/movements'
import { useProducts } from '@/lib/queries/products'
import { useToast } from '@/store/toast'
import type { MovementType, StockMovement } from '@/types/database'
import { formatDateTime, formatStock } from '@/utils/format'

const MOVEMENT_LABEL: Record<MovementType, string> = { in: 'Giriş', out: 'Çıkış', adjustment: 'Düzeltme' }
const MOVEMENT_ICON: Record<MovementType, React.ReactNode> = {
  in: <ArrowUpCircle style={{ width: '1rem', height: '1rem', color: '#16a34a' }} />,
  out: <ArrowDownCircle style={{ width: '1rem', height: '1rem', color: '#dc2626' }} />,
  adjustment: <RefreshCw style={{ width: '1rem', height: '1rem', color: '#d97706' }} />,
}

export default function StockMovements() {
  const toast = useToast()
  const { data: movements = [], isLoading, error } = useMovements()
  const { data: products = [] } = useProducts()
  const createMutation = useCreateMovement()
  const updateMutation = useUpdateMovement()
  const deleteMutation = useDeleteMovement()
  const restoreMutation = useRestoreMovement()

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<StockMovement | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StockMovement | null>(null)

  const [productId, setProductId] = useState('')
  const [movementType, setMovementType] = useState<MovementType>('in')
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState('')

  const [deletedOpen, setDeletedOpen] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const { data: deletedMovements = [], isLoading: loadingDeleted } = useDeletedMovements(deletedOpen)

  function openCreate() {
    setEditTarget(null)
    setProductId('')
    setMovementType('in')
    setQuantity(1)
    setNote('')
    setFormError('')
    setFormOpen(true)
  }

  function openEdit(m: StockMovement) {
    setEditTarget(m)
    setNote(m.note ?? '')
    setFormError('')
    setFormOpen(true)
  }

  async function handleSubmit() {
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, note: note.trim() || null })
        toast.success('Hareket güncellendi.')
      } else {
        if (!productId) { setFormError('Ürün seçilmelidir.'); return }
        if (quantity <= 0) { setFormError('Miktar 0’dan büyük olmalıdır.'); return }
        const input: MovementInput = { product_id: productId, movement_type: movementType, quantity, note: note.trim() || null }
        await createMutation.mutateAsync(input)
        toast.success('Stok hareketi eklendi.')
      }
      setFormOpen(false)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const target = deleteTarget
      await deleteMutation.mutateAsync(target.id)
      toast.undo('Stok hareketi silindi.', async () => {
        try {
          await restoreMutation.mutateAsync(target.id)
          toast.success('Hareket geri yüklendi.')
        } catch (err) {
          toast.error((err as Error).message)
        }
      })
      setDeleteTarget(null)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handleRestore(m: StockMovement) {
    setRestoringId(m.id)
    try {
      await restoreMutation.mutateAsync(m.id)
      toast.success('Hareket geri yüklendi.')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setRestoringId(null)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Header
        title="Stok Hareketleri"
        subtitle={isLoading ? 'Yükleniyor…' : `${movements.length} hareket`}
        actions={
          <>
            <button
              onClick={() => setDeletedOpen(true)}
              title="Silinenler"
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5" />
              Yeni Hareket
            </Button>
          </>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {isLoading ? (
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '48px', borderRadius: '0.5rem' }} />
            ))}
          </div>
        ) : error ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', fontSize: '0.875rem' }}>
            Yükleme hatası: {(error as Error).message}
          </div>
        ) : movements.length === 0 ? (
          <div className="card flex">
            <EmptyState
              icon={ArrowRightLeft}
              title="Henüz stok hareketi yok"
              description="Ürün giriş, çıkış ve düzeltme hareketleri burada listelenecek."
              action={<Button size="sm" onClick={openCreate}><Plus className="w-3.5 h-3.5" /> İlk hareketi ekle</Button>}
            />
          </div>
        ) : (
          <div className="card">
            <table className="table-sticky-head" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  {['Tür', 'Ürün', 'Miktar', 'Önce → Sonra', 'Not', 'Tarih', ''].map((h) => (
                    <th key={h} className="bg-white" style={{ padding: '0.625rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="table-row-alt table-row-hover" style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '0.625rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        {MOVEMENT_ICON[m.movement_type]}
                        <span>{MOVEMENT_LABEL[m.movement_type]}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.625rem 1rem', fontWeight: 500, color: '#0f172a' }}>{m.product?.name ?? '—'}</td>
                    <td style={{ padding: '0.625rem 1rem' }}>{formatStock(m.quantity, m.product?.unit ?? 'adet')}</td>
                    <td style={{ padding: '0.625rem 1rem', color: '#64748b' }}>{m.stock_before ?? '—'} → {m.stock_after ?? '—'}</td>
                    <td style={{ padding: '0.625rem 1rem', color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.note ?? '—'}</td>
                    <td style={{ padding: '0.625rem 1rem', color: '#94a3b8', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{formatDateTime(m.created_at)}</td>
                    <td style={{ padding: '0.625rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => openEdit(m)}
                          title="Notu düzenle"
                          style={{ width: '1.75rem', height: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid #e2e8f0', borderRadius: '0.375rem', cursor: 'pointer', color: '#64748b' }}
                        >
                          <Edit2 style={{ width: '0.875rem', height: '0.875rem' }} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(m)}
                          style={{ width: '1.75rem', height: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid #fecaca', borderRadius: '0.375rem', cursor: 'pointer', color: '#dc2626' }}
                        >
                          <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editTarget ? 'Hareketi Düzenle' : 'Yeni Stok Hareketi'} width="max-w-md">
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!editTarget && (
            <>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  Ürün *
                </label>
                <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
                  <option value="">Ürün seçin…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({formatStock(p.current_stock, p.unit)})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    Hareket Türü
                  </label>
                  <select className="input" value={movementType} onChange={(e) => setMovementType(e.target.value as MovementType)}>
                    <option value="in">Giriş</option>
                    <option value="out">Çıkış</option>
                    <option value="adjustment">Düzeltme (yeni stok miktarı)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    Miktar
                  </label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </>
          )}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
              Not
            </label>
            <textarea
              className="input"
              style={{ resize: 'none' }}
              rows={3}
              placeholder="Örn: Tedarikçiden alım, Müşteriye satış, Sayım düzeltmesi…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {formError && <p style={{ fontSize: '0.75rem', color: '#dc2626' }}>{formError}</p>}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
            <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>İptal</Button>
            <Button size="sm" loading={isPending} onClick={handleSubmit}>
              {editTarget ? 'Güncelle' : 'Oluştur'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hareketi Sil" width="max-w-sm">
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <AlertTriangle style={{ width: '1.25rem', height: '1.25rem', color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500, color: '#0f172a' }}>
                Bu stok hareketi silinecek
              </p>
              <p style={{ margin: '0.375rem 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                Silinen hareket "Silinenler" listesinden geri yüklenebilir. Ürünün mevcut stok miktarı değişmez.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>İptal</Button>
            <Button variant="danger" size="sm" loading={deleteMutation.isPending} onClick={handleDelete}>Evet, Sil</Button>
          </div>
        </div>
      </Modal>

      {/* Deleted items */}
      <DeletedItemsModal
        open={deletedOpen}
        onClose={() => setDeletedOpen(false)}
        title="Silinen Hareketler"
        items={deletedMovements}
        isLoading={loadingDeleted}
        keyExtractor={(m) => m.id}
        restoringId={restoringId}
        onRestore={handleRestore}
        renderItem={(m) => (
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
              {MOVEMENT_LABEL[m.movement_type]} — {m.product?.name ?? 'Ürün'}
            </p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
              Silinme: {m.deleted_at ? formatDateTime(m.deleted_at) : '—'}
            </p>
          </div>
        )}
      />
    </div>
  )
}
