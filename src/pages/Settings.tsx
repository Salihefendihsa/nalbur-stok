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
      </div>
    </div>
  )
}
