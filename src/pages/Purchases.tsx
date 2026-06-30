import { Plus } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'

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
        <div className="card p-8 text-center text-gray-400">
          <p>Alış kayıtları Supabase bağlantısı kurulduktan sonra görüntülenecek.</p>
        </div>
      </div>
    </div>
  )
}
