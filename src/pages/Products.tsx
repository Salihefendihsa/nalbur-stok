import { useState } from 'react'
import { Plus, Search, Filter, Download } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import type { Product } from '@/types/database'
import { formatCurrency, formatStock } from '@/utils/format'

const COLUMNS = [
  {
    key: 'sku',
    header: 'SKU',
    render: (p: Product) => <span className="font-mono text-xs text-gray-500">{p.sku}</span>,
    width: '100px',
  },
  {
    key: 'name',
    header: 'Ürün Adı',
    render: (p: Product) => (
      <div>
        <p className="font-medium text-gray-900">{p.name}</p>
        {p.category && <p className="text-xs text-gray-400">{p.category.name}</p>}
      </div>
    ),
  },
  {
    key: 'stock',
    header: 'Stok',
    render: (p: Product) => (
      <span className={`font-medium ${p.current_stock <= p.min_stock ? 'text-red-600' : 'text-gray-900'}`}>
        {formatStock(p.current_stock, p.unit)}
      </span>
    ),
    width: '120px',
  },
  {
    key: 'sale_price',
    header: 'Satış Fiyatı',
    render: (p: Product) => formatCurrency(p.sale_price),
    width: '120px',
  },
  {
    key: 'purchase_price',
    header: 'Alış Fiyatı',
    render: (p: Product) => formatCurrency(p.purchase_price),
    width: '120px',
  },
  {
    key: 'status',
    header: 'Durum',
    render: (p: Product) => (
      <span className={p.is_active ? 'badge-green' : 'badge-gray'}>
        {p.is_active ? 'Aktif' : 'Pasif'}
      </span>
    ),
    width: '80px',
  },
]

export default function Products() {
  const [search, setSearch] = useState('')

  return (
    <div className="flex flex-col">
      <Header
        title="Ürünler"
        subtitle="Tüm ürünleri görüntüleyin ve yönetin"
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Download className="w-3.5 h-3.5" />
              Dışa Aktar
            </Button>
            <Button size="sm">
              <Plus className="w-3.5 h-3.5" />
              Yeni Ürün
            </Button>
          </>
        }
      />
      <div className="p-6 space-y-4">
        <div className="card">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="input pl-9"
                placeholder="Ürün adı, SKU veya barkod ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="secondary" size="sm">
              <Filter className="w-3.5 h-3.5" />
              Filtrele
            </Button>
          </div>
          <Table<Product>
            columns={COLUMNS}
            data={[]}
            keyExtractor={(p) => p.id}
            loading={false}
            emptyMessage="Henüz ürün eklenmemiş. Supabase bağlantısını kurarak ürün eklemeye başlayın."
          />
        </div>
      </div>
    </div>
  )
}
