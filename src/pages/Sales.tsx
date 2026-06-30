import { Plus } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'

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
        <div className="card p-8 text-center text-gray-400">
          <p>Satış kayıtları Supabase bağlantısı kurulduktan sonra görüntülenecek.</p>
        </div>
      </div>
    </div>
  )
}
