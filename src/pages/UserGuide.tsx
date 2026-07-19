import { useMemo, useState } from 'react'
import {
  Search, ChevronDown, BookOpen, LayoutDashboard, Package, Tag, Truck,
  ShoppingCart, ArrowDownToLine, ArrowRightLeft, BarChart3, Settings, HelpCircle,
} from 'lucide-react'
import Header from '@/components/layout/Header'

interface GuideSection {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  keywords: string
  body: React.ReactNode
}

const SECTIONS: GuideSection[] = [
  {
    id: 'genel-bakis',
    title: 'Genel Bakış',
    icon: BookOpen,
    keywords: 'genel bakış nedir sidebar menü navigasyon',
    body: (
      <>
        <p>
          Nalbur Stok, nalburiye ve hırdavat işletmeleri için tasarlanmış bir stok ve satış
          yönetim sistemidir. Ürünlerinizi, kategorilerinizi, tedarikçilerinizi, satış ve alış
          işlemlerinizi tek bir yerden takip edebilirsiniz.
        </p>
        <p>
          Sol taraftaki koyu renkli menü (sidebar) üzerinden tüm bölümlere ulaşabilirsiniz.
          Aktif olduğunuz sayfa turuncu renkte vurgulanır. "Ürünler" menü öğesinin yanındaki
          sayı, sistemde kayıtlı toplam ürün sayısını gösterir.
        </p>
      </>
    ),
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: LayoutDashboard,
    keywords: 'dashboard kpi kritik stok özet ana sayfa toplam ürün bugünkü satış stok değeri',
    body: (
      <>
        <p>Dashboard, mağazanızın anlık durumunu özetleyen ana sayfadır. Dört KPI (özet) kartı gösterir:</p>
        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <li><strong>Toplam Ürün:</strong> Sistemde kayıtlı, silinmemiş ürün sayısı.</li>
          <li><strong>Kritik Stok:</strong> Mevcut stoğu minimum stok seviyesinin altına düşmüş ürün sayısı.</li>
          <li><strong>Bugünkü Satış:</strong> Bugün yapılan satışların toplam tutarı.</li>
          <li><strong>Stok Değeri:</strong> Tüm ürünlerin mevcut stok miktarı × alış fiyatı toplamı.</li>
        </ul>
        <p>
          Kritik stoktaki ürün varsa sayfanın üstünde kırmızı bir uyarı bandı görünür. Bu, stok
          takviyesi yapmanız gerektiğinin bir işaretidir. Sağ altta kritik stoktaki ürünlerin
          listesi, solda ise son stok hareketleri gösterilir.
        </p>
      </>
    ),
  },
  {
    id: 'urunler',
    title: 'Ürünler',
    icon: Package,
    keywords: 'ürünler ürün ekle düzenle sil geri yükle sku barkod min stok arama filtreleme kritik normal yüksek',
    body: (
      <>
        <p>
          Ürünler sayfasında tüm ürünlerinizi listeleyebilir, arayabilir ve yönetebilirsiniz.
          Üst kısımdaki arama kutusu; ürün adı, SKU veya barkod üzerinden anlık filtreleme yapar.
        </p>
        <p><strong>Önemli alanlar:</strong></p>
        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <li><strong>SKU:</strong> Ürüne özel benzersiz stok kodu (örn. NAL-0001).</li>
          <li><strong>Barkod:</strong> Ürünün fiziksel barkod numarası (opsiyonel).</li>
          <li><strong>Min Stok:</strong> Bu seviyenin altına düşüldüğünde ürün "Kritik" sayılır.</li>
          <li><strong>Birim:</strong> Adet, kg, paket, kutu gibi satış/stok birimi.</li>
        </ul>
        <p><strong>Stok durum rozetleri:</strong></p>
        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <li><span className="badge-red">Kritik</span> — mevcut stok, minimum stok seviyesinin altında veya eşit.</li>
          <li><span className="badge-yellow">Normal</span> — mevcut stok, minimum stoğun 1-2 katı arasında.</li>
          <li><span className="badge-green">Yüksek</span> — mevcut stok, minimum stoğun 2 katından fazla.</li>
        </ul>
        <p>
          Yeni ürün eklemek için "Yeni Ürün" butonunu kullanın. Bir ürüne tıklayarak detay
          sayfasına gidebilir, oradan "Düzenle" ile bilgilerini güncelleyebilir veya "Sil" ile
          kaldırabilirsiniz. Silme işlemi geri alınabilir bir "yumuşak silme"dir: silme sonrası
          çıkan bildirimdeki "Geri Al" butonuna 5 saniye içinde basarak işlemi geri
          alabilirsiniz. Bu süreyi kaçırırsanız, ürün listesi başlığındaki arşiv (kutu)
          simgesine tıklayarak "Silinenler" ekranından istediğiniz zaman geri yükleyebilirsiniz.
        </p>
      </>
    ),
  },
  {
    id: 'kategoriler',
    title: 'Kategoriler',
    icon: Tag,
    keywords: 'kategoriler kategori üst kategori alt kategori ağaç yapısı',
    body: (
      <>
        <p>
          Kategoriler, ürünlerinizi gruplamanızı sağlar. İki seviyeli bir yapı desteklenir:
          ana (üst) kategoriler ve onların altındaki alt kategoriler. Örneğin "Vidalar" ana
          kategorisinin altında "Ahşap Vidası" ve "Metal Vidası" alt kategorileri olabilir.
        </p>
        <p>
          Yeni kategori oluştururken bir üst kategori seçerseniz, oluşturduğunuz kategori onun
          altına alt kategori olarak eklenir. "Sıralama" alanı, kategorilerin listede hangi
          sırayla görüneceğini belirler (küçük sayı önce gelir).
        </p>
        <p>
          Kategoriler de ürünler gibi geri alınabilir şekilde silinir — silme bildirimindeki
          "Geri Al" butonunu veya sayfa başlığındaki "Silinenler" arşivini kullanabilirsiniz.
        </p>
      </>
    ),
  },
  {
    id: 'tedarikciler',
    title: 'Tedarikçiler',
    icon: Truck,
    keywords: 'tedarikçiler tedarikçi ekle telefon adres vergi no',
    body: (
      <p>
        Tedarikçiler sayfasında mal aldığınız firmaların adı, telefonu, e-postası, adresi ve
        vergi numarası gibi bilgilerini saklayabilirsiniz. Ürün eklerken ve alış kaydederken
        tedarikçi seçimi yapılır, böylece hangi üründen hangi tedarikçiden alındığını takip
        edebilirsiniz. Diğer kayıtlar gibi tedarikçiler de geri alınabilir şekilde silinir.
      </p>
    ),
  },
  {
    id: 'satis',
    title: 'Satış',
    icon: ShoppingCart,
    keywords: 'satış müşteri ödeme yöntemi nakit kredi kartı havale satış kaydet',
    body: (
      <>
        <p>
          Satış sayfasında müşterilerinize yaptığınız satışları kaydedersiniz. "Yeni Satış"
          ile açılan formda müşteri adı (opsiyonel — boş bırakılırsa "Perakende Müşteri" olarak
          kaydedilir), ödeme yöntemi ve satılan ürün satırlarını girersiniz.
        </p>
        <p>
          <strong>Ödeme yöntemi</strong>, satışın nasıl tahsil edildiğini (nakit, kredi kartı,
          havale) kaydeder ve raporlamada kullanılır. Her ürün satırı için ürün, miktar ve
          birim fiyat girilir; birim fiyat ürünün güncel satış fiyatından otomatik gelir ama
          gerekirse değiştirilebilir. Ara toplam üzerine otomatik olarak %20 KDV eklenerek
          genel toplam hesaplanır.
        </p>
      </>
    ),
  },
  {
    id: 'alis',
    title: 'Alış',
    icon: ArrowDownToLine,
    keywords: 'alış tedarikçiden alım fatura no satın alma',
    body: (
      <p>
        Alış sayfası, tedarikçilerden yaptığınız ürün alımlarını kaydetmenizi sağlar. Bir
        tedarikçi ve fatura numarası seçip, alınan ürün satırlarını (ürün, miktar, birim
        fiyat) girersiniz. Bu kayıtlar; maliyetlerinizi ve tedarikçi bazında alım geçmişinizi
        takip etmenize yardımcı olur.
      </p>
    ),
  },
  {
    id: 'hareketler',
    title: 'Hareketler',
    icon: ArrowRightLeft,
    keywords: 'hareketler stok hareketi giriş çıkış düzeltme sayım',
    body: (
      <>
        <p>
          Stok Hareketleri, bir ürünün stok miktarındaki her değişikliği kayıt altına alır.
          Üç tür hareket vardır:
        </p>
        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <li><strong>Giriş:</strong> Stoğa ürün eklenmesi (örn. tedarikçiden alım).</li>
          <li><strong>Çıkış:</strong> Stoktan ürün düşülmesi (örn. müşteriye satış).</li>
          <li><strong>Düzeltme:</strong> Sayım farkı gibi durumlarda stoğun manuel olarak belirli bir değere ayarlanması.</li>
        </ul>
        <p>
          Her hareket; hareketten önceki ve sonraki stok miktarını gösterir, böylece geçmişte
          ne zaman ne kadar stok değişimi olduğunu izleyebilirsiniz. Satış ve alış kayıtları da
          arka planda ilgili ürünlerin stoğunu günceller.
        </p>
      </>
    ),
  },
  {
    id: 'raporlar',
    title: 'Raporlar',
    icon: BarChart3,
    keywords: 'raporlar rapor satış raporu stok raporu kâr raporu',
    body: (
      <p>
        Raporlar sayfası; satış, stok ve kârlılık verilerinizi özetleyen raporları barındırır.
        Bu bölüm, işletmenizdeki verilerin arttıkça daha anlamlı hâle gelir ve zamanla yeni
        rapor türleriyle genişletilecektir.
      </p>
    ),
  },
  {
    id: 'ayarlar',
    title: 'Ayarlar',
    icon: Settings,
    keywords: 'ayarlar mağaza bilgileri telefon adres vergi no',
    body: (
      <p>
        Ayarlar sayfasında mağaza adınız, telefonunuz, adresiniz ve vergi numaranız gibi genel
        işletme bilgilerinizi girebilirsiniz. Bu bilgiler ileride fatura ve raporlarda
        kullanılmak üzere saklanır.
      </p>
    ),
  },
]

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Yanlışlıkla sildiğim bir kaydı nasıl geri getiririm?',
    a: 'Bir kayıt sildiğinizde ekranın sağ üst köşesinde 5 saniye boyunca "Geri Al" butonlu bir bildirim görünür. Bu süre içinde tıklarsanız kayıt anında geri gelir. Süreyi kaçırırsanız, ilgili sayfanın başlığındaki arşiv (kutu) simgesine tıklayarak "Silinenler" ekranını açın ve "Geri Yükle" butonunu kullanın.',
  },
  {
    q: 'Bir ürün neden "Kritik" olarak görünüyor?',
    a: 'Ürünün mevcut stok miktarı, o ürün için tanımladığınız "Minimum Stok" seviyesine eşit veya altına düştüğünde ürün otomatik olarak Kritik duruma geçer ve Dashboard\'da uyarı olarak listelenir.',
  },
  {
    q: 'Stok miktarını nasıl güncellerim?',
    a: 'Stok miktarını doğrudan değiştirmek yerine bir "Stok Hareketi" (Giriş, Çıkış veya Düzeltme) oluşturmalısınız. Bu, stok geçmişinizin doğru ve izlenebilir kalmasını sağlar. Satış ve alış kayıtları da stoğu otomatik olarak günceller.',
  },
  {
    q: 'Satış ve alış tutarlarına KDV nasıl ekleniyor?',
    a: 'Satış kayıtlarında, girdiğiniz ürün satırlarının ara toplamına otomatik olarak %20 KDV eklenir ve genel toplam hesaplanır. Alış kayıtlarında toplam, girilen birim fiyatlar üzerinden doğrudan hesaplanır.',
  },
  {
    q: 'Bir kategoriyi silersem, altındaki ürünler ne olur?',
    a: 'Kategori silindiğinde ürünler silinmez; yalnızca kategori kaydı kaldırılır. Kategoriyi "Silinenler" ekranından geri yüklerseniz, ürünlerle olan ilişkisi de geri döner.',
  },
  {
    q: 'Arama kutusu hangi alanlarda arama yapıyor?',
    a: 'Ürünler sayfasındaki arama; ürün adı, SKU kodu ve barkod alanlarında eş zamanlı arama yapar. Bu kılavuzun üstündeki arama kutusu ise bölüm başlıkları ve içerikleri üzerinde filtreleme yapar.',
  },
]

function AccordionItem({ section, defaultOpen }: { section: GuideSection; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const Icon = section.icon
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '1rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'var(--color-primary-50)', color: 'var(--color-primary-600)' }}
        >
          <Icon className="w-4.5 h-4.5" />
        </span>
        <span style={{ flex: 1, fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>{section.title}</span>
        <ChevronDown
          className="w-4 h-4"
          style={{ color: '#94a3b8', transition: 'transform 200ms', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      {open && (
        <div style={{ padding: '0 1.25rem 1.25rem 1.25rem', marginLeft: '2.9rem', fontSize: '0.875rem', color: '#334155', lineHeight: 1.6 }}>
          {section.body}
        </div>
      )}
    </div>
  )
}

export default function UserGuide() {
  const [query, setQuery] = useState('')

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SECTIONS
    return SECTIONS.filter(
      (s) => s.title.toLowerCase().includes(q) || s.keywords.toLowerCase().includes(q)
    )
  }, [query])

  const filteredFaq = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return FAQ
    return FAQ.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
  }, [query])

  return (
    <div className="flex flex-col">
      <Header title="Kullanım Kılavuzu" subtitle="Nalbur Stok'u nasıl kullanacağınızı öğrenin" />
      <div className="p-6 space-y-4" style={{ maxWidth: '760px' }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', width: '1.125rem', height: '1.125rem', color: '#94a3b8', pointerEvents: 'none' }} />
          <input
            className="input"
            style={{ paddingLeft: '2.5rem', fontSize: '0.9375rem', padding: '0.75rem 1rem 0.75rem 2.5rem' }}
            placeholder="Kılavuzda ara… (örn. kritik stok, geri al, KDV)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {filteredSections.length === 0 && filteredFaq.length === 0 ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
            "{query}" ile eşleşen içerik bulunamadı.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredSections.map((s, i) => (
              <AccordionItem key={s.id} section={s} defaultOpen={!!query || i === 0} />
            ))}
          </div>
        )}

        {filteredFaq.length > 0 && (
          <div className="card" style={{ padding: '1.25rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'var(--color-primary-50)', color: 'var(--color-primary-600)' }}
              >
                <HelpCircle className="w-4.5 h-4.5" />
              </span>
              <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>Sık Sorulan Sorular</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredFaq.map((f, i) => (
                <div key={i}>
                  <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{f.q}</p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.6 }}>{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
