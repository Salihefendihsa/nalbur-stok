import { useState } from 'react'
import {
  Plus, Edit2, Trash2, AlertTriangle, ShoppingCart, Archive, X,
  ChevronDown, Package, User, CreditCard, Banknote, ArrowRightLeft,
  CheckCircle2, TrendingUp, Receipt, Calendar,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import DeletedItemsModal from '@/components/ui/DeletedItemsModal'
import SearchableSelect from '@/components/ui/SearchableSelect'
import {
  useSales, useAddSale, useUpdateSale, useDeleteSale,
  useDeletedSales, useRestoreSale,
  type SaleInput, type SaleLineItemInput,
} from '@/hooks/useSales'
import { useProducts } from '@/lib/queries/products'
import { useCartItems, useCartActions, useCartTotal, useCartSubtotal, useCartTax } from '@/store/useCartStore'
import { useToast } from '@/store/toast'
import type { Sale } from '@/types/database'
import { formatCurrency, formatDateTime, formatNumber } from '@/utils/format'

// ─── constants ────────────────────────────────────────────────────────────────
const PAYMENT_METHODS = ['nakit', 'kredi kartı', 'havale']

const PAYMENT_META: Record<string, { label: string; icon: React.FC<{ style?: React.CSSProperties }>; variant: 'green' | 'blue' | 'orange' }> = {
  'nakit':       { label: 'Nakit',        icon: Banknote,        variant: 'green'  },
  'kredi kartı': { label: 'Kredi Kartı',  icon: CreditCard,      variant: 'blue'   },
  'havale':      { label: 'Havale/EFT',   icon: ArrowRightLeft,  variant: 'orange' },
}

function emptyLine(): SaleLineItemInput {
  return { product_id: '', quantity: 1, unit_price: 0 }
}

// ─── sub-components ───────────────────────────────────────────────────────────

function PaymentBadge({ method }: { method: string }) {
  const meta = PAYMENT_META[method] ?? { label: method, icon: CreditCard, variant: 'gray' as const }
  const Icon = meta.icon
  const variantStyles: Record<string, React.CSSProperties> = {
    green:  { background: '#f0fdf4', color: '#15803d' },
    blue:   { background: '#eff6ff', color: '#1d4ed8' },
    orange: { background: '#fff7ed', color: '#c2570a' },
    gray:   { background: '#f1f5f9', color: '#475569' },
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.175rem 0.55rem', borderRadius: '0.375rem',
      fontSize: '0.7rem', fontWeight: 600,
      ...variantStyles[meta.variant],
    }}>
      <Icon style={{ width: '0.625rem', height: '0.625rem' }} />
      {meta.label}
    </span>
  )
}

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

/** Expanded detail panel for a single sale row */
function SaleDetailPanel({ sale, onEdit, onDelete }: {
  sale: Sale
  onEdit: (s: Sale) => void
  onDelete: (s: Sale) => void
}) {
  const items = sale.items ?? []
  const vatAmount = sale.vat_total ?? (sale.subtotal * 0.2)

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0fdf4 0%, #fff 60%)',
      borderTop: '1px solid #bbf7d0',
      padding: '1.25rem 1.25rem 1rem',
      animation: 'fade-in-up 160ms ease-out',
    }}>
      {/* ── Header bar ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <User style={{ width: '0.875rem', height: '0.875rem', color: '#15803d' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                {sale.customer_name ?? 'Perakende Müşteri'}
              </span>
            </div>
            <PaymentBadge method={sale.payment_method} />
            <StatusBadge variant="green">
              <CheckCircle2 style={{ width: '0.625rem', height: '0.625rem' }} />
              Stok düşüldü
            </StatusBadge>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#94a3b8', fontSize: '0.75rem' }}>
            <Calendar style={{ width: '0.75rem', height: '0.75rem' }} />
            {formatDateTime(sale.created_at)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => onEdit(sale)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.375rem 0.75rem', fontSize: '0.75rem', fontWeight: 500,
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem',
              cursor: 'pointer', color: '#475569', transition: 'all 150ms',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = '#15803d'; e.currentTarget.style.color = '#15803d' }}
            onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569' }}
          >
            <Edit2 style={{ width: '0.75rem', height: '0.75rem' }} /> Düzenle
          </button>
          <button
            onClick={() => onDelete(sale)}
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
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
                  Ürün detayı bulunamadı
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr
                  key={item.id}
                  style={{ borderBottom: idx < items.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 120ms' }}
                  onMouseOver={e => (e.currentTarget.style.background = '#f0fdf4')}
                  onMouseOut={e => (e.currentTarget.style.background = '')}
                >
                  <td style={{ padding: '0.625rem 0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem',
                        background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Package style={{ width: '0.875rem', height: '0.875rem', color: '#15803d' }} />
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
                      background: '#f0fdf4', color: '#15803d',
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.875rem', paddingTop: '0.75rem', borderTop: '1px dashed #bbf7d0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: '180px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
            <span>Ara Toplam</span>
            <span>{formatCurrency(sale.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
            <span>KDV (%20)</span>
            <span>{formatCurrency(vatAmount)}</span>
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            paddingTop: '0.375rem', borderTop: '1px solid #e2e8f0', marginTop: '0.125rem',
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>Genel Toplam</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#15803d' }}>{formatCurrency(sale.total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── main component ────────────────────────────────────────────────────────────
export default function Sales() {
  const toast = useToast()
  const { data: sales = [], isLoading, error } = useSales()
  const { data: products = [] } = useProducts()
  const addSaleMutation = useAddSale()
  const updateMutation = useUpdateSale()
  const deleteMutation = useDeleteSale()
  const restoreMutation = useRestoreSale()

  // Sepet (Cart) Store Hook'ları
  const cartItems = useCartItems()
  const cartActions = useCartActions()
  const cartTotal = useCartTotal()
  const cartSubtotal = useCartSubtotal()
  const cartTax = useCartTax()

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

  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  function openCreate() {
    setEditTarget(null); setCustomerName(''); setPaymentMethod('nakit'); setItems([emptyLine()]); setFormError(''); setFormOpen(true)
  }

  function openEdit(sale: Sale) {
    setEditTarget(sale)
    setCustomerName(sale.customer_name ?? '')
    setPaymentMethod(sale.payment_method)
    setItems((sale.items ?? []).map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price })))
    setFormError(''); setFormOpen(true)
  }

  function updateLine(idx: number, patch: Partial<SaleLineItemInput>) {
    setItems(cur => cur.map((line, i) => (i === idx ? { ...line, ...patch } : line)))
  }

  function handleProductSelect(idx: number, productId: string) {
    const product = products.find(p => p.id === productId)
    updateLine(idx, { product_id: productId, unit_price: product?.sale_price ?? 0 })
  }

  function addLine() { setItems(cur => [...cur, emptyLine()]) }
  function removeLine(idx: number) { setItems(cur => cur.filter((_, i) => i !== idx)) }

  function toggleRow(id: string) {
    setExpandedRow(cur => (cur === id ? null : id))
  }

  async function handleSubmit() {
    if (editTarget) {
      const validItems = items.filter(i => i.product_id && i.quantity > 0)
      if (validItems.length === 0) { setFormError('En az bir ürün satırı eklenmelidir.'); return }
      const input: SaleInput = { customer_name: customerName.trim() || null, payment_method: paymentMethod, items: validItems }
      try {
        await updateMutation.mutateAsync({ id: editTarget.id, ...input })
        toast.success('Satış güncellendi.')
        setFormOpen(false)
      } catch (err) { toast.error((err as Error).message) }
    } else {
      if (cartItems.length === 0) { setFormError('Sepet boş. Lütfen ürün ekleyin.'); return }
      try {
        await addSaleMutation.mutateAsync({ 
          customer_name: customerName.trim() || null, 
          payment_method: paymentMethod 
        })
        toast.success('Satış başarıyla tamamlandı.')
        setFormOpen(false)
      } catch (err) { toast.error((err as Error).message) }
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const target = deleteTarget
      await deleteMutation.mutateAsync(target.id)
      toast.undo('Satış silindi.', async () => {
        try { await restoreMutation.mutateAsync(target.id); toast.success('Satış geri yüklendi.') }
        catch (err) { toast.error((err as Error).message) }
      })
      setDeleteTarget(null)
    } catch (err) { toast.error((err as Error).message) }
  }

  async function handleRestore(sale: Sale) {
    setRestoringId(sale.id)
    try { await restoreMutation.mutateAsync(sale.id); toast.success('Satış geri yüklendi.') }
    catch (err) { toast.error((err as Error).message) }
    finally { setRestoringId(null) }
  }

  const isPending = addSaleMutation.isPending || updateMutation.isPending
  const linesTotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
  const vatTotal = Math.round(linesTotal * 0.2 * 100) / 100
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0)

  const paymentCounts = sales.reduce<Record<string, number>>((acc, s) => {
    acc[s.payment_method] = (acc[s.payment_method] ?? 0) + 1
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Header
        title="Satış"
        subtitle={isLoading ? 'Yükleniyor…' : `${sales.length} satış`}
        actions={
          <>
            <button onClick={() => setDeletedOpen(true)} title="Silinenler" className="icon-btn">
              <Archive className="w-3.5 h-3.5" />
            </button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5" /> Yeni Satış
            </Button>
          </>
        }
      />

      <div className="p-3 sm:p-6" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* ── KPI strip ── */}
        {!isLoading && sales.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {[
              { label: 'Toplam Ciro',   value: formatCurrency(totalRevenue),       icon: TrendingUp,  color: '#15803d', bg: '#f0fdf4' },
              { label: 'Satış Adedi',   value: `${sales.length} adet`,              icon: Receipt,     color: '#1d4ed8', bg: '#eff6ff' },
              { label: 'Nakit Satış',   value: `${paymentCounts['nakit'] ?? 0} adet`, icon: Banknote, color: '#c2570a', bg: '#fff7ed' },
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
          <div className="card" style={{ overflow: 'hidden' }}>
            {/* ── Table header ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 140px 100px 110px 40px',
              padding: '0.5rem 1.125rem',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
            }}>
              {['Müşteri / Ürünler', 'Ödeme', 'Tarih', 'Toplam', ''].map((h, i) => (
                <div key={h} style={{
                  fontSize: '0.675rem', fontWeight: 700, color: '#94a3b8',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  textAlign: i === 3 ? 'right' : 'left',
                }}>
                  {h}
                </div>
              ))}
            </div>

            {/* ── Rows ── */}
            {sales.map((s, idx) => {
              const isExpanded = expandedRow === s.id
              const isLast = idx === sales.length - 1

              return (
                <div key={s.id}>
                  <div
                    onClick={() => toggleRow(s.id)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 140px 100px 110px 40px',
                      alignItems: 'center',
                      padding: '0.75rem 1.125rem',
                      borderBottom: (!isLast || isExpanded) ? '1px solid #f1f5f9' : 'none',
                      cursor: 'pointer',
                      transition: 'background 120ms',
                      background: isExpanded ? '#f0fdf4' : undefined,
                    }}
                    onMouseOver={e => { if (!isExpanded) e.currentTarget.style.background = '#fafafa' }}
                    onMouseOut={e => { if (!isExpanded) e.currentTarget.style.background = '' }}
                  >
                    {/* Customer + products */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                          width: '1.625rem', height: '1.625rem', borderRadius: '50%',
                          background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <User style={{ width: '0.8rem', height: '0.8rem', color: '#15803d' }} />
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.customer_name ?? 'Perakende Müşteri'}
                        </span>
                        <StatusBadge variant="green">
                          <CheckCircle2 style={{ width: '0.6rem', height: '0.6rem' }} />
                          Tamamlandı
                        </StatusBadge>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', paddingLeft: '2.125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {(s.items ?? []).map(i => i.product?.name).filter(Boolean).join(' · ') || '—'}
                      </div>
                    </div>

                    {/* Payment */}
                    <div><PaymentBadge method={s.payment_method} /></div>

                    {/* Date */}
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar style={{ width: '0.7rem', height: '0.7rem', flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap' }}>{formatDateTime(s.created_at)}</span>
                    </div>

                    {/* Total */}
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem', textAlign: 'right' }}>
                      {formatCurrency(s.total)}
                    </div>

                    {/* Chevron */}
                    <div style={{
                      width: '1.5rem', height: '1.5rem', borderRadius: '50%',
                      background: isExpanded ? '#bbf7d0' : '#f1f5f9',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 200ms', transform: isExpanded ? 'rotate(180deg)' : 'none', flexShrink: 0,
                    }}>
                      <ChevronDown style={{ width: '0.75rem', height: '0.75rem', color: isExpanded ? '#15803d' : '#94a3b8' }} />
                    </div>
                  </div>

                  {/* Detail panel */}
                  {isExpanded && (
                    <SaleDetailPanel
                      sale={s}
                      onEdit={sale => { openEdit(sale); setExpandedRow(null) }}
                      onDelete={sale => { setDeleteTarget(sale); setExpandedRow(null) }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Form Modal ── */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editTarget ? 'Satışı Düzenle' : 'Yeni Satış'} width="max-w-2xl">
        <div className="p-4 sm:p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '1rem' }}>
            <Input
              label="Müşteri Adı (opsiyonel)"
              placeholder="Perakende müşteri"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
            />
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                Ödeme Yöntemi
              </label>
              <select className="input" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>
              Ürünler *
            </label>
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
                      const err = cartActions.addItem({
                        id: p.id, name: p.name, sku: p.sku, unitPrice: p.sale_price,
                        taxRate: p.vat_rate, maxStock: p.current_stock, unit: p.unit, quantity: 1
                      })
                      if (err) toast.error(err)
                    }
                  }}
                  placeholder="Barkod okut veya ürün ara..."
                  emptyMessage="Ürün bulunamadı"
                  options={products.map(p => ({ value: p.id, label: p.name, sublabel: `Stok: ${p.current_stock} ${p.unit} · Fiyat: ${formatCurrency(p.sale_price)}` }))}
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
            {formError && <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#dc2626' }}>{formError}</p>}
          </div>

          <div className="flex flex-wrap" style={{ justifyContent: 'flex-end', gap: '0.75rem 1.5rem', padding: '0.75rem 0', borderTop: '1px solid #f1f5f9', fontSize: '0.875rem' }}>
            {editTarget ? (
              <>
                <span style={{ color: '#64748b' }}>Ara Toplam: <strong style={{ color: '#0f172a' }}>{formatCurrency(linesTotal)}</strong></span>
                <span style={{ color: '#64748b' }}>KDV (%20): <strong style={{ color: '#0f172a' }}>{formatCurrency(vatTotal)}</strong></span>
                <span style={{ color: '#64748b' }}>Toplam: <strong style={{ color: 'var(--color-primary-600)' }}>{formatCurrency(linesTotal + vatTotal)}</strong></span>
              </>
            ) : (
              <>
                <span style={{ color: '#64748b' }}>Ara Toplam: <strong style={{ color: '#0f172a' }}>{formatCurrency(cartSubtotal)}</strong></span>
                <span style={{ color: '#64748b' }}>Toplam KDV: <strong style={{ color: '#0f172a' }}>{formatCurrency(cartTax)}</strong></span>
                <span style={{ color: '#64748b' }}>Genel Toplam: <strong style={{ color: 'var(--color-primary-600)' }}>{formatCurrency(cartTotal)}</strong></span>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>İptal</Button>
            <Button size="sm" loading={isPending} onClick={handleSubmit}>
              {editTarget ? 'Güncelle' : 'Satışı Tamamla'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete confirmation ── */}
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

      {/* ── Deleted items ── */}
      <DeletedItemsModal
        open={deletedOpen}
        onClose={() => setDeletedOpen(false)}
        title="Silinen Satışlar"
        items={deletedSales}
        isLoading={loadingDeleted}
        keyExtractor={s => s.id}
        restoringId={restoringId}
        onRestore={handleRestore}
        renderItem={s => (
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
