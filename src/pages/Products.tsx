import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Plus, Search, AlertCircle } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import { useProducts } from '@/lib/queries/products'
import { useDebounce } from '@/hooks/useDebounce'
import type { Product } from '@/types/database'
import { formatCurrency, formatStock } from '@/utils/format'

const ROW_H = 56
const COLS = '100px 1fr 120px 130px 130px 72px'

export default function Products() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const { data = [], isLoading, error } = useProducts(debouncedSearch)

  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: data.length,
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
            : `${data.length} ürün${debouncedSearch ? ' (filtrelenmiş)' : ''}`
        }
        actions={
          <Button size="sm" onClick={() => navigate('/urunler/yeni')}>
            <Plus className="w-3.5 h-3.5" />
            Yeni Ürün
          </Button>
        }
      />

      <div style={{ flex: 1, minHeight: 0, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <div className="card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
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
          </div>

          {/* Column headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: COLS,
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
                <div key={i} style={{ display: 'grid', gridTemplateColumns: COLS, alignItems: 'center', gap: '1rem', paddingInline: '0' }}>
                  <div className="skeleton" style={{ height: '14px', width: '60px' }} />
                  <div className="skeleton" style={{ height: '14px', width: '160px' }} />
                  <div className="skeleton" style={{ height: '14px', width: '70px' }} />
                  <div className="skeleton" style={{ height: '14px', width: '80px' }} />
                  <div className="skeleton" style={{ height: '14px', width: '80px' }} />
                  <div className="skeleton" style={{ height: '20px', width: '48px', borderRadius: '0.375rem' }} />
                </div>
              ))}
            </div>
          ) : data.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: '#94a3b8' }}>
              <p style={{ fontSize: '0.875rem' }}>
                {debouncedSearch ? 'Aramanızla eşleşen ürün bulunamadı.' : 'Henüz ürün eklenmemiş.'}
              </p>
              {!debouncedSearch && (
                <Button size="sm" onClick={() => navigate('/urunler/yeni')}>
                  <Plus className="w-3.5 h-3.5" />
                  İlk ürünü ekle
                </Button>
              )}
            </div>
          ) : (
            <div ref={parentRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <div style={{ height: totalSize, position: 'relative' }}>
                {virtualItems.map((vRow) => {
                  const p = data[vRow.index]
                  return (
                    <ProductRow
                      key={vRow.key}
                      product={p}
                      top={vRow.start}
                      height={ROW_H}
                      onClick={() => navigate(`/urunler/${p.id}`)}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          {data.length > 0 && (
            <div style={{ padding: '0.375rem 1rem', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#94a3b8', flexShrink: 0 }}>
              {data.length.toLocaleString('tr-TR')} ürün
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface ProductRowProps {
  product: Product
  top: number
  height: number
  onClick: () => void
}

function ProductRow({ product: p, top, height, onClick }: ProductRowProps) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height, transform: `translateY(${top}px)`,
        display: 'grid', gridTemplateColumns: COLS,
        alignItems: 'center', padding: '0 1rem',
        borderBottom: '1px solid #f8fafc',
        cursor: 'pointer',
        transition: 'background-color 100ms',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
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
      <span className={p.is_active ? 'badge-green' : 'badge-gray'}>
        {p.is_active ? 'Aktif' : 'Pasif'}
      </span>
    </div>
  )
}
