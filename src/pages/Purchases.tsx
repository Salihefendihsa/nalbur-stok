import { useState } from 'react'
import { Plus, Edit2, Trash2, AlertTriangle, ArrowDownToLine, Archive, X } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import DeletedItemsModal from '@/components/ui/DeletedItemsModal'
import {
  usePurchases, useCreatePurchase, useUpdatePurchase, useDeletePurchase,
  useDeletedPurchases, useRestorePurchase,
  type PurchaseInput, type PurchaseLineItemInput,
} from '@/lib/queries/purchases'
import { useProducts } from '@/lib/queries/products'
import { useSuppliers } from '@/lib/queries/suppliers'
import { useToast } from '@/store/toast'
import type { Purchase } from '@/types/database'
import { formatCurrency, formatDateTime } from '@/utils/format'

function emptyLine(): PurchaseLineItemInput {
  return { product_id: '', quantity: 1, unit_price: 0 }
}

export default function Purchases() {
  const toast = useToast()
  const { data: purchases = [], isLoading, error } = usePurchases()
  const { data: products = [] } = useProducts()
  const { data: suppliers = [] } = useSuppliers()
  const createMutation = useCreatePurchase()
  const updateMutation = useUpdatePurchase()
  const deleteMutation = useDeletePurchase()
  const restoreMutation = useRestorePurchase()

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Purchase | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Purchase | null>(null)
  const [supplierId, setSupplierId] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [items, setItems] = useState<PurchaseLineItemInput[]>([emptyLine()])
  const [formError, setFormError] = useState('')

  const [deletedOpen, setDeletedOpen] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const { data: deletedPurchases = [], isLoading: loadingDeleted } = useDeletedPurchases(deletedOpen)

  function openCreate() {
    setEditTarget(null)
    setSupplierId('')
    setInvoiceNo('')
    setItems([emptyLine()])
    setFormError('')
    setFormOpen(true)
  }

  function openEdit(purchase: Purchase) {
    setEditTarget(purchase)
    setSupplierId(purchase.supplier_id ?? '')
    setInvoiceNo(purchase.invoice_no ?? '')
    setItems(
      (purchase.items ?? []).map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      }))
    )
    setFormError('')
    setFormOpen(true)
  }

  function updateLine(idx: number, patch: Partial<PurchaseLineItemInput>) {
    setItems((cur) => cur.map((line, i) => (i === idx ? { ...line, ...patch } : line)))
  }

  function handleProductSelect(idx: number, productId: string) {
    const product = products.find((p) => p.id === productId)
    updateLine(idx, { product_id: productId, unit_price: product?.purchase_price ?? 0 })
  }

  function addLine() {
    setItems((cur) => [...cur, emptyLine()])
  }

  function removeLine(idx: number) {
    setItems((cur) => cur.filter((_, i) => i !== idx))
  }

  async function handleSubmit() {
    const validItems = items.filter((i) => i.product_id && i.quantity > 0)
    if (validItems.length === 0) {
      setFormError('En az bir ürün satırı eklenmelidir.')
      return
    }
    const input: PurchaseInput = { supplier_id: supplierId || null, invoice_no: invoiceNo.trim() || null, items: validItems }
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, ...input })
        toast.success('Alış güncellendi.')
      } else {
        await createMutation.mutateAsync(input)
        toast.success('Alış oluşturuldu.')
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
      toast.undo('Alış silindi.', async () => {
        try {
          await restoreMutation.mutateAsync(target.id)
          toast.success('Alış geri yüklendi.')
        } catch (err) {
          toast.error((err as Error).message)
        }
      })
      setDeleteTarget(null)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handleRestore(purchase: Purchase) {
    setRestoringId(purchase.id)
    try {
      await restoreMutation.mutateAsync(purchase.id)
      toast.success('Alış geri yüklendi.')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setRestoringId(null)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const linesTotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Header
        title="Alış"
        subtitle={isLoading ? 'Yükleniyor…' : `${purchases.length} alış`}
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
              Yeni Alış
            </Button>
          </>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {isLoading ? (
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '56px', borderRadius: '0.5rem' }} />
            ))}
          </div>
        ) : error ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', fontSize: '0.875rem' }}>
            Yükleme hatası: {(error as Error).message}
          </div>
        ) : purchases.length === 0 ? (
          <div className="card flex">
            <EmptyState
              icon={ArrowDownToLine}
              title="Henüz alış kaydı yok"
              description="Tedarikçilerden yapılan alışları burada takip edin."
              action={<Button size="sm" onClick={openCreate}><Plus className="w-3.5 h-3.5" /> İlk alışı ekle</Button>}
            />
          </div>
        ) : (
          <div className="card">
            <table className="table-sticky-head" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  {['Tedarikçi', 'Fatura No', 'Ürünler', 'Toplam', 'Tarih', ''].map((h) => (
                    <th key={h} className="bg-white" style={{ padding: '0.625rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} className="table-row-alt table-row-hover" style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>{p.supplier?.name ?? '—'}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontFamily: 'monospace', fontSize: '0.8125rem' }}>{p.invoice_no ?? '—'}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b', maxWidth: '260px' }}>
                      {(p.items ?? []).map((i) => i.product?.name).filter(Boolean).join(', ') || '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>{formatCurrency(p.total)}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                      {formatDateTime(p.created_at)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => openEdit(p)}
                          style={{ width: '1.75rem', height: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid #e2e8f0', borderRadius: '0.375rem', cursor: 'pointer', color: '#64748b' }}
                        >
                          <Edit2 style={{ width: '0.875rem', height: '0.875rem' }} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
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
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editTarget ? 'Alışı Düzenle' : 'Yeni Alış'} width="max-w-2xl">
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                Tedarikçi
              </label>
              <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">— Seçilmedi —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <Input
              label="Fatura No"
              placeholder="FTR-2026-0001"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>
              Ürünler *
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {items.map((line, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px 28px', gap: '0.5rem', alignItems: 'center' }}>
                  <select
                    className="input"
                    value={line.product_id}
                    onChange={(e) => handleProductSelect(idx, e.target.value)}
                  >
                    <option value="">Ürün seçin…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, { quantity: parseFloat(e.target.value) || 0 })}
                  />
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={line.unit_price}
                    onChange={(e) => updateLine(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                  />
                  <button
                    onClick={() => removeLine(idx)}
                    disabled={items.length === 1}
                    style={{ width: '1.75rem', height: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid #fecaca', borderRadius: '0.375rem', cursor: items.length === 1 ? 'not-allowed' : 'pointer', color: '#dc2626', opacity: items.length === 1 ? 0.4 : 1 }}
                  >
                    <X style={{ width: '0.875rem', height: '0.875rem' }} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addLine}
              style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-primary-600)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <Plus className="w-3.5 h-3.5" /> Satır ekle
            </button>
            {formError && <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#dc2626' }}>{formError}</p>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1.5rem', padding: '0.75rem 0', borderTop: '1px solid #f1f5f9', fontSize: '0.875rem' }}>
            <span style={{ color: '#64748b' }}>Toplam: <strong style={{ color: 'var(--color-primary-600)' }}>{formatCurrency(linesTotal)}</strong></span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>İptal</Button>
            <Button size="sm" loading={isPending} onClick={handleSubmit}>
              {editTarget ? 'Güncelle' : 'Oluştur'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Alışı Sil" width="max-w-sm">
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <AlertTriangle style={{ width: '1.25rem', height: '1.25rem', color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500, color: '#0f172a' }}>
                "{deleteTarget?.supplier?.name ?? deleteTarget?.invoice_no ?? 'Alış'}" silinecek
              </p>
              <p style={{ margin: '0.375rem 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                Silinen alış "Silinenler" listesinden geri yüklenebilir.
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
        title="Silinen Alışlar"
        items={deletedPurchases}
        isLoading={loadingDeleted}
        keyExtractor={(p) => p.id}
        restoringId={restoringId}
        onRestore={handleRestore}
        renderItem={(p) => (
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
              {p.supplier?.name ?? 'Tedarikçi yok'} — {formatCurrency(p.total)}
            </p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
              Silinme: {p.deleted_at ? formatDateTime(p.deleted_at) : '—'}
            </p>
          </div>
        )}
      />
    </div>
  )
}
