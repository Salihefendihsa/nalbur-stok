import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col">
      <Header
        title="Ürün Detayı"
        subtitle={`ID: ${id}`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-3.5 h-3.5" />
              Geri
            </Button>
            <Button variant="secondary" size="sm">
              <Edit className="w-3.5 h-3.5" />
              Düzenle
            </Button>
            <Button variant="danger" size="sm">
              <Trash2 className="w-3.5 h-3.5" />
              Sil
            </Button>
          </>
        }
      />
      <div className="p-6">
        <div className="card p-8 text-center text-gray-400">
          <p>Ürün detayları Supabase bağlantısı kurulduktan sonra görüntülenecek.</p>
        </div>
      </div>
    </div>
  )
}
