import Header from '@/components/layout/Header'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function Settings() {
  return (
    <div className="flex flex-col">
      <Header title="Ayarlar" subtitle="Uygulama ve mağaza ayarları" />
      <div className="p-6 space-y-6">
        <div className="card p-6 space-y-4 max-w-lg">
          <h3 className="text-sm font-semibold text-gray-900">Mağaza Bilgileri</h3>
          <Input label="Mağaza Adı" placeholder="Nalburiye Adı" />
          <Input label="Telefon" placeholder="+90 5XX XXX XX XX" />
          <Input label="Adres" placeholder="Mağaza adresi" />
          <Input label="Vergi No" placeholder="1234567890" />
          <Button size="sm">Kaydet</Button>
        </div>

        <div className="card p-6 space-y-4 max-w-lg">
          <h3 className="text-sm font-semibold text-gray-900">Supabase Bağlantısı</h3>
          <p className="text-xs text-gray-500">
            Bu bilgiler <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">.env</code> dosyasından okunur.
            Değiştirmek için dosyayı düzenleyin ve uygulamayı yeniden başlatın.
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">VITE_SUPABASE_URL</span>
              <span className="badge-gray">{import.meta.env.VITE_SUPABASE_URL ? 'Ayarlı' : 'Eksik'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">VITE_SUPABASE_ANON_KEY</span>
              <span className={import.meta.env.VITE_SUPABASE_ANON_KEY ? 'badge-green' : 'badge-red'}>
                {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Ayarlı' : 'Eksik'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
