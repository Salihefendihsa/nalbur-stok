import { BarChart3 } from 'lucide-react'
import Header from '@/components/layout/Header'
import EmptyState from '@/components/ui/EmptyState'

export default function Reports() {
  return (
    <div className="flex flex-col">
      <Header title="Raporlar" subtitle="Satış, stok ve kâr raporları" />
      <div className="p-3 sm:p-6">
        <div className="card flex">
          <EmptyState
            icon={BarChart3}
            title="Rapor verisi henüz yok"
            description="Satış ve stok verileriniz arttıkça raporlar burada oluşacak."
          />
        </div>
      </div>
    </div>
  )
}
