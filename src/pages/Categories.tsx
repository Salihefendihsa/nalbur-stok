import { Plus } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'

export default function Categories() {
  return (
    <div className="flex flex-col">
      <Header
        title="Kategoriler"
        subtitle="Ürün kategorilerini yönetin"
        actions={
          <Button size="sm">
            <Plus className="w-3.5 h-3.5" />
            Yeni Kategori
          </Button>
        }
      />
      <div className="p-6">
        <div className="card p-8 text-center text-gray-400">
          <p>Kategoriler Supabase bağlantısı kurulduktan sonra görüntülenecek.</p>
        </div>
      </div>
    </div>
  )
}
