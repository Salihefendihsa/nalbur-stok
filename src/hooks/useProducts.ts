// =============================================================================
// src/hooks/useProducts.ts  —  UI Katmanı için Fasad Hook'u
//
// Bu dosya, src/lib/queries/products.ts içindeki alt seviye hook'ları
// sarmalayarak Products.tsx'e hazır, okunması kolay bir API sunar.
//
// NEDEN bu katman var?
//  • lib/queries/  → Supabase ile doğrudan konuşan, ham veri katmanı
//  • hooks/        → UI ihtiyaçlarına göre şekillendirilmiş, kombine hook'lar
//  • pages/        → Yalnızca hooks/ kullanır, lib/queries'e hiç dokunmaz
// =============================================================================

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useProducts      as useProductsQuery,
  useProduct       as useProductQuery,
  useLowStockProducts,
  useAddProduct,
  useUpdateProduct,
  useDeleteProduct,
  useRestoreProduct,
  useAdjustStock,
  productKeys,
  type ProductInput,
  type StockAdjustInput,
} from '@/lib/queries/products'
import type { Product } from '@/types/database'

// ─────────────────────────────────────────────────────────────────────────────
// useProductList — Ürün listesi için hazır hook
// ─────────────────────────────────────────────────────────────────────────────

export interface UseProductListReturn {
  /** Filtrelenmiş ürün dizisi */
  products:     Product[]
  /** Yükleme durumu (ilk yükleme) */
  isLoading:    boolean
  /** Arka planda yenileniyor mu (stale refetch) */
  isFetching:   boolean
  /** Hata varsa Error nesnesi, yoksa null */
  error:        Error | null
  /** Cache'i elle yenile */
  refetch:      () => void
}

/**
 * Ürün listesi için kullanıma hazır hook.
 * Products.tsx ana bileşeninde kullanılır.
 *
 * @param search - Debounce edilmiş arama terimi
 *
 * @example
 *   const { products, isLoading, error } = useProductList(debouncedSearch)
 */
export function useProductList(search = ''): UseProductListReturn {
  const query = useProductsQuery(search)
  return {
    products:   query.data   ?? [],
    isLoading:  query.isLoading,
    isFetching: query.isFetching,
    error:      query.error  as Error | null,
    refetch:    query.refetch,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useProductDetail — Tekil ürün detayı için hazır hook
// ─────────────────────────────────────────────────────────────────────────────

export interface UseProductDetailReturn {
  product:    Product | undefined
  isLoading:  boolean
  error:      Error | null
  refetch:    () => void
}

/**
 * Tek bir ürünün detayını getirir.
 * ProductDetail.tsx ve ProductForm.tsx bileşenlerinde kullanılır.
 *
 * @param id - Ürün UUID'si. Boş string ise query devre dışı kalır.
 */
export function useProductDetail(id: string): UseProductDetailReturn {
  const query = useProductQuery(id)
  return {
    product:   query.data,
    isLoading: query.isLoading,
    error:     query.error as Error | null,
    refetch:   query.refetch,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useProductActions — Tüm CRUD işlemlerini tek nesnede toplar
// ─────────────────────────────────────────────────────────────────────────────

export interface UseProductActionsReturn {
  /** Yeni ürün oluştur */
  addProduct:     (input: ProductInput) => Promise<Product>
  /** Mevcut ürünü güncelle */
  updateProduct:  (payload: ProductInput & { id: string }) => Promise<Product>
  /** Stok miktarını güncelle (hafif operasyon) */
  adjustStock:    (payload: StockAdjustInput) => Promise<void>
  /** Ürünü soft-delete yap (geri alınabilir) */
  deleteProduct:  (id: string) => Promise<void>
  /** Soft-delete'i geri al */
  restoreProduct: (id: string) => Promise<void>
  /** Tüm ürün cache'ini temizle ve yeniden çek */
  invalidateAll:  () => void
  /** Mutation yükleme durumları */
  isPendingAdd:     boolean
  isPendingUpdate:  boolean
  isPendingDelete:  boolean
  isPendingRestore: boolean
}

/**
 * Products sayfasındaki tüm CRUD mutasyonlarını tek bir hook'ta toplar.
 *
 * @example
 *   const actions = useProductActions()
 *
 *   // Ürün ekle
 *   const newProduct = await actions.addProduct({ name: 'Çekiç', sku: '...', ... })
 *
 *   // Ürün sil
 *   await actions.deleteProduct(product.id)
 */
export function useProductActions(): UseProductActionsReturn {
  const qc      = useQueryClient()
  const add     = useAddProduct()
  const update  = useUpdateProduct()
  const adjust  = useAdjustStock()
  const remove  = useDeleteProduct()
  const restore = useRestoreProduct()

  const invalidateAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: productKeys.all() })
  }, [qc])

  return {
    addProduct:     (input) => add.mutateAsync(input),
    updateProduct:  (payload) => update.mutateAsync(payload),
    adjustStock:    (payload) => adjust.mutateAsync(payload),
    deleteProduct:  (id) => remove.mutateAsync(id),
    restoreProduct: (id) => restore.mutateAsync(id),
    invalidateAll,

    isPendingAdd:     add.isPending,
    isPendingUpdate:  update.isPending,
    isPendingDelete:  remove.isPending,
    isPendingRestore: restore.isPending,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useLowStock — Kritik stok uyarısı için hook
// ─────────────────────────────────────────────────────────────────────────────

export interface UseLowStockReturn {
  lowStockProducts: Product[]
  criticalCount:    number     // %20 ve altı
  warningCount:     number     // %21–50 arası
  isLoading:        boolean
}

/**
 * Minimum stok seviyesinin altındaki ürünleri getirir.
 * Dashboard KPI ve StockMovements/Kritik sekmesi için kullanılır.
 */
export function useLowStock(): UseLowStockReturn {
  const query = useLowStockProducts()
  const products = query.data ?? []

  const criticalCount = products.filter(p => {
    const pct = p.min_stock > 0 ? (p.current_stock / p.min_stock) * 100 : 0
    return pct <= 20
  }).length

  const warningCount = products.filter(p => {
    const pct = p.min_stock > 0 ? (p.current_stock / p.min_stock) * 100 : 0
    return pct > 20 && pct <= 50
  }).length

  return {
    lowStockProducts: products,
    criticalCount,
    warningCount,
    isLoading: query.isLoading,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-export: Sayfalar bu hook dosyasından import eder, lib'e dokunmaz
// ─────────────────────────────────────────────────────────────────────────────
export type { ProductInput, StockAdjustInput }
export { productKeys }
