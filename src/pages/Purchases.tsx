import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Edit2, Trash2, AlertTriangle, ArrowDownToLine, Archive, X, ChevronDown, ChevronRight } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import DeletedItemsModal from '@/components/ui/DeletedItemsModal'
import SearchableSelect from '@/components/ui/SearchableSelect'
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

const UNASSIGNED_KEY = '__unassigned__'

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

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; name: string; supplierId: string | null; purchases: Purchase[] }>()
    for (const p of purchases) {
      const key = p.supplier_id ?? UNASSIGNED_KEY
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: p.supplier?.name ?? 'Tedarikçi Belirtilmemiş',
          supplierId: p.supplier_id,
          purchases: [],
        })
      }
      map.get(key)!.purchases.push(p)
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.key === UNASSIGNED_KEY) return 1
      if (b.key === UNASSIGNED_KEY) return -1
      return a.name.localeCompare(b.name, 'tr')
    })
  }, [purchases])

  function toggleGroup(key: string) {
    setCollapsedGroups((cur) => ({ ...cur, [key]: !cur[key] }))
  }

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
    if (!supplierId) {
      setFormError('Önce bir tedarikçi seçilmelidir.')
      return
    }
    const validItems = items.filter((i) => i.product_id && i.quantity > 0)
    if (validItems.length === 0) {
      setFormError('En az bir ürün satırı eklenmelidir.')
      return
    }
    const input: PurchaseInput = { supplier_id: supplierId, invoice_no: invoiceNo.trim() || null, items: validItems }
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
        subtitle={isLoading ? 'Yükleniyor…' : `${purchases.length} alış, ${groups.length} tedarikçi`}
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
              Yeni Alış
            </Button>
          </>
        }
      />

      <div className="p-3 sm:p-6" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
          groups.map((group) => {
            const collapsed = !!collapsedGroups[group.key]
            const groupTotal = group.purchases.reduce((sum, p) => sum + p.total, 0)
            return (
              <div key={group.key} className="card" style={{ overflow: 'hidden' }}>
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="flex-wrap"
                  style={{
                    width: '100%', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
                    padding: '0.875rem 1rem', background: '#f8fafc', border: 'none', borderBottom: collapsed ? 'none' : '1px solid #e2e8f0',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div className="flex-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    {collapsed ? <ChevronRight style={{ width: '1rem', height: '1rem', color: '#64748b', flexShrink: 0 }} /> : <ChevronDown style={{ width: '1rem', height: '1rem', color: '#64748b', flexShrink: 0 }} />}
                    {group.supplierId ? (
                      <Link
                        to={`/tedarikciler/${group.supplierId}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}
                      >
                        {group.name}
                      </Link>
                    ) : (
                      <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{group.name}</span>
                    )}
                    <span className="badge-gray" style={{ flexShrink: 0 }}>{group.purchases.length} alış</span>
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--color-primary-600)', fontSize: '0.875rem', flexShrink: 0 }}>{formatCurrency(groupTotal)}</span>
                </button>

                {!collapsed && (
                  <div className="table-scroll-wrap">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        {['Fatura No', 'Ürünler', 'Toplam', 'Tarih', ''].map((h) => (
                          <th key={h} className="bg-white" style={{ padding: '0.625rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.purchases.map((p) => (
                        <tr key={p.id} className="table-row-alt table-row-hover" style={{ borderBottom: '1px solid #f8fafc' }}>
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
                              <button onClick={() => openEdit(p)} className="icon-btn">
                                <Edit2 style={{ width: '0.875rem', height: '0.875rem' }} />
                              </button>
                              <button onClick={() => setDeleteTarget(p)} className="icon-btn icon-btn-danger">
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
            )
          })
        )}
      </div>

      {/* Form Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editTarget ? 'Alışı Düzenle' : 'Yeni Alış'} width="max-w-2xl">
        <div className="p-4 sm:p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                Tedarikçi *
              </label>
              <SearchableSelect
                value={supplierId}
                onChange={setSupplierId}
                placeholder="Önce tedarikçi seçin…"
                emptyMessage="Tedarikçi bulunamadı"
                options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
              />
            </div>
            <Input
              label="Fatura No"
              placeholder="FTR-2026-0001"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
            />
          </div>

          <div style={{ opacity: supplierId ? 1 : 0.5, pointerEvents: supplierId ? 'auto' : 'none' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>
              Ürünler *
            </label>
            {!supplierId && (
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', color: '#94a3b8' }}>Ürün eklemeden önce bir tedarikçi seçin.</p>
            )}
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
          </div>
          {formError && <p style={{ margin: 0, fontSize: '0.75rem', color: '#dc2626' }}>{formError}</p>}

          <div className="flex flex-wrap" style={{ justifyContent: 'flex-end', gap: '0.75rem 1.5rem', padding: '0.75rem 0', borderTop: '1px solid #f1f5f9', fontSize: '0.875rem' }}>
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
        <div className="p-4 sm:p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
