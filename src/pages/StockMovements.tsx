import { ArrowRightLeft } from 'lucide-react'
import Header from '@/components/layout/Header'
import EmptyState from '@/components/ui/EmptyState'

export default function StockMovements() {
  return (
    <div className="flex flex-col">
      <Header title="Stok Hareketleri" subtitle="Giriş, çıkış ve düzeltme hareketleri" />
      <div className="p-6">
        <div className="card flex">
          <EmptyState
            icon={ArrowRightLeft}
            title="Henüz stok hareketi yok"
            description="Ürün giriş, çıkış ve düzeltme hareketleri burada listelenecek."
          />
        </div>
      </div>
    </div>
  )
}
