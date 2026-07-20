import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Edit2, Trash2, AlertTriangle, ArrowDownToLine, Archive,
  X, ChevronDown, ChevronRight, Package, Building2, Receipt,
  CheckCircle2, TrendingDown, Calendar, Hash,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import DeletedItemsModal from '@/components/ui/DeletedItemsModal'
import SearchableSelect from '@/components/ui/SearchableSelect'
import {
  usePurchases, useAddPurchase, useUpdatePurchase, useDeletePurchase,
  useDeletedPurchases, useRestorePurchase,
  type PurchaseInput, type PurchaseLineItemInput,
} from '@/hooks/usePurchases'
import { useSuppliers } from '@/lib/queries/suppliers'
import { useProducts } from '@/lib/queries/products'
import { useCartItems, useCartActions, useCartTotal } from '@/store/useCartStore'
import { useToast } from '@/store/toast'
import type { Purchase } from '@/types/database'
import { formatCurrency, formatDateTime, formatNumber } from '@/utils/format'

// ─── constants ────────────────────────────────────────────────────────────────
const UNASSIGNED_KEY = '__unassigned__'

function emptyLine(): PurchaseLineItemInput {
  return { product_id: '', quantity: 1, unit_price: 0 }
}

// ─── sub-components ───────────────────────────────────────────────────────────

/** Consistent pill-badge for payment/status info */
function StatusBadge({ children, variant = 'gray' }: { children: React.ReactNode; variant?: 'gray' | 'green' | 'blue' | 'orange' }) {
  const styles: Record<string, React.CSSProperties> = {
    gray:   { background: '#f1f5f9', color: '#475569' },
    green:  { background: '#f0fdf4', color: '#15803d' },
    blue:   { background: '#eff6ff', color: '#1d4ed8' },
    orange: { background: '#fff7ed', color: '#c2570a' },
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      padding: '0.15rem 0.55rem', borderRadius: '0.375rem',
      fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.01em',
      ...styles[variant],
    }}>
      {children}
    </span>
  )
}

/** Expandable detail drawer panel inside each row */
function PurchaseDetailPanel({ purchase, onEdit, onDelete }: {
  purchase: Purchase
  onEdit: (p: Purchase) => void
  onDelete: (p: Purchase) => void
}) {
  const items = purchase.items ?? []
  const itemCount = items.length

  return (
    <div style={{
      background: 'linear-gradient(135deg, #fff7ed 0%, #fff 60%)',
      borderTop: '1px solid #fed7aa',
      padding: '1.25rem 1.25rem 1rem',
      animation: 'fade-in-up 160ms ease-out',
    }}>
      {/* ── Header bar ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {purchase.supplier && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Building2 style={{ width: '0.875rem', height: '0.875rem', color: '#ea6c0a' }} />
                <Link
                  to={`/tedarikciler/${purchase.supplier_id}`}
                  style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', textDecoration: 'none' }}
                  onMouseOver={e => (e.currentTarget.style.color = '#ea6c0a')}
                  onMouseOut={e => (e.currentTarget.style.color = '#0f172a')}
                >
                  {purchase.supplier.name}
                </Link>
              </div>
            )}
            {purchase.invoice_no && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b', fontSize: '0.8rem' }}>
                <Hash style={{ width: '0.75rem', height: '0.75rem' }} />
                <span style={{ fontFamily: 'monospace' }}>{purchase.invoice_no}</span>
              </div>
            )}
            <StatusBadge variant="green">
              <CheckCircle2 style={{ width: '0.625rem', height: '0.625rem' }} />
              Stok güncellendi
            </StatusBadge>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#94a3b8', fontSize: '0.75rem' }}>
            <Calendar style={{ width: '0.75rem', height: '0.75rem' }} />
            {formatDateTime(purchase.created_at)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => onEdit(purchase)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.375rem 0.75rem', fontSize: '0.75rem', fontWeight: 500,
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem',
              cursor: 'pointer', color: '#475569', transition: 'all 150ms',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = '#ea6c0a'; e.currentTarget.style.color = '#ea6c0a' }}
            onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569' }}
          >
            <Edit2 style={{ width: '0.75rem', height: '0.75rem' }} /> Düzenle
          </button>
          <button
            onClick={() => onDelete(purchase)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.375rem 0.75rem', fontSize: '0.75rem', fontWeight: 500,
              background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '0.5rem',
              cursor: 'pointer', color: '#dc2626', transition: 'all 150ms',
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#fee2e2' }}
            onMouseOut={e => { e.currentTarget.style.background = '#fff5f5' }}
          >
            <Trash2 style={{ width: '0.75rem', height: '0.75rem' }} /> Sil
          </button>
        </div>
      </div>

      {/* ── Items table ── */}
      <div style={{ borderRadius: '0.625rem', border: '1px solid #e2e8f0', overflow: 'hidden', background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Ürün', 'Birim Fiyat', 'Miktar', 'Tutar'].map(h => (
                <th key={h} style={{
                  padding: '0.5rem 0.875rem', textAlign: h === 'Tutar' ? 'right' : 'left',
                  fontSize: '0.675rem', fontWeight: 700, color: '#94a3b8',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  borderBottom: '1px solid #e2e8f0',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {itemCount === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
                  Ürün detayı bulunamadı
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: idx < items.length - 1 ? '1px solid #f1f5f9' : 'none',
                    transition: 'background 120ms',
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = '#fff7ed')}
                  onMouseOut={e => (e.currentTarget.style.background = '')}
                >
                  <td style={{ padding: '0.625rem 0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem',
                        background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Package style={{ width: '0.875rem', height: '0.875rem', color: '#ea6c0a' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, color: '#0f172a' }}>{item.product?.name ?? '—'}</div>
                        {item.product?.sku && (
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>{item.product.sku}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.625rem 0.875rem', color: '#64748b' }}>{formatCurrency(item.unit_price)}</td>
                  <td style={{ padding: '0.625rem 0.875rem' }}>
                    <span style={{
                      background: '#eff6ff', color: '#1d4ed8',
                      padding: '0.1rem 0.5rem', borderRadius: '0.25rem',
                      fontWeight: 600, fontSize: '0.8rem',
                    }}>
                      {formatNumber(item.quantity)} {item.product?.unit ?? 'adet'}
                    </span>
                  </td>
                  <td style={{ padding: '0.625rem 0.875rem', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Summary footer ── */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
        gap: '2rem', marginTop: '0.875rem', paddingTop: '0.75rem',
        borderTop: '1px dashed #fed7aa',
      }}>
        <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
          {itemCount} kalem ürün
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Genel Toplam</span>
          <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ea6c0a' }}>
            {formatCurrency(purchase.total)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── main component ────────────────────────────────────────────────────────────
export default function Purchases() {
  const toast = useToast()
  const { data: purchases = [], isLoading, error } = usePurchases()
  const { data: suppliers = [] } = useSuppliers()
  const { data: products = [] } = useProducts()
  const addPurchaseMutation = useAddPurchase()
  const updateMutation = useUpdatePurchase()
  const deleteMutation = useDeletePurchase()
  const restoreMutation = useRestorePurchase()

  // Sepet (Cart) Store Hook'ları
  const cartItems = useCartItems()
  const cartActions = useCartActions()
  const cartTotal = useCartTotal()

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

  // accordion groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  // expanded detail row per group
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; name: string; supplierId: string | null; purchases: Purchase[] }>()
    for (const p of purchases) {
      const key = p.supplier_id ?? UNASSIGNED_KEY
      if (!map.has(key)) {
        map.set(key, { key, name: p.supplier?.name ?? 'Tedarikçi Belirtilmemiş', supplierId: p.supplier_id, purchases: [] })
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
    setCollapsedGroups(cur => ({ ...cur, [key]: !cur[key] }))
  }

  function toggleRow(id: string) {
    setExpandedRow(cur => (cur === id ? null : id))
  }

  function openCreate() {
    setEditTarget(null); setSupplierId(''); setInvoiceNo(''); setItems([emptyLine()]); setFormError(''); setFormOpen(true)
  }

  function openEdit(purchase: Purchase) {
    setEditTarget(purchase)
    setSupplierId(purchase.supplier_id ?? '')
    setInvoiceNo(purchase.invoice_no ?? '')
    setItems((purchase.items ?? []).map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price })))
    setFormError(''); setFormOpen(true)
  }

  function updateLine(idx: number, patch: Partial<PurchaseLineItemInput>) {
    setItems(cur => cur.map((line, i) => (i === idx ? { ...line, ...patch } : line)))
  }

  function handleProductSelect(idx: number, productId: string) {
    const product = products.find(p => p.id === productId)
    updateLine(idx, { product_id: productId, unit_price: product?.purchase_price ?? 0 })
  }

  function addLine() { setItems(cur => [...cur, emptyLine()]) }
  function removeLine(idx: number) { setItems(cur => cur.filter((_, i) => i !== idx)) }

  async function handleSubmit() {
    if (!supplierId) { setFormError('Önce bir tedarikçi seçilmelidir.'); return }
    if (editTarget) {
      const validItems = items.filter(i => i.product_id && i.quantity > 0)
      if (validItems.length === 0) { setFormError('En az bir ürün satırı eklenmelidir.'); return }
      const input: PurchaseInput = { supplier_id: supplierId, invoice_no: invoiceNo.trim() || null, items: validItems }
      try {
        await updateMutation.mutateAsync({ id: editTarget.id, ...input })
        toast.success('Alış güncellendi.')
        setFormOpen(false)
      } catch (err) { toast.error((err as Error).message) }
    } else {
      if (cartItems.length === 0) { setFormError('Sepet boş. Lütfen ürün ekleyin.'); return }
      try {
        await addPurchaseMutation.mutateAsync({ supplier_id: supplierId, invoice_no: invoiceNo.trim() || null })
        toast.success('Alış başarıyla tamamlandı.')
        setFormOpen(false)
      } catch (err) { toast.error((err as Error).message) }
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const target = deleteTarget
      await deleteMutation.mutateAsync(target.id)
      toast.undo('Alış silindi.', async () => {
        try { await restoreMutation.mutateAsync(target.id); toast.success('Alış geri yüklendi.') }
        catch (err) { toast.error((err as Error).message) }
      })
      setDeleteTarget(null)
    } catch (err) { toast.error((err as Error).message) }
  }

  async function handleRestore(purchase: Purchase) {
    setRestoringId(purchase.id)
    try { await restoreMutation.mutateAsync(purchase.id); toast.success('Alış geri yüklendi.') }
    catch (err) { toast.error((err as Error).message) }
    finally { setRestoringId(null) }
  }

  const isPending = addPurchaseMutation.isPending || updateMutation.isPending
  const linesTotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
  const totalPurchases = purchases.reduce((sum, p) => sum + p.total, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Header
        title="Alış"
        subtitle={isLoading ? 'Yükleniyor…' : `${purchases.length} alış · ${groups.length} tedarikçi`}
        actions={
          <>
            <button onClick={() => setDeletedOpen(true)} title="Silinenler" className="icon-btn">
              <Archive className="w-3.5 h-3.5" />
            </button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5" /> Yeni Alış
            </Button>
          </>
        }
      />

      <div className="p-3 sm:p-6" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* ── KPI strip ── */}
        {!isLoading && purchases.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {[
              { label: 'Toplam Harcama', value: formatCurrency(totalPurchases), icon: TrendingDown, color: '#ea6c0a', bg: '#fff7ed' },
              { label: 'Toplam Alış', value: `${purchases.length} adet`, icon: Receipt, color: '#1d4ed8', bg: '#eff6ff' },
              { label: 'Tedarikçi', value: `${groups.length} firma`, icon: Building2, color: '#15803d', bg: '#f0fdf4' },
            ].map(kpi => (
              <div key={kpi.label} style={{
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.875rem',
                padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
                boxShadow: '0 1px 3px 0 rgb(15 23 42 / 0.06)',
              }}>
                <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem', background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <kpi.icon style={{ width: '1.1rem', height: '1.1rem', color: kpi.color }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{kpi.label}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{kpi.value}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Content ── */}
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
          groups.map(group => {
            const collapsed = !!collapsedGroups[group.key]
            const groupTotal = group.purchases.reduce((sum, p) => sum + p.total, 0)
            return (
              <div key={group.key} className="card" style={{ overflow: 'hidden' }}>
                {/* ── Group header ── */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '0.75rem', padding: '0.875rem 1.125rem',
                    background: '#f8fafc', border: 'none',
                    borderBottom: collapsed ? 'none' : '1px solid #e2e8f0',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
                    <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Building2 style={{ width: '0.875rem', height: '0.875rem', color: '#ea6c0a' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      {collapsed
                        ? <ChevronRight style={{ width: '0.875rem', height: '0.875rem', color: '#94a3b8', flexShrink: 0 }} />
                        : <ChevronDown style={{ width: '0.875rem', height: '0.875rem', color: '#94a3b8', flexShrink: 0 }} />
                      }
                      {group.supplierId ? (
                        <Link
                          to={`/tedarikciler/${group.supplierId}`}
                          onClick={e => e.stopPropagation()}
                          style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {group.name}
                        </Link>
                      ) : (
                        <span style={{ fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>{group.name}</span>
                      )}
                    </div>
                    <StatusBadge variant="gray">{group.purchases.length} alış</StatusBadge>
                  </div>
                  <span style={{ fontWeight: 700, color: '#ea6c0a', fontSize: '0.9rem', flexShrink: 0 }}>
                    {formatCurrency(groupTotal)}
                  </span>
                </button>

                {/* ── Rows ── */}
                {!collapsed && (
                  <div>
                    {group.purchases.map((p, idx) => {
                      const isExpanded = expandedRow === p.id
                      const isLast = idx === group.purchases.length - 1
                      return (
                        <div key={p.id}>
                          <div
                            onClick={() => toggleRow(p.id)}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr auto auto auto',
                              alignItems: 'center',
                              gap: '0.75rem',
                              padding: '0.75rem 1.125rem',
                              borderBottom: (!isLast || isExpanded) ? '1px solid #f1f5f9' : 'none',
                              cursor: 'pointer',
                              transition: 'background 120ms',
                              background: isExpanded ? '#fff7ed' : undefined,
                            }}
                            onMouseOver={e => { if (!isExpanded) e.currentTarget.style.background = '#fafafa' }}
                            onMouseOut={e => { if (!isExpanded) e.currentTarget.style.background = '' }}
                          >
                            {/* Left: invoice + products */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {p.invoice_no ? (
                                  <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>
                                    {p.invoice_no}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontStyle: 'italic' }}>Faturasız alış</span>
                                )}
                                <StatusBadge variant="green">
                                  <CheckCircle2 style={{ width: '0.6rem', height: '0.6rem' }} />
                                  Stok güncellendi
                                </StatusBadge>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {(p.items ?? []).map(i => i.product?.name).filter(Boolean).join(' · ') || '—'}
                              </div>
                            </div>

                            {/* Date */}
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Calendar style={{ width: '0.7rem', height: '0.7rem' }} />
                              {formatDateTime(p.created_at)}
                            </div>

                            {/* Total */}
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem', whiteSpace: 'nowrap', textAlign: 'right' }}>
                              {formatCurrency(p.total)}
                            </div>

                            {/* Chevron */}
                            <div style={{
                              width: '1.5rem', height: '1.5rem', borderRadius: '50%',
                              background: isExpanded ? '#fed7aa' : '#f1f5f9',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 200ms', transform: isExpanded ? 'rotate(180deg)' : 'none', flexShrink: 0,
                            }}>
                              <ChevronDown style={{ width: '0.75rem', height: '0.75rem', color: isExpanded ? '#ea6c0a' : '#94a3b8' }} />
                            </div>
                          </div>

                          {/* Detail panel */}
                          {isExpanded && (
                            <PurchaseDetailPanel
                              purchase={p}
                              onEdit={purchase => { openEdit(purchase); setExpandedRow(null) }}
                              onDelete={purchase => { setDeleteTarget(purchase); setExpandedRow(null) }}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* ── Form Modal ── */}
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
                options={suppliers.map(s => ({ value: s.id, label: s.name }))}
              />
            </div>
            <Input
              label="Fatura No"
              placeholder="FTR-2026-0001"
              value={invoiceNo}
              onChange={e => setInvoiceNo(e.target.value)}
            />
          </div>

          <div style={{ opacity: supplierId ? 1 : 0.5, pointerEvents: supplierId ? 'auto' : 'none' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>
              Ürünler *
            </label>
            {!supplierId && (
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', color: '#94a3b8' }}>Ürün eklemeden önce bir tedarikçi seçin.</p>
            )}
            {editTarget ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {items.map((line, idx) => (
                    <div key={idx} className="flex flex-wrap items-center" style={{ gap: '0.5rem' }}>
                      <div className="w-full sm:flex-1" style={{ minWidth: '160px' }}>
                        <SearchableSelect
                          value={line.product_id}
                          onChange={productId => handleProductSelect(idx, productId)}
                          placeholder="Ürün seçin…"
                          emptyMessage="Ürün bulunamadı"
                          options={products.map(p => ({ value: p.id, label: p.name, sublabel: `Stok: ${p.current_stock} ${p.unit}` }))}
                        />
                      </div>
                      <input className="input" style={{ width: '84px' }} type="number" min={1} value={line.quantity}
                        onChange={e => updateLine(idx, { quantity: parseFloat(e.target.value) || 0 })} />
                      <input className="input" style={{ width: '104px' }} type="number" min={0} value={line.unit_price}
                        onChange={e => updateLine(idx, { unit_price: parseFloat(e.target.value) || 0 })} />
                      <button
                        onClick={() => removeLine(idx)} disabled={items.length === 1}
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
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <SearchableSelect
                  value=""
                  onChange={productId => {
                    const p = products.find(prod => prod.id === productId)
                    if (p) {
                      // Purchase işleminde stok limitine takılmamak için maxStock Infinity veriyoruz
                      const err = cartActions.addItem({
                        id: p.id, name: p.name, sku: p.sku, unitPrice: p.purchase_price,
                        taxRate: p.vat_rate, maxStock: Infinity, unit: p.unit, quantity: 1
                      })
                      if (err) toast.error(err)
                    }
                  }}
                  placeholder="Barkod okut veya ürün ara..."
                  emptyMessage="Ürün bulunamadı"
                  options={products.map(p => ({ value: p.id, label: p.name, sublabel: `Stok: ${p.current_stock} ${p.unit} · Alış: ${formatCurrency(p.purchase_price)}` }))}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {cartItems.map(item => (
                    <div key={item.id} className="flex flex-wrap items-center" style={{ gap: '0.5rem', padding: '0.5rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                      <div className="w-full sm:flex-1" style={{ minWidth: '160px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{formatCurrency(item.unitPrice)} / {item.unit}</div>
                      </div>
                      <input className="input" style={{ width: '84px', textAlign: 'center' }} type="number" min={1} value={item.quantity}
                        onChange={e => {
                          const err = cartActions.updateQuantity(item.id, parseFloat(e.target.value) || 0)
                          if (err) toast.error(err)
                        }} />
                      <div style={{ width: '90px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                        {formatCurrency(item.totalPrice)}
                      </div>
                      <button onClick={() => cartActions.removeItem(item.id)} className="icon-btn icon-btn-danger shrink-0">
                        <X style={{ width: '0.875rem', height: '0.875rem' }} />
                      </button>
                    </div>
                  ))}
                  {cartItems.length === 0 && (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem', border: '1px dashed #cbd5e1', borderRadius: '0.5rem' }}>
                      Sepet boş. Yukarıdan ürün arayın.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {formError && <p style={{ margin: 0, fontSize: '0.75rem', color: '#dc2626' }}>{formError}</p>}

          <div className="flex flex-wrap" style={{ justifyContent: 'flex-end', gap: '0.75rem 1.5rem', padding: '0.75rem 0', borderTop: '1px solid #f1f5f9', fontSize: '0.875rem' }}>
            {editTarget ? (
              <span style={{ color: '#64748b' }}>Toplam: <strong style={{ color: 'var(--color-primary-600)' }}>{formatCurrency(linesTotal)}</strong></span>
            ) : (
              <span style={{ color: '#64748b' }}>Toplam: <strong style={{ color: 'var(--color-primary-600)' }}>{formatCurrency(cartTotal)}</strong></span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>İptal</Button>
            <Button size="sm" loading={isPending} onClick={handleSubmit}>
              {editTarget ? 'Güncelle' : 'Alışı Tamamla'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete confirmation ── */}
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

      {/* ── Deleted items ── */}
      <DeletedItemsModal
        open={deletedOpen}
        onClose={() => setDeletedOpen(false)}
        title="Silinen Alışlar"
        items={deletedPurchases}
        isLoading={loadingDeleted}
        keyExtractor={p => p.id}
        restoringId={restoringId}
        onRestore={handleRestore}
        renderItem={p => (
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
