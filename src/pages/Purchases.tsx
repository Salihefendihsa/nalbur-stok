import { Plus, ArrowDownToLine } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'

export default function Purchases() {
  return (
    <div className="flex flex-col">
      <Header
        title="Alış"
        subtitle="Alış işlemlerini ve faturalarını yönetin"
        actions={
          <Button size="sm">
            <Plus className="w-3.5 h-3.5" />
            Yeni Alış
          </Button>
        }
      />
      <div className="p-6">
        <div className="card flex">
          <EmptyState
            icon={ArrowDownToLine}
            title="Henüz alış kaydı yok"
            description="Tedarikçilerden yapılan alışları burada takip edin."
          />
        </div>
      </div>
    </div>
  )
}
