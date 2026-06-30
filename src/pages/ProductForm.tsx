import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function ProductForm() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col">
      <Header
        title="Yeni Ürün"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-3.5 h-3.5" />
              İptal
            </Button>
            <Button size="sm">
              <Save className="w-3.5 h-3.5" />
              Kaydet
            </Button>
          </>
        }
      />
      <div className="p-6">
        <div className="max-w-2xl space-y-6">
          <div className="card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Temel Bilgiler</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="SKU *" placeholder="Örn: NLB-001" />
              <Input label="Barkod" placeholder="EAN13 veya özel" />
            </div>
            <Input label="Ürün Adı *" placeholder="Ürün adını girin" />
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Açıklama</label>
              <textarea className="input resize-none" rows={3} placeholder="Ürün açıklaması..." />
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Stok & Fiyat</h3>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Mevcut Stok" type="number" placeholder="0" />
              <Input label="Minimum Stok" type="number" placeholder="0" />
              <Input label="Birim" placeholder="adet" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Alış Fiyatı (₺)" type="number" placeholder="0.00" />
              <Input label="Satış Fiyatı (₺)" type="number" placeholder="0.00" />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-700">KDV Oranı</label>
                <select className="input" defaultValue="20">
                  <option value="0">%0</option>
                  <option value="10">%10</option>
                  <option value="20">%20</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
