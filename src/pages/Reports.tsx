import Header from '@/components/layout/Header'

export default function Reports() {
  return (
    <div className="flex flex-col">
      <Header title="Raporlar" subtitle="Satış, stok ve kâr raporları" />
      <div className="p-6">
        <div className="card p-8 text-center text-gray-400">
          <p>Raporlar Supabase bağlantısı kurulduktan sonra görüntülenecek.</p>
        </div>
      </div>
    </div>
  )
}
