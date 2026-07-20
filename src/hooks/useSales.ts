// =============================================================================
// src/hooks/useSales.ts
//
// Satış işlemleri için dışa açılan Fasad hook.
// Sepet durumu ile (useCartStore) Supabase API'sini birleştirir.
// Hata anında (rollback) güvenli transaction mantığı işletilir.
// =============================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getCartSnapshot, getCartActions } from '@/store/useCartStore'
import { createStockMovementsForLines } from '@/lib/queries/stockHelpers'
import type { Sale } from '@/types/database'

/**
 * Zustand sepetindeki ürünleri kullanarak yeni bir satış oluşturur.
 * 1. sales tablosuna ana kayıt
 * 2. sale_items tablosuna bulk insert
 * 3. stock_movements güncellemesi
 *
 * NOT: İşlem sırasında bir hata çıkarsa eklenen ana kayıt silinir (Rollback).
 */
export function useAddSale() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: { customer_name: string | null; payment_method: string }) => {
      const cart = getCartSnapshot()
      if (cart.items.length === 0) throw new Error('Sepet boş. Satış yapılamaz.')

      let saleId: string | null = null

      try {
        // 1. Ana satış kaydı (sales tablosu)
        const { data: sale, error: saleErr } = await supabase
          .from('sales')
          .insert({
            customer_name: input.customer_name || null,
            payment_method: input.payment_method as any,
            subtotal: cart.subtotal,
            vat_total: cart.totalTax,
            total: cart.totalAmount,
            notes: null,
          })
          .select()
          .single()

        if (saleErr) throw new Error(`Satış kaydı oluşturulamadı: ${saleErr.message}`)
        saleId = sale.id

        // 2. Sepet öğelerini sale_items formatına dönüştür
        const saleItems = cart.items.map(item => ({
          sale_id: sale.id,
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        }))

        const { error: itemsErr } = await supabase.from('sale_items').insert(saleItems)
        if (itemsErr) throw new Error(`Ürünler eklenemedi: ${itemsErr.message}`)

        // 3. Stok hareketlerini oluştur ve ürün stoklarını düş
        const movementLines = cart.items.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        }))

        await createStockMovementsForLines(movementLines, {
          movement_type: 'out',
          reference_type: 'sale',
          reference_id: sale.id,
        })

        return sale as Sale
      } catch (error) {
        // ROLLBACK: Eğer üstteki adımlardan biri başarısız olursa oluşturulan sales kaydını sil.
        if (saleId) {
          await supabase.from('sales').delete().eq('id', saleId)
        }
        throw error
      }
    },
    onSuccess: () => {
      // Satış başarılı! Sepeti boşalt ve arayüzü güncelle
      getCartActions().clearCart()
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Diğer tüm Sales hook'larını ana kütüphaneden olduğu gibi dışa aktar (Re-export)
// Böylece UI bileşenleri tek bir noktadan (useSales.ts) import yapabilir.
// ─────────────────────────────────────────────────────────────────────────────
export {
  useSales,
  useUpdateSale,
  useDeleteSale,
  useDeletedSales,
  useRestoreSale,
  type SaleInput,
  type SaleLineItemInput
} from '@/lib/queries/sales'
