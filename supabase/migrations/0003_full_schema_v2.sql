-- =============================================================================
-- Nalbur Stok Yönetim Sistemi — Tam Kurulum Betiği
-- Migration: 0003_full_schema_v2.sql
--
-- KULLANIM:
--   Bu betiği Supabase SQL Editor'e yapıştırıp tek seferde çalıştırın.
--   Mevcut tablolara dokunmaz (CREATE TABLE IF NOT EXISTS).
--   Yeni sütun ve kısıtlar idempotent (IF NOT EXISTS / OR REPLACE) eklenmiştir.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. UZANTILAR
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid() için
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- GIN trigram full-text arama


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. KATEGORİLER
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  parent_id   UUID        REFERENCES categories(id) ON DELETE CASCADE,
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ                           -- soft-delete
);

COMMENT ON TABLE  categories             IS 'Ürün kategori ağacı (hiyerarşik, parent_id ile)';
COMMENT ON COLUMN categories.parent_id  IS 'NULL = kök kategori; dolu = alt kategori';
COMMENT ON COLUMN categories.sort_order IS 'Aynı seviyedeki kategorilerin sıralaması';

CREATE INDEX IF NOT EXISTS idx_categories_parent     ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON categories(deleted_at);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TEDARİKÇİLER
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  contact_name  TEXT,                          -- irtibat kişisi
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  tax_no        TEXT,                          -- vergi kimlik no
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

COMMENT ON TABLE  suppliers              IS 'Tedarikçi/bayi firma kayıtları';
COMMENT ON COLUMN suppliers.contact_name IS 'Firmadaki irtibat kişisinin adı';
COMMENT ON COLUMN suppliers.tax_no       IS 'Vergi Kimlik Numarası (VKN)';

CREATE INDEX IF NOT EXISTS idx_suppliers_name       ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_deleted_at ON suppliers(deleted_at);

-- Yeni sütunları mevcut tabloya ekle (idempotent)
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS email        TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tax_no       TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS notes        TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ÜRÜNLER
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  sku            TEXT           UNIQUE NOT NULL,          -- stok kodu
  barcode        TEXT           UNIQUE,                   -- EAN-13 / QR
  name           TEXT           NOT NULL,
  description    TEXT,
  category_id    UUID           REFERENCES categories(id) ON DELETE SET NULL,
  supplier_id    UUID           REFERENCES suppliers(id)  ON DELETE SET NULL,
  unit           TEXT           NOT NULL DEFAULT 'adet',  -- adet/kg/lt/m/koli…
  current_stock  NUMERIC(12,2)  NOT NULL DEFAULT 0,
  min_stock      NUMERIC(12,2)  NOT NULL DEFAULT 0,       -- kritik stok seviyesi
  purchase_price NUMERIC(12,2)  NOT NULL DEFAULT 0,       -- alış fiyatı (KDV hariç)
  sale_price     NUMERIC(12,2)  NOT NULL DEFAULT 0,       -- satış fiyatı (KDV hariç)
  vat_rate       INT            NOT NULL DEFAULT 20        -- KDV oranı (%)
    CHECK (vat_rate IN (0, 1, 8, 10, 18, 20)),
  image_url      TEXT,
  is_active      BOOLEAN        NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

COMMENT ON TABLE  products               IS 'Stok ürün kartları';
COMMENT ON COLUMN products.sku           IS 'Stok Kodu — uygulama içinde birincil referans';
COMMENT ON COLUMN products.barcode       IS 'Barkod (EAN-13 veya QR kodu)';
COMMENT ON COLUMN products.min_stock     IS 'Bu seviyenin altı "kritik stok" uyarısı tetikler';
COMMENT ON COLUMN products.vat_rate      IS 'Geçerli Türkiye KDV oranları: 0/1/8/10/18/20';

CREATE INDEX IF NOT EXISTS idx_products_sku        ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode    ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category   ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier   ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at);
CREATE INDEX IF NOT EXISTS idx_products_active     ON products(is_active) WHERE is_active = true;
-- Trigram full-text arama (Türkçe ürün adı araması)
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. updated_at OTOMATİK GÜNCELLEME TETİKLEYİCİSİ
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_set_updated_at IS
  'Her UPDATE işleminde updated_at sütununu otomatik olarak now() ile günceller.';

-- Trigger: products tablosuna bağla
DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. STOK HAREKETLERİ
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_movements (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID           NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type  TEXT           NOT NULL
    CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity       NUMERIC(12,2)  NOT NULL,
  unit_price     NUMERIC(12,2),                  -- işlem anındaki birim fiyat
  total          NUMERIC(12,2),                  -- quantity × unit_price
  stock_before   NUMERIC(12,2),                  -- işlem öncesi stok
  stock_after    NUMERIC(12,2),                  -- işlem sonrası stok (= kalan)
  reference_type TEXT,                           -- 'purchase' | 'sale' | 'manual'
  reference_id   UUID,                           -- purchases.id veya sales.id
  note           TEXT,                           -- açıklama / fire sebebi vb.
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

COMMENT ON TABLE  stock_movements                IS 'Tüm stok giriş/çıkış/düzeltme geçmişi — immutable log';
COMMENT ON COLUMN stock_movements.movement_type  IS 'in=giriş/alış  out=çıkış/satış  adjustment=fire/düzeltme';
COMMENT ON COLUMN stock_movements.stock_after    IS 'İşlem sonrası kalan stok (products.current_stock ile eşleşmeli)';
COMMENT ON COLUMN stock_movements.reference_type IS 'Hangi modelden geldiği: purchase | sale | manual';
COMMENT ON COLUMN stock_movements.reference_id   IS 'İlgili purchases.id veya sales.id';

CREATE INDEX IF NOT EXISTS idx_movements_product    ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_type       ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_movements_date       ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_ref        ON stock_movements(reference_id) WHERE reference_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movements_deleted_at ON stock_movements(deleted_at);


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ALIŞ FAT (Purchases)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchases (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID           REFERENCES suppliers(id) ON DELETE SET NULL,
  invoice_no  TEXT,                              -- fatura numarası
  status      TEXT           NOT NULL DEFAULT 'completed'
    CHECK (status IN ('draft', 'completed', 'cancelled')),
  total       NUMERIC(12,2)  NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

COMMENT ON TABLE  purchases         IS 'Tedarikçi alış faturaları (başlık)';
COMMENT ON COLUMN purchases.status  IS 'draft=taslak  completed=tamamlandı  cancelled=iptal';

CREATE INDEX IF NOT EXISTS idx_purchases_supplier   ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status     ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_date       ON purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_deleted_at ON purchases(deleted_at);

-- Eksik sütunları ekle (idempotent)
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS status     TEXT NOT NULL DEFAULT 'completed'
  CHECK (status IN ('draft', 'completed', 'cancelled'));
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. ALIŞ KALEMLERİ (Purchase Items)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_items (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID           NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id  UUID           NOT NULL REFERENCES products(id),
  quantity    NUMERIC(12,2)  NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(12,2)  NOT NULL CHECK (unit_price >= 0),
  total       NUMERIC(12,2)  NOT NULL                   -- quantity × unit_price
    GENERATED ALWAYS AS (quantity * unit_price) STORED
);

COMMENT ON TABLE  purchase_items       IS 'Alış faturası kalemleri (satır bazı)';
COMMENT ON COLUMN purchase_items.total IS 'Hesaplanan alan: quantity × unit_price';

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product  ON purchase_items(product_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. SATIŞLAR (Sales)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name  TEXT,                              -- boş = perakende müşteri
  payment_method TEXT           NOT NULL DEFAULT 'nakit'
    CHECK (payment_method IN ('nakit', 'kredi kartı', 'havale')),
  subtotal       NUMERIC(12,2)  NOT NULL DEFAULT 0,  -- KDV hariç ara toplam
  vat_total      NUMERIC(12,2)  NOT NULL DEFAULT 0,  -- toplam KDV tutarı
  total          NUMERIC(12,2)  NOT NULL DEFAULT 0,  -- subtotal + vat_total
  notes          TEXT,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

COMMENT ON TABLE  sales                  IS 'Satış işlemleri (başlık)';
COMMENT ON COLUMN sales.payment_method   IS 'nakit | kredi kartı | havale';
COMMENT ON COLUMN sales.subtotal         IS 'KDV hariç ara toplam';
COMMENT ON COLUMN sales.vat_total        IS 'Toplam KDV tutarı';
COMMENT ON COLUMN sales.total            IS 'Müşteriden tahsil edilen tutar (subtotal + vat_total)';

CREATE INDEX IF NOT EXISTS idx_sales_date          ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_payment       ON sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_sales_deleted_at    ON sales(deleted_at);
-- Müşteri adı araması için trigram
CREATE INDEX IF NOT EXISTS idx_sales_customer_trgm ON sales USING GIN (customer_name gin_trgm_ops)
  WHERE customer_name IS NOT NULL;

-- Eksik sütunları ekle (idempotent)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. SATIŞ KALEMLERİ (Sale Items)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sale_items (
  id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id    UUID           NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID           NOT NULL REFERENCES products(id),
  quantity   NUMERIC(12,2)  NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2)  NOT NULL CHECK (unit_price >= 0),
  total      NUMERIC(12,2)  NOT NULL                   -- quantity × unit_price
    GENERATED ALWAYS AS (quantity * unit_price) STORED
);

COMMENT ON TABLE  sale_items       IS 'Satış işlemi kalemleri (satır bazı)';
COMMENT ON COLUMN sale_items.total IS 'Hesaplanan alan: quantity × unit_price';

CREATE INDEX IF NOT EXISTS idx_sale_items_sale    ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. YARDIMCI VIEW: kritik_stok
--     current_stock < min_stock olan aktif ürünleri döndürür.
--     Frontend'de SELECT * FROM kritik_stok ile kullanılabilir.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW kritik_stok AS
SELECT
  p.id,
  p.sku,
  p.name,
  p.unit,
  p.current_stock,
  p.min_stock,
  p.purchase_price,
  (p.min_stock - p.current_stock)             AS deficit,             -- eksik miktar
  ((p.min_stock - p.current_stock)
    * p.purchase_price)                        AS reorder_cost,        -- tahmini tedarik maliyeti
  ROUND((p.current_stock / NULLIF(p.min_stock, 0)) * 100) AS stock_pct, -- doluluk %
  c.name                                       AS category_name,
  s.name                                       AS supplier_name,
  s.phone                                      AS supplier_phone
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN suppliers  s ON s.id = p.supplier_id
WHERE
  p.is_active    = true
  AND p.deleted_at IS NULL
  AND p.current_stock < p.min_stock
ORDER BY stock_pct ASC;

COMMENT ON VIEW kritik_stok IS
  'Stok seviyesi minimum seviyenin altına düşmüş aktif ürünleri gösterir.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────────────────────
-- Tüm tablolarda RLS etkinleştir
ALTER TABLE categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items     ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- GELİŞTİRME POLİTİKALARI (DEV)
-- Giriş yapmış (authenticated) kullanıcıya tam erişim.
-- Üretimde bu bölümü kullanıcı/rol bazlı kısıtlamalarla değiştirin.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'categories', 'suppliers', 'products', 'stock_movements',
    'purchases', 'purchase_items', 'sales', 'sale_items'
  ] LOOP
    -- Eski politikaları temizle (idempotent)
    EXECUTE format('DROP POLICY IF EXISTS "anon_all_%1$s"          ON %1$s', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_all_%1$s" ON %1$s', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "dev_all_%1$s"           ON %1$s', tbl);

    -- authenticated role: tam CRUD
    EXECUTE format(
      'CREATE POLICY "authenticated_all_%1$s" ON %1$s
         FOR ALL TO authenticated
         USING (true) WITH CHECK (true)',
      tbl
    );

    -- anon role: GELİŞTİRME İÇİN açık — üretimde kaldırın!
    -- Supabase'de anon key ile API testi yapabilmek için:
    EXECUTE format(
      'CREATE POLICY "dev_all_%1$s" ON %1$s
         FOR ALL TO anon
         USING (true) WITH CHECK (true)',
      tbl
    );
  END LOOP;
END $$;
