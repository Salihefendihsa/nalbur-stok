import { useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Edit2, Trash2, AlertTriangle, Phone, Mail, MapPin, Plus, X } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { useSupplier, useUpdateSupplier, useDeleteSupplier, type SupplierInput } from '@/lib/queries/suppliers'
import {
  usePurchases, useUpdatePurchase, useDeletePurchase, useRestorePurchase,
  type PurchaseInput, type PurchaseLineItemInput,
} from '@/lib/queries/purchases'
import { useProducts } from '@/lib/queries/products'
import { useToast } from '@/store/toast'
import type { Purchase } from '@/types/database'
import { formatCurrency, formatDateTime } from '@/utils/format'

function nullify(s: string): string | null {
  return s.trim() || null
}

function emptyLine(): PurchaseLineItemInput {
  return { product_id: '', quantity: 1, unit_price: 0 }
}

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const { data: supplier, isLoading, error } = useSupplier(id)
  const { data: allPurchases = [], isLoading: purchasesLoading } = usePurchases()
  const { data: products = [] } = useProducts()

  const updateSupplierMutation = useUpdateSupplier()
  const deleteSupplierMutation = useDeleteSupplier()
  const updatePurchaseMutation = useUpdatePurchase()
  const deletePurchaseMutation = useDeletePurchase()
  const restorePurchaseMutation = useRestorePurchase()

  const purchases = useMemo(() => allPurchases.filter((p) => p.supplier_id === id), [allPurchases, id])
  const totalSpent = purchases.reduce((sum, p) => sum + p.total, 0)

  const [editSupplierOpen, setEditSupplierOpen] = useState(false)
  const [supplierForm, setSupplierForm] = useState<SupplierInput | null>(null)
  const [deleteSupplierOpen, setDeleteSupplierOpen] = useState(false)

  const [editPurchase, setEditPurchase] = useState<Purchase | null>(null)
  const [invoiceNo, setInvoiceNo] = useState('')
  const [items, setItems] = useState<PurchaseLineItemInput[]>([emptyLine()])
  const [deletePurchaseTarget, setDeletePurchaseTarget] = useState<Purchase | null>(null)

  function openEditSupplier() {
    if (!supplier) return
    setSupplierForm({
      name: supplier.name, phone: supplier.phone, email: supplier.email,
      address: supplier.address, tax_no: supplier.tax_no, notes: supplier.notes,
    })
    setEditSupplierOpen(true)
  }

  async function handleSupplierSubmit() {
    if (!supplier || !supplierForm || !supplierForm.name.trim()) return
    try {
      await updateSupplierMutation.mutateAsync({ id: supplier.id, ...supplierForm })
      toast.success('Tedarikçi güncellendi.')
      setEditSupplierOpen(false)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handleSupplierDelete() {
    if (!supplier) return
    try {
      await deleteSupplierMutation.mutateAsync(supplier.id)
      toast.success('Tedarikçi silindi.')
      navigate('/tedarikciler')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  function openEditPurchase(p: Purchase) {
    setEditPurchase(p)
    setInvoiceNo(p.invoice_no ?? '')
    setItems((p.items ?? []).map((i) => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price })))
  }

  function updateLine(idx: number, patch: Partial<PurchaseLineItemInput>) {
    setItems((cur) => cur.map((line, i) => (i === idx ? { ...line, ...patch } : line)))
  }

  function handleProductSelect(idx: number, productId: string) {
    const product = products.find((p) => p.id === productId)
    updateLine(idx, { product_id: productId, unit_price: product?.purchase_price ?? 0 })
  }

  async function handlePurchaseSubmit() {
    if (!editPurchase) return
    const validItems = items.filter((i) => i.product_id && i.quantity > 0)
    if (validItems.length === 0) return
    const input: PurchaseInput = { supplier_id: editPurchase.supplier_id, invoice_no: invoiceNo.trim() || null, items: validItems }
    try {
      await updatePurchaseMutation.mutateAsync({ id: editPurchase.id, ...input })
      toast.success('Alış güncellendi.')
      setEditPurchase(null)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handlePurchaseDelete() {
    if (!deletePurchaseTarget) return
    try {
      const target = deletePurchaseTarget
      await deletePurchaseMutation.mutateAsync(target.id)
      toast.undo('Alış silindi.', async () => {
        try {
          await restorePurchaseMutation.mutateAsync(target.id)
          toast.success('Alış geri yüklendi.')
        } catch (err) {
          toast.error((err as Error).message)
        }
      })
      setDeletePurchaseTarget(null)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', fontSize: '0.875rem' }}>
        Yükleme hatası: {(error as Error).message}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Header
        title={isLoading ? 'Yükleniyor…' : (supplier?.name ?? 'Tedarikçi')}
        subtitle={`${purchases.length} alış — ${formatCurrency(totalSpent)}`}
        actions={
          <>
            <Link to="/tedarikciler" className="icon-btn">
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
            <Button variant="secondary" size="sm" onClick={openEditSupplier}>
              <Edit2 className="w-3.5 h-3.5" /> Düzenle
            </Button>
            <Button variant="danger" size="sm" onClick={() => setDeleteSupplierOpen(true)}>
              <Trash2 className="w-3.5 h-3.5" /> Sil
            </Button>
          </>
        }
      />

      <div className="p-3 sm:p-6" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {supplier && (
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {supplier.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#334155', fontSize: '0.8125rem' }}>
                <Phone style={{ width: '0.875rem', height: '0.875rem', color: '#94a3b8' }} /> {supplier.phone}
              </div>
            )}
            {supplier.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#334155', fontSize: '0.8125rem' }}>
                <Mail style={{ width: '0.875rem', height: '0.875rem', color: '#94a3b8' }} /> {supplier.email}
              </div>
            )}
            {supplier.address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#334155', fontSize: '0.8125rem' }}>
                <MapPin style={{ width: '0.875rem', height: '0.875rem', color: '#94a3b8' }} /> {supplier.address}
              </div>
            )}
            {supplier.tax_no && <div style={{ color: '#64748b', fontSize: '0.8125rem' }}>Vergi No: {supplier.tax_no}</div>}
            {supplier.notes && <div style={{ color: '#64748b', fontSize: '0.8125rem' }}>{supplier.notes}</div>}
          </div>
        )}

        <div>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>Bu tedarikçiden alınanlar</h3>
          {purchasesLoading ? (
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: '56px', borderRadius: '0.5rem' }} />
              ))}
            </div>
          ) : purchases.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
              Bu tedarikçiden henüz alış yapılmamış.
            </div>
          ) : (
            <div className="card table-scroll-wrap">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    {['Fatura No', 'Ürünler', 'Toplam', 'Tarih', ''].map((h) => (
                      <th key={h} style={{ padding: '0.625rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontFamily: 'monospace', fontSize: '0.8125rem' }}>{p.invoice_no ?? '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b', maxWidth: '260px' }}>
                        {(p.items ?? []).map((i) => i.product?.name).filter(Boolean).join(', ') || '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>{formatCurrency(p.total)}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{formatDateTime(p.created_at)}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                          <button onClick={() => openEditPurchase(p)} className="icon-btn">
                            <Edit2 style={{ width: '0.875rem', height: '0.875rem' }} />
                          </button>
                          <button onClick={() => setDeletePurchaseTarget(p)} className="icon-btn icon-btn-danger">
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
      </div>

      {/* Edit supplier modal */}
      <Modal open={editSupplierOpen} onClose={() => setEditSupplierOpen(false)} title="Tedarikçi Düzenle" width="max-w-lg">
        {supplierForm && (
          <div className="p-4 sm:p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input label="Ad *" value={supplierForm.name} onChange={(e) => setSupplierForm((f) => f && { ...f, name: e.target.value })} />
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '1rem' }}>
              <Input label="Telefon" value={supplierForm.phone ?? ''} onChange={(e) => setSupplierForm((f) => f && { ...f, phone: nullify(e.target.value) })} />
              <Input label="E-posta" type="email" value={supplierForm.email ?? ''} onChange={(e) => setSupplierForm((f) => f && { ...f, email: nullify(e.target.value) })} />
            </div>
            <Input label="Adres" value={supplierForm.address ?? ''} onChange={(e) => setSupplierForm((f) => f && { ...f, address: nullify(e.target.value) })} />
            <Input label="Vergi No" value={supplierForm.tax_no ?? ''} onChange={(e) => setSupplierForm((f) => f && { ...f, tax_no: nullify(e.target.value) })} />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <Button variant="secondary" size="sm" onClick={() => setEditSupplierOpen(false)}>İptal</Button>
              <Button size="sm" loading={updateSupplierMutation.isPending} onClick={handleSupplierSubmit}>Güncelle</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete supplier confirmation */}
      <Modal open={deleteSupplierOpen} onClose={() => setDeleteSupplierOpen(false)} title="Tedarikçiyi Sil" width="max-w-sm">
        <div className="p-4 sm:p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <AlertTriangle style={{ width: '1.25rem', height: '1.25rem', color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500, color: '#0f172a' }}>"{supplier?.name}" silinecek</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setDeleteSupplierOpen(false)}>İptal</Button>
            <Button variant="danger" size="sm" loading={deleteSupplierMutation.isPending} onClick={handleSupplierDelete}>Evet, Sil</Button>
          </div>
        </div>
      </Modal>

      {/* Edit purchase modal */}
      <Modal open={!!editPurchase} onClose={() => setEditPurchase(null)} title="Alışı Düzenle" width="max-w-2xl">
        <div className="p-4 sm:p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label="Fatura No" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>Ürünler *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {items.map((line, idx) => (
                <div key={idx} className="flex flex-wrap items-center" style={{ gap: '0.5rem' }}>
                  <div className="w-full sm:flex-1" style={{ minWidth: '160px' }}>
                    <SearchableSelect
                      value={line.product_id}
                      onChange={(productId) => handleProductSelect(idx, productId)}
                      placeholder="Ürün seçin…"
                      options={products.map((p) => ({ value: p.id, label: p.name, sublabel: `Stok: ${p.current_stock} ${p.unit}` }))}
                    />
                  </div>
                  <input className="input" style={{ width: '84px' }} type="number" min={1} value={line.quantity} onChange={(e) => updateLine(idx, { quantity: parseFloat(e.target.value) || 0 })} />
                  <input className="input" style={{ width: '104px' }} type="number" min={0} value={line.unit_price} onChange={(e) => updateLine(idx, { unit_price: parseFloat(e.target.value) || 0 })} />
                  <button
                    onClick={() => setItems((cur) => cur.filter((_, i) => i !== idx))}
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
              onClick={() => setItems((cur) => [...cur, emptyLine()])}
              style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-primary-600)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <Plus className="w-3.5 h-3.5" /> Satır ekle
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setEditPurchase(null)}>İptal</Button>
            <Button size="sm" loading={updatePurchaseMutation.isPending} onClick={handlePurchaseSubmit}>Güncelle</Button>
          </div>
        </div>
      </Modal>

      {/* Delete purchase confirmation */}
      <Modal open={!!deletePurchaseTarget} onClose={() => setDeletePurchaseTarget(null)} title="Alışı Sil" width="max-w-sm">
        <div className="p-4 sm:p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <AlertTriangle style={{ width: '1.25rem', height: '1.25rem', color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500, color: '#0f172a' }}>
              "{deletePurchaseTarget?.invoice_no ?? 'Alış'}" silinecek
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setDeletePurchaseTarget(null)}>İptal</Button>
            <Button variant="danger" size="sm" loading={deletePurchaseMutation.isPending} onClick={handlePurchaseDelete}>Evet, Sil</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
