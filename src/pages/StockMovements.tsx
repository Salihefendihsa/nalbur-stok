import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Edit2, Trash2, AlertTriangle, ArrowRightLeft, Archive,
  ArrowUpCircle, ArrowDownCircle, RefreshCw,
  Search, Filter, X, Package, Building2,
  ShoppingCart, ArrowRight, ChevronDown,
  TrendingDown, Clock,
} from 'lucide-react'
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
import type { MovementType, Product, StockMovement } from '@/types/database'
import { formatDateTime, formatStock, formatCurrency } from '@/utils/format'

// ─────────────────────────────────────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────────────────────────────────────

type TabId = 'movements' | 'critical'
type FilterType = 'all' | MovementType

interface MovementMeta {
  label: string
  shortLabel: string
  badgeBg: string
  badgeColor: string
  icon: React.FC<{ style?: React.CSSProperties }>
  sign: '+' | '-' | '~'
  signColor: string
}

const MOVEMENT_META: Record<MovementType, MovementMeta> = {
  in: {
    label: 'Giriş / Alış', shortLabel: 'Giriş',
    badgeBg: '#f0fdf4', badgeColor: '#15803d',
    icon: ArrowUpCircle, sign: '+', signColor: '#15803d',
  },
  out: {
    label: 'Çıkış / Satış', shortLabel: 'Çıkış',
    badgeBg: '#fff7ed', badgeColor: '#c2570a',
    icon: ArrowDownCircle, sign: '-', signColor: '#dc2626',
  },
  adjustment: {
    label: 'Fire / Düzeltme', shortLabel: 'Düzeltme',
    badgeBg: '#f8fafc', badgeColor: '#475569',
    icon: RefreshCw, sign: '~', signColor: '#475569',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock data (kritik stok — gerçek veri gelene kadar)
// ─────────────────────────────────────────────────────────────────────────────

interface MockCritical {
  id: string
  name: string
  sku: string
  unit: string
  current_stock: number
  min_stock: number
  supplier: string
  supplierId: string
  purchase_price: number
  category: string
}

const MOCK_CRITICAL: MockCritical[] = [
  { id: 'm1', name: 'Sızdırmaz Silikon Gri 310ml', sku: 'SLK-GRI-310', unit: 'Adet', current_stock: 3,  min_stock: 20, supplier: 'Henkel Türkiye', supplierId: 's1', purchase_price: 38.50,  category: 'Yapıştırıcı' },
  { id: 'm2', name: 'Elektrik Bandı Siyah 10m',    sku: 'ELK-BND-10',  unit: 'Rulo', current_stock: 7,  min_stock: 30, supplier: 'Çetin Elektrik', supplierId: 's2', purchase_price: 12.00,  category: 'Elektrik'    },
  { id: 'm3', name: 'Çimento Torba 25kg (CEM II)', sku: 'CIM-CEM-25',  unit: 'Torba',current_stock: 9,  min_stock: 50, supplier: 'Batıçim A.Ş.',   supplierId: 's3', purchase_price: 95.00,  category: 'İnşaat'      },
  { id: 'm4', name: 'Dübel+Vida Set 10mm (100lü)', sku: 'DVS-10-100',  unit: 'Set',  current_stock: 4,  min_stock: 25, supplier: 'Fischer TR',    supplierId: 's4', purchase_price: 55.00,  category: 'Hırdavat'    },
  { id: 'm5', name: 'Keser 1000g (Çift Ağız)',     sku: 'KSR-1000-CA', unit: 'Adet', current_stock: 2,  min_stock: 10, supplier: 'Kıral El Aleti',supplierId: 's5', purchase_price: 420.00, category: 'El Aleti'    },
  { id: 'm6', name: 'PVC Boru 1/2" 3m',            sku: 'PVC-12-3M',   unit: 'Adet', current_stock: 11, min_stock: 40, supplier: 'Arçelik Tesisat',supplierId:'s6', purchase_price: 85.00,  category: 'Tesisat'     },
  { id: 'm7', name: 'Beyaz Astar Boya 3.5kg',      sku: 'AST-BYZ-35',  unit: 'Kova', current_stock: 5,  min_stock: 15, supplier: 'Filli Boya A.Ş.',supplierId:'s7',purchase_price: 210.00, category: 'Boya'        },
]

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function MovementBadge({ type }: { type: MovementType }) {
  const meta = MOVEMENT_META[type]
  const Icon = meta.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.2rem 0.6rem', borderRadius: '0.375rem',
      fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.01em',
      background: meta.badgeBg, color: meta.badgeColor,
      whiteSpace: 'nowrap',
    }}>
      <Icon style={{ width: '0.7rem', height: '0.7rem' }} />
      {meta.shortLabel}
    </span>
  )
}

function StockBar({ current, min }: { current: number; min: number }) {
  const pct = Math.min(Math.round((current / min) * 100), 100)
  const color = pct <= 20 ? '#ef4444' : pct <= 50 ? '#f97316' : '#f59e0b'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '120px' }}>
      <div style={{ flex: 1, height: '5px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '999px', transition: 'width 500ms ease-out' }} />
      </div>
      <span style={{ fontSize: '0.67rem', fontWeight: 700, color, minWidth: '26px' }}>%{pct}</span>
    </div>
  )
}

function CriticalBadge({ pct }: { pct: number }) {
  const isCritical = pct <= 20
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      padding: '0.175rem 0.55rem', borderRadius: '0.375rem',
      background: isCritical ? '#fef2f2' : '#fff7ed',
      color: isCritical ? '#b91c1c' : '#c2570a',
      fontSize: '0.7rem', fontWeight: 700,
    }}>
      <AlertTriangle style={{ width: '0.6rem', height: '0.6rem' }} />
      {isCritical ? 'Kritik' : 'Düşük'}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function StockMovements() {
  const toast = useToast()
  const navigate = useNavigate()

  // — real data —
  const { data: movements = [], isLoading, error } = useMovements()
  const { data: products = [] } = useProducts()
  const createMutation = useCreateMovement()
  const updateMutation = useUpdateMovement()
  const deleteMutation = useDeleteMovement()
  const restoreMutation = useRestoreMovement()

  // — form state —
  const [formOpen, setFormOpen]     = useState(false)
  const [editTarget, setEditTarget] = useState<StockMovement | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StockMovement | null>(null)
  const [productId, setProductId]   = useState('')
  const [movementType, setMovementType] = useState<MovementType>('in')
  const [quantity, setQuantity]     = useState(1)
  const [note, setNote]             = useState('')
  const [formError, setFormError]   = useState('')

  // — deleted —
  const [deletedOpen, setDeletedOpen]   = useState(false)
  const [restoringId, setRestoringId]   = useState<string | null>(null)
  const { data: deletedMovements = [], isLoading: loadingDeleted } = useDeletedMovements(deletedOpen)

  // — tab —
  const [activeTab, setActiveTab] = useState<TabId>('movements')

  // — filters (movements tab) —
  const [searchQuery, setSearchQuery]   = useState('')
  const [filterType, setFilterType]     = useState<FilterType>('all')
  const [filterTypeOpen, setFilterTypeOpen] = useState(false)
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')

  // — critical tab —
  const [criticalSearch, setCriticalSearch] = useState('')

  // ── derive critical products from real data + mock fallback ──
  const criticalProducts: MockCritical[] = useMemo(() => {
    const real = products
      .filter(p => p.current_stock < p.min_stock && p.is_active)
      .map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        current_stock: p.current_stock,
        min_stock: p.min_stock,
        supplier: p.supplier?.name ?? 'Belirtilmemiş',
        supplierId: p.supplier_id ?? '',
        purchase_price: p.purchase_price,
        category: p.category?.name ?? '—',
      }))
    // If no real critical products, show mock data for presentation
    return real.length > 0 ? real : MOCK_CRITICAL
  }, [products])

  const filteredCritical = useMemo(() => {
    const q = criticalSearch.toLowerCase()
    if (!q) return criticalProducts
    return criticalProducts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.supplier.toLowerCase().includes(q)
    )
  }, [criticalProducts, criticalSearch])

  // ── filter movements ──
  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      if (filterType !== 'all' && m.movement_type !== filterType) return false
      
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const nameMatch = (m.product?.name || '').toLowerCase().includes(q)
        const skuMatch  = (m.product?.sku || '').toLowerCase().includes(q)
        const refMatch  = (m.reference_id || '').toLowerCase().includes(q)
        const noteMatch = (m.note || '').toLowerCase().includes(q)
        if (!nameMatch && !skuMatch && !refMatch && !noteMatch) return false
      }
      
      if (dateFrom) {
        const start = new Date(dateFrom)
        start.setHours(0, 0, 0, 0)
        if (new Date(m.created_at) < start) return false
      }
      
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        if (new Date(m.created_at) > end) return false
      }
      
      return true
    })
  }, [movements, filterType, searchQuery, dateFrom, dateTo])

  const hasFilters = filterType !== 'all' || searchQuery || dateFrom || dateTo

  function clearFilters() {
    setFilterType('all'); setSearchQuery(''); setDateFrom(''); setDateTo('')
  }

  // ── form helpers ──
  function openCreate() {
    setEditTarget(null); setProductId(''); setMovementType('in')
    setQuantity(1); setNote(''); setFormError(''); setFormOpen(true)
  }

  function openEdit(m: StockMovement) {
    setEditTarget(m); setNote(m.note ?? ''); setFormError(''); setFormOpen(true)
  }

  async function handleSubmit() {
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, note: note.trim() || null })
        toast.success('Hareket güncellendi.')
      } else {
        if (!productId) { setFormError('Ürün seçilmelidir.'); return }
        if (quantity <= 0) { setFormError("Miktar 0'dan büyük olmalıdır."); return }
        const input: MovementInput = { product_id: productId, movement_type: movementType, quantity, note: note.trim() || null }
        await createMutation.mutateAsync(input)
        toast.success('Stok hareketi eklendi.')
      }
      setFormOpen(false)
    } catch (err) { toast.error((err as Error).message) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const target = deleteTarget
      await deleteMutation.mutateAsync(target.id)
      toast.undo('Stok hareketi silindi.', async () => {
        try { await restoreMutation.mutateAsync(target.id); toast.success('Hareket geri yüklendi.') }
        catch (err) { toast.error((err as Error).message) }
      })
      setDeleteTarget(null)
    } catch (err) { toast.error((err as Error).message) }
  }

  async function handleRestore(m: StockMovement) {
    setRestoringId(m.id)
    try { await restoreMutation.mutateAsync(m.id); toast.success('Hareket geri yüklendi.') }
    catch (err) { toast.error((err as Error).message) }
    finally { setRestoringId(null) }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Header
        title="Stok Hareketleri"
        subtitle={isLoading ? 'Yükleniyor…' : `${movements.length} hareket · ${criticalProducts.length} kritik ürün`}
        actions={
          <>
            <button onClick={() => setDeletedOpen(true)} title="Silinenler" className="icon-btn">
              <Archive className="w-3.5 h-3.5" />
            </button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5" /> Yeni Hareket
            </Button>
          </>
        }
      />

      <div className="p-3 sm:p-6" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* ══════════════════════════════════════════
            TABS
        ══════════════════════════════════════════ */}
        <div style={{ display: 'flex', gap: '0', background: '#f1f5f9', borderRadius: '0.625rem', padding: '0.25rem', width: 'fit-content' }}>
          {([
            { id: 'movements' as TabId, label: 'Tüm Hareketler', icon: ArrowRightLeft, count: movements.length },
            { id: 'critical'  as TabId, label: 'Kritik Stok',    icon: AlertTriangle,  count: criticalProducts.length },
          ] as const).map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.375rem 1rem', borderRadius: '0.375rem', border: 'none',
                  cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600,
                  background: active ? '#fff' : 'transparent',
                  color: active ? '#0f172a' : '#64748b',
                  boxShadow: active ? '0 1px 4px rgb(15 23 42 / 0.1)' : 'none',
                  transition: 'all 150ms',
                }}
              >
                <Icon style={{ width: '0.875rem', height: '0.875rem', color: active ? (tab.id === 'critical' ? '#ef4444' : '#f97316') : '#94a3b8' }} />
                {tab.label}
                <span style={{
                  padding: '0.05rem 0.45rem', borderRadius: '999px',
                  background: active ? (tab.id === 'critical' ? '#fef2f2' : '#fff7ed') : '#e2e8f0',
                  color: active ? (tab.id === 'critical' ? '#b91c1c' : '#c2570a') : '#64748b',
                  fontSize: '0.68rem', fontWeight: 700,
                }}>
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* ══════════════════════════════════════════
            TAB: TÜM HAREKETLER
        ══════════════════════════════════════════ */}
        {activeTab === 'movements' && (
          <>
            {/* ── Filter bar ── */}
            <div style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.875rem',
              padding: '0.875rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.625rem', alignItems: 'center',
              boxShadow: '0 1px 3px 0 rgb(15 23 42 / 0.05)',
            }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: '1', minWidth: '180px' }}>
                <Search style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', width: '0.875rem', height: '0.875rem', color: '#94a3b8', pointerEvents: 'none' }} />
                <input
                  className="input"
                  style={{ paddingLeft: '2rem', fontSize: '0.8125rem' }}
                  placeholder="Ürün adı, not ara…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Type dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setFilterTypeOpen(o => !o)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.5rem 0.75rem', fontSize: '0.8125rem', fontWeight: 500,
                    background: filterType !== 'all' ? '#fff7ed' : '#fff',
                    border: `1px solid ${filterType !== 'all' ? '#fed7aa' : '#e2e8f0'}`,
                    borderRadius: '0.5rem', cursor: 'pointer', color: filterType !== 'all' ? '#c2570a' : '#475569',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Filter style={{ width: '0.8rem', height: '0.8rem' }} />
                  {filterType === 'all' ? 'Tüm Tipler' : MOVEMENT_META[filterType].shortLabel}
                  <ChevronDown style={{ width: '0.75rem', height: '0.75rem', opacity: 0.6 }} />
                </button>
                {filterTypeOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.625rem',
                    boxShadow: '0 8px 24px rgb(15 23 42 / 0.12)', overflow: 'hidden', minWidth: '160px',
                  }}>
                    {(['all', 'in', 'out', 'adjustment'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => { setFilterType(t); setFilterTypeOpen(false) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          width: '100%', padding: '0.5rem 0.875rem', border: 'none',
                          background: filterType === t ? '#f8fafc' : '#fff',
                          cursor: 'pointer', fontSize: '0.8125rem', color: '#0f172a',
                          textAlign: 'left',
                        }}
                      >
                        {t === 'all' ? (
                          <><ArrowRightLeft style={{ width: '0.8rem', height: '0.8rem', color: '#94a3b8' }} /> Tüm Tipler</>
                        ) : (
                          <><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: MOVEMENT_META[t].badgeColor, display: 'inline-block', flexShrink: 0 }} />{MOVEMENT_META[t].label}</>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Date range */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <input type="date" className="input" style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem', width: '130px' }}
                  value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="Başlangıç tarihi" />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>—</span>
                <input type="date" className="input" style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem', width: '130px' }}
                  value={dateTo} onChange={e => setDateTo(e.target.value)} title="Bitiş tarihi" />
              </div>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    padding: '0.375rem 0.625rem', fontSize: '0.75rem', fontWeight: 500,
                    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem',
                    cursor: 'pointer', color: '#b91c1c',
                  }}
                >
                  <X style={{ width: '0.75rem', height: '0.75rem' }} /> Temizle
                </button>
              )}

              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                {filteredMovements.length} sonuç
              </span>
            </div>

            {/* ── Table ── */}
            {isLoading ? (
              <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: '52px', borderRadius: '0.5rem' }} />
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
            ) : filteredMovements.length === 0 ? (
              <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>Filtreyle eşleşen hareket bulunamadı.</p>
                <button onClick={clearFilters} style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#f97316', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  Filtreleri temizle
                </button>
              </div>
            ) : (
              <div className="card" style={{ overflow: 'hidden' }}>
                {/* table head */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '100px 1fr 110px 90px 130px 130px 72px',
                  padding: '0.5rem 1.125rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
                }}>
                  {['İşlem', 'Ürün Adı / SKU', 'Miktar Δ', 'Kalan', 'Referans', 'Tarih', ''].map((h, i) => (
                    <span key={h} style={{
                      fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      textAlign: i >= 2 && i <= 4 ? 'center' : i === 6 ? 'right' : 'left',
                    }}>{h}</span>
                  ))}
                </div>

                {/* rows */}
                <div>
                  {filteredMovements.map((m, idx) => {
                    const meta = MOVEMENT_META[m.movement_type]
                    const isLast = idx === filteredMovements.length - 1
                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'grid', gridTemplateColumns: '100px 1fr 110px 90px 130px 130px 72px',
                          alignItems: 'center', padding: '0.75rem 1.125rem',
                          borderBottom: !isLast ? '1px solid #f8fafc' : 'none',
                          transition: 'background 120ms',
                        }}
                        onMouseOver={e => (e.currentTarget.style.background = '#fafafa')}
                        onMouseOut={e => (e.currentTarget.style.background = '')}
                      >
                        {/* type badge */}
                        <div><MovementBadge type={m.movement_type} /></div>

                        {/* product name + sku */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.product?.name ?? '—'}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.1rem' }}>
                            {m.note
                              ? <><Clock style={{ width: '0.625rem', height: '0.625rem' }} />{m.note}</>
                              : <span style={{ fontStyle: 'italic' }}>Not yok</span>}
                          </div>
                        </div>

                        {/* quantity delta */}
                        <div style={{ textAlign: 'center' }}>
                          <span style={{
                            fontWeight: 800, fontSize: '0.9rem', color: meta.signColor,
                          }}>
                            {meta.sign}{m.quantity} {m.product?.unit ?? 'adet'}
                          </span>
                        </div>

                        {/* remaining stock */}
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#334155' }}>
                            {m.stock_after ?? '—'}
                          </span>
                        </div>

                        {/* reference */}
                        <div style={{ textAlign: 'center' }}>
                          {m.reference_id ? (
                            <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#64748b', background: '#f8fafc', padding: '0.1rem 0.375rem', borderRadius: '0.25rem', border: '1px solid #e2e8f0' }}>
                              {m.reference_id.slice(0, 8)}…
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontStyle: 'italic' }}>
                              {m.reference_type ?? 'Manuel'}
                            </span>
                          )}
                        </div>

                        {/* date */}
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock style={{ width: '0.7rem', height: '0.7rem', flexShrink: 0 }} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {formatDateTime(m.created_at)}
                          </span>
                        </div>

                        {/* actions */}
                        <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                          <button onClick={() => openEdit(m)} title="Notu düzenle" className="icon-btn">
                            <Edit2 style={{ width: '0.8rem', height: '0.8rem' }} />
                          </button>
                          <button onClick={() => setDeleteTarget(m)} className="icon-btn icon-btn-danger">
                            <Trash2 style={{ width: '0.8rem', height: '0.8rem' }} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════
            TAB: KRİTİK STOK
        ══════════════════════════════════════════ */}
        {activeTab === 'critical' && (
          <>
            {/* ── KPI banner ── */}
            <div style={{
              background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 60%, #b91c1c 100%)',
              borderRadius: '0.875rem', padding: '1.125rem 1.375rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
              boxShadow: '0 4px 20px rgb(185 28 28 / 0.35)',
              animation: 'fade-in-up 300ms ease-out',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.625rem', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AlertTriangle style={{ width: '1.25rem', height: '1.25rem', color: '#fca5a5' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Acil İkmal Gerekiyor
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.125rem' }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                      {criticalProducts.length}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: '#fca5a5', fontWeight: 500 }}>
                      ürün kritik seviyenin altında
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {[
                  { label: 'Kritik (≤%20)', count: criticalProducts.filter(p => Math.round((p.current_stock / p.min_stock) * 100) <= 20).length, color: '#fca5a5' },
                  { label: 'Düşük (%20–50)', count: criticalProducts.filter(p => { const pct = Math.round((p.current_stock / p.min_stock) * 100); return pct > 20 && pct <= 50 }).length, color: '#fdba74' },
                ].map(stat => (
                  <div key={stat.label} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.5rem 0.875rem' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: stat.color }}>{stat.count}</div>
                    <div style={{ fontSize: '0.65rem', color: '#fca5a5', fontWeight: 600 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Search bar ── */}
            <div style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.875rem',
              padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
              boxShadow: '0 1px 3px 0 rgb(15 23 42 / 0.05)',
            }}>
              <Search style={{ width: '0.875rem', height: '0.875rem', color: '#94a3b8', flexShrink: 0 }} />
              <input
                className="input"
                style={{ border: 'none', outline: 'none', padding: 0, fontSize: '0.8125rem', flex: 1, boxShadow: 'none' }}
                placeholder="Ürün adı, SKU veya tedarikçi ara…"
                value={criticalSearch}
                onChange={e => setCriticalSearch(e.target.value)}
              />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', flexShrink: 0 }}>
                {filteredCritical.length} ürün
              </span>
            </div>

            {/* ── Cards grid ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredCritical.length === 0 ? (
                <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>
                    {criticalSearch ? 'Aramayla eşleşen kritik ürün bulunamadı.' : 'Kritik stok seviyesinde ürün yok. Harika!'}
                  </p>
                </div>
              ) : (
                filteredCritical.map((product, idx) => {
                  const pct = Math.round((product.current_stock / product.min_stock) * 100)
                  const isCritical = pct <= 20
                  const deficit = product.min_stock - product.current_stock
                  return (
                    <div
                      key={product.id}
                      style={{
                        background: '#fff', border: `1px solid ${isCritical ? '#fecaca' : '#fed7aa'}`,
                        borderRadius: '0.875rem', padding: '1rem 1.125rem',
                        boxShadow: `0 1px 4px rgb(${isCritical ? '185 28 28' : '194 87 10'} / 0.07)`,
                        display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                        animation: `fade-in-up 250ms ${idx * 40}ms both ease-out`,
                        transition: 'box-shadow 150ms',
                      }}
                      onMouseOver={e => (e.currentTarget.style.boxShadow = `0 4px 14px rgb(${isCritical ? '185 28 28' : '194 87 10'} / 0.13)`)}
                      onMouseOut={e => (e.currentTarget.style.boxShadow = `0 1px 4px rgb(${isCritical ? '185 28 28' : '194 87 10'} / 0.07)`)}
                    >
                      {/* icon */}
                      <div style={{
                        width: '2.5rem', height: '2.5rem', borderRadius: '0.625rem', flexShrink: 0,
                        background: isCritical ? '#fef2f2' : '#fff7ed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Package style={{ width: '1.1rem', height: '1.1rem', color: isCritical ? '#dc2626' : '#c2570a' }} />
                      </div>

                      {/* name + meta */}
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>{product.name}</span>
                          <CriticalBadge pct={pct} />
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'monospace' }}>{product.sku}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.775rem', color: '#64748b' }}>
                            <Building2 style={{ width: '0.7rem', height: '0.7rem' }} />
                            {product.supplier}
                          </div>
                          <span style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
                            Kategori: {product.category}
                          </span>
                          <span style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
                            Birim Maliyet: {formatCurrency(product.purchase_price)}
                          </span>
                        </div>
                      </div>

                      {/* stock info */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', minWidth: '160px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.775rem' }}>
                          <span style={{ color: '#64748b' }}>Mevcut:</span>
                          <span style={{ fontWeight: 800, color: isCritical ? '#dc2626' : '#c2570a' }}>
                            {product.current_stock} {product.unit}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.775rem' }}>
                          <span style={{ color: '#64748b' }}>Min. Seviye:</span>
                          <span style={{ fontWeight: 600, color: '#334155' }}>{product.min_stock} {product.unit}</span>
                        </div>
                        <StockBar current={product.current_stock} min={product.min_stock} />
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'right' }}>
                          Eksik: <strong style={{ color: isCritical ? '#dc2626' : '#c2570a' }}>{deficit} {product.unit}</strong>
                          {' · '}Maliyet: <strong>{formatCurrency(deficit * product.purchase_price)}</strong>
                        </div>
                      </div>

                      {/* action */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        <button
                          onClick={() => navigate('/alis')}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.5rem 0.875rem', fontSize: '0.775rem', fontWeight: 600,
                            background: 'linear-gradient(135deg, #f97316, #ea6c0a)',
                            border: 'none', borderRadius: '0.5rem', cursor: 'pointer', color: '#fff',
                            boxShadow: '0 2px 8px rgb(249 115 22 / 0.35)',
                            transition: 'all 150ms',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseOver={e => (e.currentTarget.style.boxShadow = '0 4px 14px rgb(249 115 22 / 0.5)')}
                          onMouseOut={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgb(249 115 22 / 0.35)')}
                        >
                          <ShoppingCart style={{ width: '0.8rem', height: '0.8rem' }} />
                          Alışa Git
                          <ArrowRight style={{ width: '0.75rem', height: '0.75rem' }} />
                        </button>
                        <button
                          onClick={() => {
                            setProductId(product.id)
                            setMovementType('in')
                            setQuantity(deficit)
                            setNote(`${product.name} için acil ikmal`)
                            setEditTarget(null)
                            setFormError('')
                            setFormOpen(true)
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.5rem 0.875rem', fontSize: '0.775rem', fontWeight: 600,
                            background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem',
                            cursor: 'pointer', color: '#475569', transition: 'all 150ms',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseOver={e => { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.color = '#c2570a' }}
                          onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569' }}
                        >
                          <Plus style={{ width: '0.8rem', height: '0.8rem' }} />
                          Hızlı Giriş
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════
          FORM MODAL
      ══════════════════════════════════════════ */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editTarget ? 'Hareketi Düzenle' : 'Yeni Stok Hareketi'} width="max-w-md">
        <div className="p-4 sm:p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!editTarget && (
            <>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  Ürün *
                </label>
                <select className="input" value={productId} onChange={e => setProductId(e.target.value)}>
                  <option value="">Ürün seçin…</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({formatStock(p.current_stock, p.unit)})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    Hareket Türü
                  </label>
                  <select className="input" value={movementType} onChange={e => setMovementType(e.target.value as MovementType)}>
                    <option value="in">Giriş / Alış</option>
                    <option value="out">Çıkış / Satış</option>
                    <option value="adjustment">Fire / Düzeltme</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    Miktar
                  </label>
                  <input className="input" type="number" min={0} value={quantity}
                    onChange={e => setQuantity(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </>
          )}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>Not</label>
            <textarea className="input" style={{ resize: 'none' }} rows={3}
              placeholder="Örn: Tedarikçiden alım, Müşteriye satış…"
              value={note} onChange={e => setNote(e.target.value)} />
          </div>
          {formError && <p style={{ fontSize: '0.75rem', color: '#dc2626', margin: 0 }}>{formError}</p>}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
            <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>İptal</Button>
            <Button size="sm" loading={isPending} onClick={handleSubmit}>
              {editTarget ? 'Güncelle' : 'Oluştur'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════
          DELETE MODAL
      ══════════════════════════════════════════ */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hareketi Sil" width="max-w-sm">
        <div className="p-4 sm:p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <AlertTriangle style={{ width: '1.25rem', height: '1.25rem', color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500, color: '#0f172a' }}>Bu stok hareketi silinecek</p>
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

      {/* ══════════════════════════════════════════
          DELETED ITEMS
      ══════════════════════════════════════════ */}
      <DeletedItemsModal
        open={deletedOpen}
        onClose={() => setDeletedOpen(false)}
        title="Silinen Hareketler"
        items={deletedMovements}
        isLoading={loadingDeleted}
        keyExtractor={m => m.id}
        restoringId={restoringId}
        onRestore={handleRestore}
        renderItem={m => (
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
              {MOVEMENT_META[m.movement_type].shortLabel} — {m.product?.name ?? 'Ürün'}
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
