// =============================================================================
// src/store/useCartStore.ts  —  Satış Sepeti State Yönetimi
//
// Zustand v5 ile yazılmış, üretim kalitesinde bir sepet store'u.
//
// Mimari kararlar:
//  • Derived state (totalAmount, totalTax) STORE içinde HESAPLANMAZ.
//    Bunun yerine her item'da `lineTax` ve `lineTotal` tutulur;
//    toplam değerler bir `computeTotals()` yardımcısıyla güncellenir.
//    Bu yaklaşım Zustand'ın önerdiği "flat state" prensibine uygundur.
//  • Stok sınırı: addItem / updateQuantity içinde `maxStock` kontrolü yapılır.
//    Aşım durumunda hata mesajı string olarak döner; UI toast'u kendisi gösterir.
//  • `persist` middleware: sessionStorage'a yazılır →
//    sayfa yenilenirse sepet kaybolmaz, tarayıcı kapatılırsa sıfırlanır.
//  • Tüm fiyat hesaplamaları KÜSÜRAT HATASI önlemek için
//    `Math.round(x * 100) / 100` ile 2 ondalık basamağa yuvarlanır.
// =============================================================================

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ─────────────────────────────────────────────────────────────────────────────
// 1. TİPLER
// ─────────────────────────────────────────────────────────────────────────────

/** Desteklenen KDV oranları (%) — veritabanı `vat_rate` sütunuyla birebir eşleşir */
export type TaxRate = 0 | 1 | 8 | 10 | 18 | 20

/**
 * Sepetteki bir satır.
 * totalPrice = quantity × unitPrice (KDV DAHİL)
 * lineTax    = (unitPrice × taxRate / (100 + taxRate)) × quantity  ← iç KDV
 */
export interface CartItem {
  /** Ürün UUID'si (products.id) — sepet içinde birincil anahtar */
  id:         string
  /** Ürün adı — kayıt için saklanır */
  name:       string
  /** Stok kodu — fatura görünümünde kullanılır */
  sku:        string
  /** Birim fiyat (KDV DAHİL, TL) */
  unitPrice:  number
  /** Seçilen adet / miktar */
  quantity:   number
  /** KDV oranı (%) */
  taxRate:    TaxRate
  /** Mevcut stok üst sınırı — aşım kontrolü için */
  maxStock:   number
  /** Birim (adet / kg / lt …) — fatura satırında görünür */
  unit:       string
  /** Satır toplamı: quantity × unitPrice (KDV dahil) */
  totalPrice: number
  /** Satıra düşen KDV tutarı (iç KDV yöntemi) */
  lineTax:    number
}

/** Store'un tüm durumu + aksiyonlar */
export interface CartState {
  // ── Veri ──────────────────────────────────────────────────────────────────
  /** Sepetteki kalemler */
  items:       CartItem[]
  /** KDV dahil genel toplam (TL) */
  totalAmount: number
  /** Toplam KDV tutarı (iç KDV, TL) */
  totalTax:    number
  /** KDV hariç ara toplam (TL) */
  subtotal:    number
  /** Toplam kalem sayısı (quantity'lerin toplamı, adet değil çeşit sayısı değil) */
  totalQty:    number

  // ── Aksiyonlar ─────────────────────────────────────────────────────────────
  /**
   * Sepete ürün ekle.
   * Ürün zaten sepette varsa miktarını artırır.
   *
   * @returns `null` → başarılı | `string` → kullanıcıya gösterilecek hata mesajı
   *
   * @example
   *   const err = addItem({ id: p.id, name: p.name, ... })
   *   if (err) toast.error(err)
   */
  addItem: (payload: AddItemPayload) => string | null

  /**
   * Belirtilen ürünün miktarını günceller.
   * 0 geçilirse ürün sepetten çıkarılır.
   * maxStock'u aşan değer kabul edilmez.
   *
   * @returns `null` → başarılı | `string` → hata mesajı
   */
  updateQuantity: (id: string, quantity: number) => string | null

  /** Ürünü sepetten tamamen çıkarır */
  removeItem: (id: string) => void

  /** Sepeti tamamen temizler (satış tamamlandı / iptal edildi) */
  clearCart: () => void

  /**
   * Mevcut stok tavanlarını toplu günceller.
   * Sayfa yenilenip ürün verileri Supabase'den tekrar çekildiğinde çağrılır.
   * Geçen sürede stok düştüyse ilgili kalem miktarını otomatik kırpar.
   */
  syncStockLimits: (updates: { id: string; maxStock: number }[]) => void
}

/** `addItem` fonksiyonuna geçilen payload */
export interface AddItemPayload {
  id:        string
  name:      string
  sku:       string
  unitPrice: number
  taxRate:   TaxRate
  maxStock:  number
  unit:      string
  /** Eklenecek miktar — varsayılan: 1 */
  quantity?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. YARDIMCI HESAPLAMALAR
// ─────────────────────────────────────────────────────────────────────────────

/** Küsürat hatasını önleyen yuvarlatma (2 ondalık basamak) */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Bir kalem için iç KDV hesabı (KDV dahil fiyattan KDV'yi geri çıkarma).
 *
 * Türkiye'de standart yöntem:
 *   KDV tutarı = (Fiyat × Oran) / (100 + Oran) × Miktar
 */
function calcLineTax(unitPrice: number, taxRate: TaxRate, quantity: number): number {
  if (taxRate === 0) return 0
  return round2((unitPrice * taxRate) / (100 + taxRate) * quantity)
}

/** Tüm sepet toplamlarını items dizisinden hesaplar */
function computeTotals(items: CartItem[]): {
  totalAmount: number
  totalTax:    number
  subtotal:    number
  totalQty:    number
} {
  let totalAmount = 0
  let totalTax    = 0
  let totalQty    = 0

  for (const item of items) {
    totalAmount += item.totalPrice
    totalTax    += item.lineTax
    totalQty    += item.quantity
  }

  return {
    totalAmount: round2(totalAmount),
    totalTax:    round2(totalTax),
    subtotal:    round2(totalAmount - totalTax),
    totalQty,
  }
}

/** CartItem nesnesini oluşturur (totalPrice ve lineTax hesaplı) */
function buildCartItem(payload: Required<AddItemPayload>): CartItem {
  const totalPrice = round2(payload.unitPrice * payload.quantity)
  const lineTax    = calcLineTax(payload.unitPrice, payload.taxRate, payload.quantity)
  return {
    id:         payload.id,
    name:       payload.name,
    sku:        payload.sku,
    unitPrice:  round2(payload.unitPrice),
    quantity:   payload.quantity,
    taxRate:    payload.taxRate,
    maxStock:   payload.maxStock,
    unit:       payload.unit,
    totalPrice,
    lineTax,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ZUSTAND STORE
// ─────────────────────────────────────────────────────────────────────────────

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      // ── Başlangıç durumu ─────────────────────────────────────────────────
      items:       [],
      totalAmount: 0,
      totalTax:    0,
      subtotal:    0,
      totalQty:    0,

      // ── addItem ──────────────────────────────────────────────────────────
      addItem: (payload) => {
        const qty = payload.quantity ?? 1

        // Miktar geçerlilik kontrolü
        if (qty <= 0) return 'Eklenecek miktar 0\'dan büyük olmalıdır.'
        if (!Number.isFinite(qty)) return 'Geçersiz miktar.'

        const state = get()
        const existing = state.items.find(i => i.id === payload.id)
        const currentQty = existing?.quantity ?? 0
        const newQty = currentQty + qty

        // Stok sınırı kontrolü
        if (payload.maxStock <= 0) {
          return `"${payload.name}" ürününün stoğu tükendi.`
        }
        if (newQty > payload.maxStock) {
          const available = payload.maxStock - currentQty
          if (available <= 0) {
            return `"${payload.name}" için stok sınırına ulaşıldı. (Maks: ${payload.maxStock} ${payload.unit})`
          }
          return (
            `Stok yetersiz! "${payload.name}" için en fazla ${available} ${payload.unit} daha ekleyebilirsiniz.`
          )
        }

        set(state => {
          let nextItems: CartItem[]

          if (existing) {
            // Mevcut kalemi güncelle
            nextItems = state.items.map(item =>
              item.id === payload.id
                ? buildCartItem({ ...item, quantity: newQty })
                : item
            )
          } else {
            // Yeni kalem ekle
            const newItem = buildCartItem({
              id:        payload.id,
              name:      payload.name,
              sku:       payload.sku,
              unitPrice: payload.unitPrice,
              taxRate:   payload.taxRate,
              maxStock:  payload.maxStock,
              unit:      payload.unit,
              quantity:  qty,
            })
            nextItems = [...state.items, newItem]
          }

          return { items: nextItems, ...computeTotals(nextItems) }
        })

        return null  // başarı
      },

      // ── updateQuantity ───────────────────────────────────────────────────
      updateQuantity: (id, quantity) => {
        // 0 veya negatif → ürünü kaldır
        if (quantity <= 0) {
          get().removeItem(id)
          return null
        }

        if (!Number.isFinite(quantity)) return 'Geçersiz miktar değeri.'

        const state = get()
        const item = state.items.find(i => i.id === id)
        if (!item) return 'Ürün sepette bulunamadı.'

        // Stok sınırı kontrolü
        if (quantity > item.maxStock) {
          return (
            `Stok yetersiz! "${item.name}" için maksimum ${item.maxStock} ${item.unit} girebilirsiniz.`
          )
        }

        set(state => {
          const nextItems = state.items.map(i =>
            i.id === id ? buildCartItem({ ...i, quantity }) : i
          )
          return { items: nextItems, ...computeTotals(nextItems) }
        })

        return null  // başarı
      },

      // ── removeItem ───────────────────────────────────────────────────────
      removeItem: (id) => {
        set(state => {
          const nextItems = state.items.filter(i => i.id !== id)
          return { items: nextItems, ...computeTotals(nextItems) }
        })
      },

      // ── clearCart ────────────────────────────────────────────────────────
      clearCart: () => {
        set({
          items:       [],
          totalAmount: 0,
          totalTax:    0,
          subtotal:    0,
          totalQty:    0,
        })
      },

      // ── syncStockLimits ──────────────────────────────────────────────────
      syncStockLimits: (updates) => {
        const state = get()
        if (state.items.length === 0) return

        const stockMap = new Map(updates.map(u => [u.id, u.maxStock]))
        let changed = false

        const nextItems = state.items.map(item => {
          const newMax = stockMap.get(item.id)
          if (newMax === undefined) return item  // bu ürün güncellenmedi

          // maxStock'u güncelle
          let newQty = item.quantity
          if (newMax < item.quantity) {
            // Gerçek stok düşmüş → miktarı kırp
            newQty = Math.max(newMax, 0)
            changed = true
          }

          return buildCartItem({ ...item, maxStock: newMax, quantity: newQty })
        }).filter(item => item.quantity > 0)  // 0 miktarlı kalemleri temizle

        if (changed || nextItems.length !== state.items.length) {
          set({ items: nextItems, ...computeTotals(nextItems) })
        }
      },
    }),
    {
      name:    'nalbur-cart-v1',           // sessionStorage anahtarı
      storage: createJSONStorage(() => sessionStorage),
      // Sadece items'ı persist et — totaller yeniden hesaplanır
      partialize: (state) => ({ items: state.items }),
      // sessionStorage'dan yüklendikten sonra totalleri yeniden hesapla
      onRehydrateStorage: () => (state) => {
        if (state && state.items.length > 0) {
          const totals = computeTotals(state.items)
          Object.assign(state, totals)
        }
      },
    }
  )
)

// ─────────────────────────────────────────────────────────────────────────────
// 4. SELECTOR HOOKları  (gereksiz render'ları önlemek için parçalı seçiciler)
// ─────────────────────────────────────────────────────────────────────────────

/** Sadece sepet öğelerini izler */
export const useCartItems    = () => useCartStore(s => s.items)
/** Sadece toplam tutarı izler */
export const useCartTotal    = () => useCartStore(s => s.totalAmount)
/** Sadece KDV tutarını izler */
export const useCartTax      = () => useCartStore(s => s.totalTax)
/** Sadece KDV hariç ara toplamı izler */
export const useCartSubtotal = () => useCartStore(s => s.subtotal)
/** Toplam kalem adedini izler (quantity'lerin toplamı) */
export const useCartQty      = () => useCartStore(s => s.totalQty)
/** Sepet boş mu? */
export const useCartIsEmpty  = () => useCartStore(s => s.items.length === 0)

/** Sabit aksiyon referansları (re-render tetiklemez, infinite loop önler) */
const staticActions = {
  addItem:         (payload: AddItemPayload) => useCartStore.getState().addItem(payload),
  updateQuantity:  (id: string, qty: number) => useCartStore.getState().updateQuantity(id, qty),
  removeItem:      (id: string) => useCartStore.getState().removeItem(id),
  clearCart:       () => useCartStore.getState().clearCart(),
  syncStockLimits: (updates: any) => useCartStore.getState().syncStockLimits(updates),
}

/** Tüm aksiyonları tek seferde döner (hiçbir state değişikliğinde re-render tetiklemez) */
export function useCartActions() {
  return staticActions
}

/**
 * Belirli bir ürünün sepetteki miktarını döner (yok ise 0).
 * Ürün listesi satırlarında "Sepete ekle" butonundaki sayacı göstermek için.
 *
 * @example
 *   const qty = useCartItemQty(product.id)  // → 0 veya mevcut miktar
 */
export function useCartItemQty(productId: string): number {
  return useCartStore(s => s.items.find(i => i.id === productId)?.quantity ?? 0)
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. YARDIMCI SAFİ FONKSİYONLAR (React dışından çağrılabilir)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Store'un anlık snapshot'ını döner — React hook olmadığı için
 * TanStack Query `onSuccess` callback'lerinde kullanılabilir.
 *
 * @example
 *   const snap = getCartSnapshot()
 *   await createSale({ total: snap.totalAmount, items: snap.items })
 */
export function getCartSnapshot() {
  return useCartStore.getState()
}

/** Aksiyonlara doğrudan eriş (React bileşeni dışından) */
export function getCartActions() {
  return staticActions
}
