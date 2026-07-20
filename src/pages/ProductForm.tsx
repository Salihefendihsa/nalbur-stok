import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import { ArrowLeft, Save, ScanLine } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import BarcodeScanner from '@/components/ui/BarcodeScanner'
import { useProduct, useCreateProduct, useUpdateProduct, type ProductInput } from '@/lib/queries/products'
import { useCategories } from '@/lib/queries/categories'
import { useSuppliers } from '@/lib/queries/suppliers'
import { findProductByBarcode, lookupOpenFoodFacts } from '@/lib/barcode'
import { useToast } from '@/store/toast'

const EMPTY: ProductInput = {
  sku: '',
  barcode: null,
  name: '',
  description: null,
  category_id: null,
  supplier_id: null,
  unit: 'adet',
  current_stock: 0,
  min_stock: 0,
  purchase_price: 0,
  sale_price: 0,
  vat_rate: 20,
  is_active: true,
}

export default function ProductForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const toast = useToast()

  const { data: existing, isLoading: loadingProduct } = useProduct(id ?? '')
  const { data: categories = [] } = useCategories()
  const { data: suppliers = [] } = useSuppliers()
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()

  const [form, setForm] = useState<ProductInput>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof ProductInput, string>>>({})
  const [scannerOpen, setScannerOpen] = useState(false)
  const [offLookupPending, setOffLookupPending] = useState(false)

  useEffect(() => {
    if (existing) {
      setForm({
        sku: existing.sku,
        barcode: existing.barcode,
        name: existing.name,
        description: existing.description,
        category_id: existing.category_id,
        supplier_id: existing.supplier_id,
        unit: existing.unit,
        current_stock: existing.current_stock,
        min_stock: existing.min_stock,
        purchase_price: existing.purchase_price,
        sale_price: existing.sale_price,
        vat_rate: existing.vat_rate,
        is_active: existing.is_active,
      })
    }
  }, [existing])

  // Products sayfasından "Barkod Tara" ile buraya yönlendirildiyse
  // (barkod bizim veritabanımızda bulunamadı) barkodu doldur ve
  // Open Food Facts'te otomatik ara.
  const incomingBarcodeHandled = useRef(false)
  useEffect(() => {
    if (isEdit || incomingBarcodeHandled.current) return
    const incoming = (location.state as { barcode?: string } | null)?.barcode
    if (!incoming) return
    incomingBarcodeHandled.current = true
    set('barcode', incoming)
    void autoFillFromBarcode(incoming)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, location.state])

  async function autoFillFromBarcode(code: string) {
    setOffLookupPending(true)
    try {
      const off = await lookupOpenFoodFacts(code)
      if (off?.name) {
        set('name', off.brand && !off.name.toLowerCase().includes(off.brand.toLowerCase()) ? `${off.name} (${off.brand})` : off.name)
        toast.success('Ürün bilgileri barkoddan dolduruldu.')
      } else {
        toast.info('Barkod bulunamadı, ürün bilgilerini girin.')
      }
    } finally {
      setOffLookupPending(false)
    }
  }

  async function handleScan(code: string) {
    set('barcode', code)

    if (isEdit) return

    try {
      const existingProduct = await findProductByBarcode(code)
      if (existingProduct) {
        toast.info('Bu barkod zaten kayıtlı, ürüne yönlendiriliyorsunuz.')
        navigate(`/urunler/${existingProduct.id}`)
        return
      }
    } catch (err) {
      toast.error((err as Error).message)
      return
    }

    await autoFillFromBarcode(code)
  }

  function set<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const e: Partial<Record<keyof ProductInput, string>> = {}
    if (!form.sku.trim()) e.sku = 'SKU zorunludur'
    if (!form.name.trim()) e.name = 'Ürün adı zorunludur'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, ...form })
        toast.success('Ürün güncellendi.')
        navigate(`/urunler/${id}`)
      } else {
        const product = await createMutation.mutateAsync(form)
        toast.success('Ürün oluşturuldu.')
        navigate(`/urunler/${product.id}`)
      }
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  if (isEdit && loadingProduct) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <Header title="Ürün Düzenle" />
        <div className="p-3 sm:p-6" style={{ maxWidth: '680px' }}>
          <div className="card p-4 sm:p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '38px', borderRadius: '0.5rem' }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const rootCategories = categories.filter((c) => c.parent_id === null)
  const childCategories = categories.filter((c) => c.parent_id !== null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Header
        title={isEdit ? 'Ürün Düzenle' : 'Yeni Ürün'}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-3.5 h-3.5" />
              İptal
            </Button>
            <Button size="sm" loading={isPending} onClick={handleSubmit}>
              <Save className="w-3.5 h-3.5" />
              {isEdit ? 'Güncelle' : 'Kaydet'}
            </Button>
          </>
        }
      />

      <div className="p-3 sm:p-6" style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Temel Bilgiler */}
          <div className="card p-4 sm:p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>Temel Bilgiler</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '1rem' }}>
              <Input
                label="SKU *"
                placeholder="Örn: NLB-001"
                value={form.sku}
                onChange={(e) => set('sku', e.target.value)}
                error={errors.sku}
              />
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  Barkod
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    className="input"
                    placeholder="EAN13 veya özel"
                    value={form.barcode ?? ''}
                    onChange={(e) => set('barcode', e.target.value || null)}
                  />
                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    title="Barkod Tara"
                    className="icon-btn shrink-0"
                    disabled={offLookupPending}
                  >
                    <ScanLine style={{ width: '0.875rem', height: '0.875rem' }} />
                  </button>
                </div>
              </div>
            </div>
            <Input
              label="Ürün Adı *"
              placeholder="Ürün adını girin"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              error={errors.name}
            />
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                Açıklama
              </label>
              <textarea
                className="input"
                style={{ resize: 'none' }}
                rows={3}
                placeholder="Ürün açıklaması…"
                value={form.description ?? ''}
                onChange={(e) => set('description', e.target.value || null)}
              />
            </div>
          </div>

          {/* Kategori & Tedarikçi */}
          <div className="card p-4 sm:p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>Sınıflandırma</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  Kategori
                </label>
                {categories.length === 0 ? (
                  <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                    Henüz kategori yok.{' '}
                    <Link to="/kategoriler" style={{ color: 'var(--color-primary-500)', textDecoration: 'none' }}>
                      Kategori ekle →
                    </Link>
                  </p>
                ) : (
                  <select
                    className="input"
                    value={form.category_id ?? ''}
                    onChange={(e) => set('category_id', e.target.value || null)}
                  >
                    <option value="">— Seçiniz —</option>
                    {rootCategories.map((c) => (
                      <optgroup key={c.id} label={c.name}>
                        <option value={c.id}>{c.name}</option>
                        {childCategories.filter((ch) => ch.parent_id === c.id).map((ch) => (
                          <option key={ch.id} value={ch.id}>{'  '}↳ {ch.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  Tedarikçi
                </label>
                <select
                  className="input"
                  value={form.supplier_id ?? ''}
                  onChange={(e) => set('supplier_id', e.target.value || null)}
                >
                  <option value="">— Seçiniz —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Stok & Fiyat */}
          <div className="card p-4 sm:p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>Stok & Fiyat</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: '1rem' }}>
              <Input
                label="Mevcut Stok"
                type="number"
                min="0"
                step="0.01"
                value={form.current_stock}
                onChange={(e) => set('current_stock', parseFloat(e.target.value) || 0)}
              />
              <Input
                label="Minimum Stok"
                type="number"
                min="0"
                step="0.01"
                value={form.min_stock}
                onChange={(e) => set('min_stock', parseFloat(e.target.value) || 0)}
              />
              <Input
                label="Birim"
                placeholder="adet"
                value={form.unit}
                onChange={(e) => set('unit', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: '1rem' }}>
              <Input
                label="Alış Fiyatı (₺)"
                type="number"
                min="0"
                step="0.01"
                value={form.purchase_price}
                onChange={(e) => set('purchase_price', parseFloat(e.target.value) || 0)}
              />
              <Input
                label="Satış Fiyatı (₺)"
                type="number"
                min="0"
                step="0.01"
                value={form.sale_price}
                onChange={(e) => set('sale_price', parseFloat(e.target.value) || 0)}
              />
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  KDV Oranı
                </label>
                <select
                  className="input"
                  value={form.vat_rate}
                  onChange={(e) => set('vat_rate', parseInt(e.target.value))}
                >
                  <option value={0}>%0</option>
                  <option value={10}>%10</option>
                  <option value={20}>%20</option>
                </select>
              </div>
            </div>
          </div>

          {/* Durum */}
          <div className="card" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, color: '#0f172a' }}>Ürün Aktif</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Pasif ürünler satış ve stok listelerinde gösterilmez</p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => set('is_active', e.target.checked)}
                style={{ width: '1rem', height: '1rem', accentColor: 'var(--color-primary-500)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.875rem', color: '#334155' }}>{form.is_active ? 'Aktif' : 'Pasif'}</span>
            </label>
          </div>

        </div>
      </div>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
      />
    </div>
  )
}
