import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, AlertTriangle, ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { useProduct, useDeleteProduct, useRestoreProduct } from '@/lib/queries/products'
import { useProductMovements } from '@/lib/queries/movements'
import { useToast } from '@/store/toast'
import { formatCurrency, formatDate, formatDateTime, formatStock } from '@/utils/format'
import type { MovementType } from '@/types/database'

const MOVEMENT_LABEL: Record<MovementType, string> = {
  in: 'Giriş',
  out: 'Çıkış',
  adjustment: 'Düzeltme',
}

const MOVEMENT_ICON: Record<MovementType, React.ReactNode> = {
  in: <ArrowUpCircle style={{ width: '1rem', height: '1rem', color: '#16a34a' }} />,
  out: <ArrowDownCircle style={{ width: '1rem', height: '1rem', color: '#dc2626' }} />,
  adjustment: <RefreshCw style={{ width: '1rem', height: '1rem', color: '#d97706' }} />,
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      <span style={{ fontSize: '0.875rem', color: '#0f172a', fontWeight: 500 }}>{value ?? '—'}</span>
    </div>
  )
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const { data: product, isLoading, error } = useProduct(id ?? '')
  const { data: movements = [], isLoading: loadingMovements } = useProductMovements(id ?? '')
  const deleteMutation = useDeleteProduct()
  const restoreMutation = useRestoreProduct()

  async function handleDelete() {
    try {
      const productId = id!
      const productName = product?.name ?? 'Ürün'
      await deleteMutation.mutateAsync(productId)
      toast.undo(`"${productName}" silindi.`, async () => {
        try {
          await restoreMutation.mutateAsync(productId)
          toast.success('Ürün geri yüklendi.')
        } catch (err) {
          toast.error((err as Error).message)
        }
      })
      navigate('/urunler')
    } catch (err) {
      toast.error((err as Error).message)
      setShowDeleteModal(false)
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <Header title="Ürün Detayı" />
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '860px' }}>
          <div className="card" style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <div className="skeleton" style={{ height: '10px', width: '60px' }} />
                <div className="skeleton" style={{ height: '20px', width: '120px' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <Header title="Ürün Detayı" />
        <div style={{ padding: '1.5rem' }}>
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
            <p>Ürün bulunamadı.</p>
            <Button variant="secondary" size="sm" onClick={() => navigate('/urunler')} style={{ marginTop: '1rem' }}>
              Listeye Dön
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const margin = product.sale_price > 0
    ? ((product.sale_price - product.purchase_price) / product.sale_price * 100).toFixed(1)
    : '0'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Header
        title={product.name}
        subtitle={`SKU: ${product.sku}`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => navigate('/urunler')}>
              <ArrowLeft className="w-3.5 h-3.5" />
              Listeye Dön
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/urunler/${id}/duzenle`)}>
              <Edit className="w-3.5 h-3.5" />
              Düzenle
            </Button>
            <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
              <Trash2 className="w-3.5 h-3.5" />
              Sil
            </Button>
          </>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        <div style={{ maxWidth: '860px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Info grid */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
              <InfoRow label="SKU" value={<span style={{ fontFamily: 'monospace' }}>{product.sku}</span>} />
              <InfoRow label="Barkod" value={product.barcode} />
              <InfoRow label="Birim" value={product.unit} />
              <InfoRow label="Kategori" value={product.category?.name} />
              <InfoRow label="Tedarikçi" value={product.supplier?.name} />
              <InfoRow label="Durum" value={
                <span className={product.is_active ? 'badge-green' : 'badge-gray'}>
                  {product.is_active ? 'Aktif' : 'Pasif'}
                </span>
              } />
            </div>
          </div>

          {/* Stock & Prices */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {[
              { label: 'Mevcut Stok', value: formatStock(product.current_stock, product.unit), danger: product.current_stock <= product.min_stock },
              { label: 'Minimum Stok', value: formatStock(product.min_stock, product.unit), danger: false },
              { label: 'Alış Fiyatı', value: formatCurrency(product.purchase_price), danger: false },
              { label: 'Satış Fiyatı', value: formatCurrency(product.sale_price), danger: false },
            ].map(({ label, value, danger }) => (
              <div key={label} className="kpi-card" style={{ gap: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{label}</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: danger ? '#dc2626' : '#0f172a' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Pricing detail */}
          <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <InfoRow label="KDV Oranı" value={`%${product.vat_rate}`} />
            <InfoRow label="Kar Marjı" value={`%${margin}`} />
            <InfoRow label="Eklenme Tarihi" value={formatDate(product.created_at)} />
            <InfoRow label="Son Güncelleme" value={formatDate(product.updated_at)} />
            {product.description && (
              <div style={{ flex: 1 }}>
                <InfoRow label="Açıklama" value={product.description} />
              </div>
            )}
          </div>

          {/* Stock Movements */}
          <div className="card">
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                Stok Hareketleri
              </h3>
            </div>
            {loadingMovements ? (
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="skeleton" style={{ width: '1rem', height: '1rem', borderRadius: '50%' }} />
                    <div className="skeleton" style={{ flex: 1, height: '14px' }} />
                    <div className="skeleton" style={{ width: '80px', height: '14px' }} />
                  </div>
                ))}
              </div>
            ) : movements.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                Henüz stok hareketi bulunmuyor.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {['Tür', 'Miktar', 'Birim Fiyat', 'Toplam', 'Önceki Stok', 'Sonraki Stok', 'Tarih', 'Not'].map((h) => (
                      <th key={h} style={{ padding: '0.5rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '0.625rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          {MOVEMENT_ICON[m.movement_type]}
                          <span>{MOVEMENT_LABEL[m.movement_type]}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.625rem 1rem', fontWeight: 500 }}>{m.quantity}</td>
                      <td style={{ padding: '0.625rem 1rem', color: '#64748b' }}>{m.unit_price != null ? formatCurrency(m.unit_price) : '—'}</td>
                      <td style={{ padding: '0.625rem 1rem' }}>{m.total != null ? formatCurrency(m.total) : '—'}</td>
                      <td style={{ padding: '0.625rem 1rem', color: '#64748b' }}>{m.stock_before ?? '—'}</td>
                      <td style={{ padding: '0.625rem 1rem', fontWeight: 500 }}>{m.stock_after ?? '—'}</td>
                      <td style={{ padding: '0.625rem 1rem', color: '#64748b', whiteSpace: 'nowrap' }}>{formatDateTime(m.created_at)}</td>
                      <td style={{ padding: '0.625rem 1rem', color: '#64748b', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.note ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Ürünü Sil"
        width="max-w-sm"
      >
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <AlertTriangle style={{ width: '1.25rem', height: '1.25rem', color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500, color: '#0f172a' }}>
                "{product.name}" silinecek
              </p>
              <p style={{ margin: '0.375rem 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                Bu işlem geri alınamaz. Bu ürüne ait stok hareketleri de silinecektir.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setShowDeleteModal(false)}>
              İptal
            </Button>
            <Button variant="danger" size="sm" loading={deleteMutation.isPending} onClick={handleDelete}>
              Evet, Sil
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
