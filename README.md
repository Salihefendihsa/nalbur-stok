# Nalbur Stok Yönetim Sistemi

Küçük ve orta ölçekli nalburiyeler için geliştirilmiş, modern ve hızlı bir stok yönetim uygulaması.

## Teknoloji Yığını

- **React 19** + **TypeScript** (strict mod)
- **Vite** — geliştirme sunucusu ve derleme
- **Tailwind CSS v4** — `@theme` ile özelleştirilmiş tasarım sistemi
- **React Router v7** — istemci taraflı yönlendirme
- **TanStack Query** — sunucu durumu yönetimi ve önbellek
- **TanStack Virtual** — 100K+ satır ürün tablosu için sanallaştırma
- **Supabase** — PostgreSQL veritabanı ve arka uç
- **Zustand** — istemci durumu yönetimi
- **Recharts** — raporlar için grafikler
- **Lucide React** — ikonlar

## Kurulum Adımları

### 1. Supabase Projesi Oluşturma

1. [supabase.com](https://supabase.com) adresine gidin ve yeni bir proje oluşturun
2. Proje oluşturulduktan sonra **SQL Editor**'a gidin
3. `supabase/schema.sql` dosyasının içeriğini kopyalayıp yapıştırın ve çalıştırın
4. Sol menüden **Project Settings → API** sekmesine gidin
5. **Project URL** ve **anon public** anahtarını kopyalayın

### 2. Ortam Değişkenlerini Ayarlama

```bash
cp .env.example .env
```

`.env` dosyasını açın ve şu değerleri doldurun:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Bağımlılıkları Yükleme ve Çalıştırma

```bash
npm install
npm run dev
```

Uygulama varsayılan olarak `http://localhost:5173` adresinde açılır.

### 4. Üretim Derlemesi

```bash
npm run build
npm run preview
```

## Proje Yapısı

```
src/
├── components/
│   ├── layout/       # Sidebar, Header, Layout
│   └── ui/           # Button, Input, Modal, Table, Card
├── lib/
│   ├── supabase.ts   # Supabase istemcisi
│   └── queries/      # TanStack Query hook'ları
├── pages/            # Tüm sayfa bileşenleri
├── types/
│   └── database.ts   # Veritabanı tip tanımları
└── utils/
    └── format.ts     # TL para birimi ve tarih biçimlendirme
supabase/
└── schema.sql        # Veritabanı şeması (Supabase SQL Editor'da çalıştırın)
```

## Navigasyon

| Rota | Sayfa |
|------|-------|
| `/` | Dashboard — KPI kartları ve özet |
| `/urunler` | Ürün listesi (arama, filtre) |
| `/urunler/yeni` | Yeni ürün ekleme formu |
| `/urunler/:id` | Ürün detayı |
| `/kategoriler` | Kategori yönetimi |
| `/tedarikciler` | Tedarikçi yönetimi |
| `/satis` | Satış kayıtları |
| `/alis` | Alış / fatura kayıtları |
| `/hareketler` | Stok hareketi geçmişi |
| `/raporlar` | Satış ve stok raporları |
| `/ayarlar` | Uygulama ayarları |

## Geliştirme Notları

- Veritabanı bağlantısı olmadan uygulama yine de açılır; sayfalar boş/iskelet durumunda gösterilir
- `.env` dosyası `.gitignore`'a eklenmiştir — asla commit etmeyin
- Supabase RLS (Row Level Security) politikaları henüz eklenmemiştir; tek kullanıcılı sistem için isteğe bağlıdır
