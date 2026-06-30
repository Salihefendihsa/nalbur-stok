import Header from '@/components/layout/Header'

export default function StockMovements() {
  return (
    <div className="flex flex-col">
      <Header title="Stok Hareketleri" subtitle="Giriş, çıkış ve düzeltme hareketleri" />
      <div className="p-6">
        <div className="card p-8 text-center text-gray-400">
          <p>Stok hareketleri Supabase bağlantısı kurulduktan sonra görüntülenecek.</p>
        </div>
      </div>
    </div>
  )
}
