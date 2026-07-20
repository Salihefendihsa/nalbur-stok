// =============================================================================
// Nalbur Stok Yönetim Sistemi — Veritabanı Tip Tanımlamaları
// Dosya: src/types/database.ts
//
// Bu dosya supabase/migrations/0003_full_schema_v2.sql şemasını birebir
// yansıtır. Supabase client'ı ile birlikte kullanılmak üzere tasarlanmıştır.
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// Temel yardımcı tipler
// ─────────────────────────────────────────────────────────────────────────────

/** ISO 8601 tarih-saat dizisi — veritabanından TIMESTAMPTZ olarak gelir */
type ISODateTime = string

/** UUID v4 dizisi */
type UUID = string

// ─────────────────────────────────────────────────────────────────────────────
// Enum değerleri
// ─────────────────────────────────────────────────────────────────────────────

/** Stok hareketi tipi */
export type MovementType = 'in' | 'out' | 'adjustment'

/** Alış faturası durumu */
export type PurchaseStatus = 'draft' | 'completed' | 'cancelled'

/** Ödeme yöntemi */
export type PaymentMethod = 'nakit' | 'kredi kartı' | 'havale'

/** Geçerli KDV oranları (%) */
export type VatRate = 0 | 1 | 8 | 10 | 18 | 20

// ─────────────────────────────────────────────────────────────────────────────
// Tablo: categories
// ─────────────────────────────────────────────────────────────────────────────
export interface Category {
  id:         UUID
  name:       string
  parent_id:  UUID | null        // NULL → kök kategori
  sort_order: number
  created_at: ISODateTime
  deleted_at: ISODateTime | null

  // İlişkili veri (JOIN ile gelir — opsiyonel)
  parent?:    Category | null
  children?:  Category[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Tablo: suppliers
// ─────────────────────────────────────────────────────────────────────────────
export interface Supplier {
  id:           UUID
  name:         string
  contact_name: string | null    // İrtibat kişisi
  phone:        string | null
  email:        string | null
  address:      string | null
  tax_no:       string | null    // Vergi Kimlik No
  notes:        string | null
  created_at:   ISODateTime
  deleted_at:   ISODateTime | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Tablo: products
// ─────────────────────────────────────────────────────────────────────────────
export interface Product {
  id:             UUID
  sku:            string          // UNIQUE — stok kodu
  barcode:        string | null   // UNIQUE — EAN-13 / QR
  name:           string
  description:    string | null
  category_id:    UUID | null
  supplier_id:    UUID | null
  unit:           string          // adet / kg / lt / m / koli…
  current_stock:  number
  min_stock:      number          // kritik stok seviyesi
  purchase_price: number          // alış fiyatı (KDV hariç)
  sale_price:     number          // satış fiyatı (KDV hariç)
  vat_rate:       VatRate         // KDV oranı (%)
  image_url:      string | null
  is_active:      boolean
  created_at:     ISODateTime
  updated_at:     ISODateTime     // trg_products_updated_at trigger'ı yönetir
  deleted_at:     ISODateTime | null

  // İlişkili veri (JOIN ile gelir — opsiyonel)
  category?:      Category | null
  supplier?:      Supplier | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Tablo: stock_movements
// ─────────────────────────────────────────────────────────────────────────────
export interface StockMovement {
  id:             UUID
  product_id:     UUID
  movement_type:  MovementType
  quantity:       number
  unit_price:     number | null
  total:          number | null
  stock_before:   number | null   // işlem öncesi stok
  stock_after:    number | null   // işlem sonrası kalan stok
  reference_type: 'purchase' | 'sale' | 'manual' | null
  reference_id:   UUID | null     // purchases.id veya sales.id
  note:           string | null
  created_at:     ISODateTime
  deleted_at:     ISODateTime | null

  // İlişkili veri (JOIN ile gelir — opsiyonel)
  product?:       Pick<Product, 'id' | 'name' | 'unit' | 'current_stock'> | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Tablo: purchases (alış faturaları — başlık)
// ─────────────────────────────────────────────────────────────────────────────
export interface Purchase {
  id:          UUID
  supplier_id: UUID | null
  invoice_no:  string | null
  status:      PurchaseStatus
  total:       number
  notes:       string | null
  created_at:  ISODateTime
  deleted_at:  ISODateTime | null

  // İlişkili veri (JOIN ile gelir — opsiyonel)
  supplier?:   Supplier | null
  items?:      PurchaseItem[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Tablo: purchase_items (alış faturası kalemleri)
// ─────────────────────────────────────────────────────────────────────────────
export interface PurchaseItem {
  id:          UUID
  purchase_id: UUID
  product_id:  UUID
  quantity:    number
  unit_price:  number
  /** GENERATED ALWAYS AS (quantity * unit_price) STORED */
  total:       number

  // İlişkili veri (JOIN ile gelir — opsiyonel)
  product?:    Pick<Product, 'id' | 'name' | 'sku' | 'unit' | 'current_stock' | 'purchase_price'> | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Tablo: sales (satışlar — başlık)
// ─────────────────────────────────────────────────────────────────────────────
export interface Sale {
  id:             UUID
  customer_name:  string | null   // NULL = perakende müşteri
  payment_method: PaymentMethod
  subtotal:       number          // KDV hariç ara toplam
  vat_total:      number          // toplam KDV tutarı
  total:          number          // subtotal + vat_total
  notes:          string | null
  created_at:     ISODateTime
  deleted_at:     ISODateTime | null

  // İlişkili veri (JOIN ile gelir — opsiyonel)
  items?:         SaleItem[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Tablo: sale_items (satış kalemleri)
// ─────────────────────────────────────────────────────────────────────────────
export interface SaleItem {
  id:         UUID
  sale_id:    UUID
  product_id: UUID
  quantity:   number
  unit_price: number
  /** GENERATED ALWAYS AS (quantity * unit_price) STORED */
  total:      number

  // İlişkili veri (JOIN ile gelir — opsiyonel)
  product?:   Pick<Product, 'id' | 'name' | 'sku' | 'unit' | 'current_stock' | 'sale_price' | 'vat_rate'> | null
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW: kritik_stok
// Supabase'den: const { data } = await supabase.from('kritik_stok').select('*')
// ─────────────────────────────────────────────────────────────────────────────
export interface KritikStokRow {
  id:             UUID
  sku:            string
  name:           string
  unit:           string
  current_stock:  number
  min_stock:      number
  purchase_price: number
  deficit:        number          // eksik miktar (min_stock - current_stock)
  reorder_cost:   number          // deficit × purchase_price
  stock_pct:      number          // doluluk yüzdesi (0–100)
  category_name:  string | null
  supplier_name:  string | null
  supplier_phone: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard istatistikleri (hesaplanan — DB view değil)
// ─────────────────────────────────────────────────────────────────────────────
export interface DashboardStats {
  totalProducts:   number
  activeProducts:  number
  lowStockCount:   number         // current_stock < min_stock olanlar
  todaySalesTotal: number         // bugünkü satış tutarı (TL)
  todaySalesCount: number         // bugünkü satış adedi
  stockValue:      number         // toplam stok değeri (current_stock × purchase_price)
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase veritabanı şeması tip haritası
// Supabase client'ı oluştururken: createClient<Database>(url, key)
// ─────────────────────────────────────────────────────────────────────────────
export interface Database {
  public: {
    Tables: {
      categories: {
        Row:    Category
        Insert: Omit<Category, 'id' | 'created_at' | 'deleted_at' | 'parent' | 'children'>
        Update: Partial<Omit<Category, 'id' | 'parent' | 'children'>>
      }
      suppliers: {
        Row:    Supplier
        Insert: Omit<Supplier, 'id' | 'created_at' | 'deleted_at'>
        Update: Partial<Omit<Supplier, 'id'>>
      }
      products: {
        Row:    Product
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'category' | 'supplier'>
        Update: Partial<Omit<Product, 'id' | 'updated_at' | 'category' | 'supplier'>>
      }
      stock_movements: {
        Row:    StockMovement
        Insert: Omit<StockMovement, 'id' | 'created_at' | 'deleted_at' | 'product'>
        Update: Partial<Pick<StockMovement, 'note' | 'deleted_at'>>
      }
      purchases: {
        Row:    Purchase
        Insert: Omit<Purchase, 'id' | 'created_at' | 'deleted_at' | 'supplier' | 'items'>
        Update: Partial<Omit<Purchase, 'id' | 'supplier' | 'items'>>
      }
      purchase_items: {
        Row:    PurchaseItem
        Insert: Omit<PurchaseItem, 'id' | 'total' | 'product'>
        Update: never   // satır kalemleri güncellenmez; sil & yeniden ekle
      }
      sales: {
        Row:    Sale
        Insert: Omit<Sale, 'id' | 'created_at' | 'deleted_at' | 'items'>
        Update: Partial<Omit<Sale, 'id' | 'items'>>
      }
      sale_items: {
        Row:    SaleItem
        Insert: Omit<SaleItem, 'id' | 'total' | 'product'>
        Update: never   // satır kalemleri güncellenmez; sil & yeniden ekle
      }
    }
    Views: {
      kritik_stok: {
        Row: KritikStokRow
      }
    }
    Functions: Record<string, never>
    Enums: {
      movement_type:   MovementType
      purchase_status: PurchaseStatus
      payment_method:  PaymentMethod
    }
  }
}
