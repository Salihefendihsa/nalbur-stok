// =============================================================================
// src/hooks/usePurchases.ts
//
// Alış/Tedarik işlemleri için dışa açılan Fasad hook.
// Sepet durumu ile (useCartStore) Supabase API'sini birleştirir.
// Hata anında (rollback) güvenli transaction mantığı işletilir.
// =============================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getCartSnapshot, getCartActions } from '@/store/useCartStore'
import { createStockMovementsForLines } from '@/lib/queries/stockHelpers'
import type { Purchase } from '@/types/database'

/**
 * Zustand sepetindeki ürünleri kullanarak yeni bir alış (tedarik) oluşturur.
 * 1. purchases tablosuna ana kayıt
 * 2. purchase_items tablosuna bulk insert
 * 3. stock_movements güncellemesi (stok artırma)
 *
 * NOT: İşlem sırasında bir hata çıkarsa eklenen ana kayıt silinir (Rollback).
 */
export function useAddPurchase() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: { supplier_id: string; invoice_no: string | null }) => {
      const cart = getCartSnapshot()
      if (cart.items.length === 0) throw new Error('Sepet boş. Alış yapılamaz.')

      let purchaseId: string | null = null

      try {
        // 1. Ana alış kaydı (purchases tablosu)
        const { data: purchase, error: purchaseErr } = await supabase
          .from('purchases')
          .insert({
            supplier_id: input.supplier_id,
            invoice_no: input.invoice_no || null,
            total: cart.totalAmount,
            status: 'completed', // Enum değeri ile direkt tamamlandı
            notes: null,
          })
          .select()
          .single()

        if (purchaseErr) throw new Error(`Alış kaydı oluşturulamadı: ${purchaseErr.message}`)
        purchaseId = purchase.id

        // 2. Sepet öğelerini purchase_items formatına dönüştür
        const purchaseItems = cart.items.map(item => ({
          purchase_id: purchase.id,
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        }))

        const { error: itemsErr } = await supabase.from('purchase_items').insert(purchaseItems)
        if (itemsErr) throw new Error(`Ürünler eklenemedi: ${itemsErr.message}`)

        // 3. Stok hareketlerini oluştur ve ürün stoklarını artır
        const movementLines = cart.items.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        }))

        await createStockMovementsForLines(movementLines, {
          movement_type: 'in', // stok girişi
          reference_type: 'purchase',
          reference_id: purchase.id,
        })

        return purchase as Purchase
      } catch (error) {
        // ROLLBACK: Eğer üstteki adımlardan biri başarısız olursa oluşturulan purchases kaydını sil.
        if (purchaseId) {
          await supabase.from('purchases').delete().eq('id', purchaseId)
        }
        throw error
      }
    },
    onSuccess: () => {
      // Alış başarılı! Sepeti boşalt ve arayüzü güncelle
      getCartActions().clearCart()
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Diğer tüm Purchases hook'larını ana kütüphaneden olduğu gibi dışa aktar (Re-export)
// Böylece UI bileşenleri tek bir noktadan (usePurchases.ts) import yapabilir.
// ─────────────────────────────────────────────────────────────────────────────
export {
  usePurchases,
  useUpdatePurchase,
  useDeletePurchase,
  useDeletedPurchases,
  useRestorePurchase,
  type PurchaseInput,
  type PurchaseLineItemInput
} from '@/lib/queries/purchases'
