import { Plus, ShoppingCart } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'

export default function Sales() {
  return (
    <div className="flex flex-col">
      <Header
        title="Satış"
        subtitle="Satış işlemlerini yönetin"
        actions={
          <Button size="sm">
            <Plus className="w-3.5 h-3.5" />
            Yeni Satış
          </Button>
        }
      />
      <div className="p-6">
        <div className="card flex">
          <EmptyState
            icon={ShoppingCart}
            title="Henüz satış kaydı yok"
            description="Yeni satış oluşturarak işlem geçmişinizi burada görüntüleyin."
          />
        </div>
      </div>
    </div>
  )
}
