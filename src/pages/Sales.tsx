import { useState } from 'react'
import { Plus, Edit2, Trash2, AlertTriangle, ShoppingCart, Archive, X } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import DeletedItemsModal from '@/components/ui/DeletedItemsModal'
import SearchableSelect from '@/components/ui/SearchableSelect'
import {
  useSales, useCreateSale, useUpdateSale, useDeleteSale,
  useDeletedSales, useRestoreSale,
  type SaleInput, type SaleLineItemInput,
} from '@/lib/queries/sales'
import { useProducts } from '@/lib/queries/products'
import { useToast } from '@/store/toast'
import type { Sale } from '@/types/database'
import { formatCurrency, formatDateTime } from '@/utils/format'

const PAYMENT_METHODS = ['nakit', 'kredi kartı', 'havale']

function emptyLine(): SaleLineItemInput {
  return { product_id: '', quantity: 1, unit_price: 0 }
}

export default function Sales() {
  const toast = useToast()
  const { data: sales = [], isLoading, error } = useSales()
  const { data: products = [] } = useProducts()
  const createMutation = useCreateSale()
  const updateMutation = useUpdateSale()
  const deleteMutation = useDeleteSale()
  const restoreMutation = useRestoreSale()

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Sale | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('nakit')
  const [items, setItems] = useState<SaleLineItemInput[]>([emptyLine()])
  const [formError, setFormError] = useState('')

  const [deletedOpen, setDeletedOpen] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const { data: deletedSales = [], isLoading: loadingDeleted } = useDeletedSales(deletedOpen)

  function openCreate() {
    setEditTarget(null)
    setCustomerName('')
    setPaymentMethod('nakit')
    setItems([emptyLine()])
    setFormError('')
    setFormOpen(true)
  }

  function openEdit(sale: Sale) {
    setEditTarget(sale)
    setCustomerName(sale.customer_name ?? '')
    setPaymentMethod(sale.payment_method)
    setItems(
      (sale.items ?? []).map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      }))
    )
    setFormError('')
    setFormOpen(true)
  }

  function updateLine(idx: number, patch: Partial<SaleLineItemInput>) {
    setItems((cur) => cur.map((line, i) => (i === idx ? { ...line, ...patch } : line)))
  }

  function handleProductSelect(idx: number, productId: string) {
    const product = products.find((p) => p.id === productId)
    updateLine(idx, { product_id: productId, unit_price: product?.sale_price ?? 0 })
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
    const input: SaleInput = { customer_name: customerName.trim() || null, payment_method: paymentMethod, items: validItems }
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, ...input })
        toast.success('Satış güncellendi.')
      } else {
        await createMutation.mutateAsync(input)
        toast.success('Satış oluşturuldu.')
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
      toast.undo('Satış silindi.', async () => {
        try {
          await restoreMutation.mutateAsync(target.id)
          toast.success('Satış geri yüklendi.')
        } catch (err) {
          toast.error((err as Error).message)
        }
      })
      setDeleteTarget(null)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handleRestore(sale: Sale) {
    setRestoringId(sale.id)
    try {
      await restoreMutation.mutateAsync(sale.id)
      toast.success('Satış geri yüklendi.')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setRestoringId(null)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const linesTotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
  const vatTotal = Math.round(linesTotal * 0.2 * 100) / 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Header
        title="Satış"
        subtitle={isLoading ? 'Yükleniyor…' : `${sales.length} satış`}
        actions={
          <>
            <button
              onClick={() => setDeletedOpen(true)}
              title="Silinenler"
              className="icon-btn"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5" />
              Yeni Satış
            </Button>
          </>
        }
      />

      <div className="p-3 sm:p-6" style={{ flex: 1, overflowY: 'auto' }}>
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
        ) : sales.length === 0 ? (
          <div className="card flex">
            <EmptyState
              icon={ShoppingCart}
              title="Henüz satış kaydı yok"
              description="Yeni satış oluşturarak işlem geçmişinizi burada görüntüleyin."
              action={<Button size="sm" onClick={openCreate}><Plus className="w-3.5 h-3.5" /> İlk satışı ekle</Button>}
            />
          </div>
        ) : (
          <div className="card table-scroll-wrap">
            <table className="table-sticky-head" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  {['Müşteri', 'Ürünler', 'Ödeme', 'Toplam', 'Tarih', ''].map((h) => (
                    <th key={h} className="bg-white" style={{ padding: '0.625rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="table-row-alt table-row-hover" style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>{s.customer_name ?? 'Perakende Müşteri'}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b', maxWidth: '260px' }}>
                      {(s.items ?? []).map((i) => i.product?.name).filter(Boolean).join(', ') || '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className="badge-gray">{s.payment_method}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>{formatCurrency(s.total)}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                      {formatDateTime(s.created_at)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => openEdit(s)} className="icon-btn">
                          <Edit2 style={{ width: '0.875rem', height: '0.875rem' }} />
                        </button>
                        <button onClick={() => setDeleteTarget(s)} className="icon-btn icon-btn-danger">
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
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editTarget ? 'Satışı Düzenle' : 'Yeni Satış'} width="max-w-2xl">
        <div className="p-4 sm:p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '1rem' }}>
            <Input
              label="Müşteri Adı (opsiyonel)"
              placeholder="Perakende müşteri"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                Ödeme Yöntemi
              </label>
              <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>
              Ürünler *
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {items.map((line, idx) => (
                <div key={idx} className="flex flex-wrap items-center" style={{ gap: '0.5rem' }}>
                  <div className="w-full sm:flex-1" style={{ minWidth: '160px' }}>
                    <SearchableSelect
                      value={line.product_id}
                      onChange={(productId) => handleProductSelect(idx, productId)}
                      placeholder="Ürün seçin…"
                      emptyMessage="Ürün bulunamadı"
                      options={products.map((p) => ({ value: p.id, label: p.name, sublabel: `Stok: ${p.current_stock} ${p.unit}` }))}
                    />
                  </div>
                  <input
                    className="input"
                    style={{ width: '84px' }}
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, { quantity: parseFloat(e.target.value) || 0 })}
                  />
                  <input
                    className="input"
                    style={{ width: '104px' }}
                    type="number"
                    min={0}
                    value={line.unit_price}
                    onChange={(e) => updateLine(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                  />
                  <button
                    onClick={() => removeLine(idx)}
                    disabled={items.length === 1}
                    className="icon-btn icon-btn-danger shrink-0"
                    style={{ opacity: items.length === 1 ? 0.4 : 1, cursor: items.length === 1 ? 'not-allowed' : 'pointer' }}
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

          <div className="flex flex-wrap" style={{ justifyContent: 'flex-end', gap: '0.75rem 1.5rem', padding: '0.75rem 0', borderTop: '1px solid #f1f5f9', fontSize: '0.875rem' }}>
            <span style={{ color: '#64748b' }}>Ara Toplam: <strong style={{ color: '#0f172a' }}>{formatCurrency(linesTotal)}</strong></span>
            <span style={{ color: '#64748b' }}>KDV (%20): <strong style={{ color: '#0f172a' }}>{formatCurrency(vatTotal)}</strong></span>
            <span style={{ color: '#64748b' }}>Toplam: <strong style={{ color: 'var(--color-primary-600)' }}>{formatCurrency(linesTotal + vatTotal)}</strong></span>
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
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Satışı Sil" width="max-w-sm">
        <div className="p-4 sm:p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <AlertTriangle style={{ width: '1.25rem', height: '1.25rem', color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500, color: '#0f172a' }}>
                "{deleteTarget?.customer_name ?? 'Perakende Müşteri'}" satışı silinecek
              </p>
              <p style={{ margin: '0.375rem 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                Silinen satış "Silinenler" listesinden geri yüklenebilir.
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
        title="Silinen Satışlar"
        items={deletedSales}
        isLoading={loadingDeleted}
        keyExtractor={(s) => s.id}
        restoringId={restoringId}
        onRestore={handleRestore}
        renderItem={(s) => (
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
              {s.customer_name ?? 'Perakende Müşteri'} — {formatCurrency(s.total)}
            </p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
              Silinme: {s.deleted_at ? formatDateTime(s.deleted_at) : '—'}
            </p>
          </div>
        )}
      />
    </div>
  )
}
