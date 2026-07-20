import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Plus, Search, AlertCircle, PackageSearch, Archive, ScanLine, AlertTriangle, X } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import DeletedItemsModal from '@/components/ui/DeletedItemsModal'
import BarcodeScanner from '@/components/ui/BarcodeScanner'
import { useProducts, useDeletedProducts, useRestoreProduct } from '@/lib/queries/products'
import { findProductByBarcode } from '@/lib/barcode'
import { useDebounce } from '@/hooks/useDebounce'
import { useToast } from '@/store/toast'
import type { Product } from '@/types/database'
import { formatCurrency, formatDate, formatStock } from '@/utils/format'

const ROW_H = 56
const COLS = '100px 1fr 120px 130px 130px 110px'

function stockStatus(p: Product): { label: string; className: string } {
  if (p.current_stock <= p.min_stock) return { label: 'Kritik', className: 'badge-red' }
  if (p.current_stock <= p.min_stock * 2) return { label: 'Normal', className: 'badge-yellow' }
  return { label: 'Yüksek', className: 'badge-green' }
}

export default function Products() {
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const { data = [], isLoading, error } = useProducts(debouncedSearch)

  const criticalOnly = searchParams.get('filter') === 'kritik'
  const visibleData = criticalOnly ? data.filter((p) => p.current_stock <= p.min_stock) : data

  function clearCriticalFilter() {
    const next = new URLSearchParams(searchParams)
    next.delete('filter')
    setSearchParams(next)
  }

  const [deletedOpen, setDeletedOpen] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const { data: deletedProducts = [], isLoading: loadingDeleted } = useDeletedProducts(deletedOpen)
  const restoreMutation = useRestoreProduct()

  const [scannerOpen, setScannerOpen] = useState(false)

  async function handleScan(code: string) {
    try {
      const product = await findProductByBarcode(code)
      if (product) {
        navigate(`/urunler/${product.id}`)
      } else {
        navigate('/urunler/yeni', { state: { barcode: code } })
      }
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handleRestore(p: Product) {
    setRestoringId(p.id)
    try {
      await restoreMutation.mutateAsync(p.id)
      toast.success(`"${p.name}" geri yüklendi.`)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setRestoringId(null)
    }
  }

  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: visibleData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_H,
    overscan: 15,
  })
  const virtualItems = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Header
        title="Ürünler"
        subtitle={
          isLoading
            ? 'Yükleniyor…'
            : `${visibleData.length} ürün${debouncedSearch || criticalOnly ? ' (filtrelenmiş)' : ''}`
        }
        actions={
          <>
            <button
              onClick={() => setDeletedOpen(true)}
              title="Silinenler"
              className="icon-btn"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
            <Button variant="secondary" size="sm" onClick={() => setScannerOpen(true)}>
              <ScanLine className="w-3.5 h-3.5" />
              Barkod Tara
            </Button>
            <Button size="sm" onClick={() => navigate('/urunler/yeni')}>
              <Plus className="w-3.5 h-3.5" />
              Yeni Ürün
            </Button>
          </>
        }
      />

      <div className="p-3 sm:p-6" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', flexShrink: 0, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '22rem' }}>
              <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#94a3b8', pointerEvents: 'none' }} />
              <input
                className="input"
                style={{ paddingLeft: '2.25rem' }}
                placeholder="Ad, SKU veya barkod ara…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {criticalOnly && (
              <button
                onClick={clearCriticalFilter}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.3rem 0.625rem', borderRadius: '999px',
                  background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
                  fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                <AlertTriangle style={{ width: '0.75rem', height: '0.75rem' }} />
                Kritik Stok
                <X style={{ width: '0.75rem', height: '0.75rem' }} />
              </button>
            )}
          </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowX: 'auto' }}>
          {/* Column headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: COLS, minWidth: '620px',
            padding: '0.625rem 1rem', borderBottom: '1px solid #f1f5f9',
            fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em',
            flexShrink: 0,
          }}>
            <span>SKU</span><span>Ürün Adı</span><span>Stok</span>
            <span>Satış Fiyatı</span><span>Alış Fiyatı</span><span>Durum</span>
          </div>

          {/* Body */}
          {error ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: '#ef4444' }}>
              <AlertCircle style={{ width: '2rem', height: '2rem' }} />
              <p style={{ fontSize: '0.875rem' }}>
                Yükleme hatası: {(error as Error).message}
              </p>
            </div>
          ) : isLoading ? (
            <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'hidden' }}>
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: COLS, minWidth: '620px', alignItems: 'center', gap: '1rem', paddingInline: '0' }}>
                  <div className="skeleton" style={{ height: '14px', width: '60px' }} />
                  <div className="skeleton" style={{ height: '14px', width: '160px' }} />
                  <div className="skeleton" style={{ height: '14px', width: '70px' }} />
                  <div className="skeleton" style={{ height: '14px', width: '80px' }} />
                  <div className="skeleton" style={{ height: '14px', width: '80px' }} />
                  <div className="skeleton" style={{ height: '20px', width: '60px', borderRadius: '0.375rem' }} />
                </div>
              ))}
            </div>
          ) : visibleData.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title={
                criticalOnly
                  ? 'Kritik stokta ürün yok.'
                  : debouncedSearch
                  ? 'Aramanızla eşleşen ürün bulunamadı.'
                  : 'Henüz ürün eklenmemiş.'
              }
              description={
                criticalOnly
                  ? 'Tüm ürünler yeterli stok seviyesinde.'
                  : debouncedSearch
                  ? 'Farklı bir arama terimi deneyin.'
                  : 'İlk ürününüzü ekleyerek stok takibine başlayın.'
              }
              action={
                criticalOnly ? (
                  <Button variant="secondary" size="sm" onClick={clearCriticalFilter}>
                    <X className="w-3.5 h-3.5" />
                    Filtreyi temizle
                  </Button>
                ) : !debouncedSearch ? (
                  <Button size="sm" onClick={() => navigate('/urunler/yeni')}>
                    <Plus className="w-3.5 h-3.5" />
                    İlk ürünü ekle
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div ref={parentRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', minWidth: '620px' }}>
              <div style={{ height: totalSize, position: 'relative', minWidth: '620px' }}>
                {virtualItems.map((vRow) => {
                  const p = visibleData[vRow.index]
                  return (
                    <ProductRow
                      key={vRow.key}
                      product={p}
                      top={vRow.start}
                      height={ROW_H}
                      alt={vRow.index % 2 === 1}
                      onClick={() => navigate(`/urunler/${p.id}`)}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>

          {/* Footer */}
          {visibleData.length > 0 && (
            <div style={{ padding: '0.375rem 1rem', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#94a3b8', flexShrink: 0 }}>
              {visibleData.length.toLocaleString('tr-TR')} ürün
            </div>
          )}
        </div>
      </div>

      <DeletedItemsModal
        open={deletedOpen}
        onClose={() => setDeletedOpen(false)}
        title="Silinen Ürünler"
        items={deletedProducts}
        isLoading={loadingDeleted}
        keyExtractor={(p) => p.id}
        restoringId={restoringId}
        onRestore={handleRestore}
        renderItem={(p) => (
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{p.name}</p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
              SKU: {p.sku} · Silinme: {p.deleted_at ? formatDate(p.deleted_at) : '—'}
            </p>
          </div>
        )}
      />

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
      />
    </div>
  )
}

interface ProductRowProps {
  product: Product
  top: number
  height: number
  alt: boolean
  onClick: () => void
}

function ProductRow({ product: p, top, height, alt, onClick }: ProductRowProps) {
  const status = stockStatus(p)
  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height, transform: `translateY(${top}px)`,
        display: 'grid', gridTemplateColumns: COLS,
        alignItems: 'center', padding: '0 1rem',
        borderBottom: '1px solid #f8fafc',
        backgroundColor: alt ? '#f8fafc' : '#fff',
        cursor: 'pointer',
        transition: 'background-color 100ms',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fff7ed')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = alt ? '#f8fafc' : '#fff')}
    >
      <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#94a3b8' }}>{p.sku}</span>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontWeight: 500, fontSize: '0.875rem', color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.name}
        </p>
        {p.category && (
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>{p.category.name}</p>
        )}
      </div>
      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: p.current_stock <= p.min_stock ? '#dc2626' : '#0f172a' }}>
        {formatStock(p.current_stock, p.unit)}
      </span>
      <span style={{ fontSize: '0.875rem', color: '#334155' }}>{formatCurrency(p.sale_price)}</span>
      <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{formatCurrency(p.purchase_price)}</span>
      <span className={status.className}>{status.label}</span>
    </div>
  )
}
