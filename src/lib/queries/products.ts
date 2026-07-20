// =============================================================================
// src/lib/queries/products.ts  —  Products CRUD Query Hooks
//
// TanStack Query v5 + tiplendirilmiş Supabase client kullanılarak
// yazılmış, Production-ready CRUD hook koleksiyonu.
//
// Mimari kararlar:
//  • Her mutation, ilgili queryKey'leri invalidate eder → UI anında güncellenir.
//  • Soft-delete: deleted_at = now() | null (gerçek silme yok, geri alınabilir).
//  • Optimistic update: useUpdateProduct, local cache'i hemen günceller.
//  • select() string'leri sabit — tip dönüşümü cast ile yapılır (Supabase v2).
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Product, VatRate } from '@/types/database'

// ─────────────────────────────────────────────────────────────────────────────
// Input tipleri  (Create & Update için kullanılan form verisi)
// ─────────────────────────────────────────────────────────────────────────────

/** Yeni ürün oluşturma / mevcut ürün güncelleme payload'u */
export interface ProductInput {
  sku:            string
  barcode:        string | null
  name:           string
  description:    string | null
  category_id:    string | null
  supplier_id:    string | null
  unit:           string
  current_stock:  number
  min_stock:      number
  purchase_price: number
  sale_price:     number
  vat_rate:       VatRate
  image_url?:     string | null
  is_active:      boolean
}

/** Sadece stok miktarını güncellemek için kullanılan hafif payload */
export interface StockAdjustInput {
  id:            string
  current_stock: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Sabitler
// ─────────────────────────────────────────────────────────────────────────────

/** Kategori ve tedarikçi join'i ile ürün listesi için kullanılan select dizgisi */
const PRODUCT_SELECT = `
  *,
  category:categories(id, name),
  supplier:suppliers(id, name)
` as const

/** TanStack Query key fabrikası — merkezi yönetim */
export const productKeys = {
  all:     () => ['products']                           as const,
  lists:   () => ['products', 'list']                   as const,
  list:    (search: string) => ['products', 'list', search] as const,
  deleted: () => ['products', 'deleted']                as const,
  detail:  (id: string) => ['products', 'detail', id]  as const,
  count:   () => ['products', 'count']                  as const,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tüm aktif ürünleri getirir.
 *
 * @param search - Opsiyonel arama terimi. Ad, SKU veya barkod üzerinden
 *                 PostgreSQL ILIKE ile sunucu taraflı filtreleme yapılır.
 *
 * @example
 *   const { data: products = [], isLoading, error } = useProducts()
 *   const { data: results  = [], isLoading }        = useProducts(debouncedSearch)
 */
export function useProducts(search = '') {
  return useQuery({
    queryKey: productKeys.list(search),
    queryFn:  async (): Promise<Product[]> => {
      let query = supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(2000)

      // Arama terimi varsa; ad, SKU veya barkod üzerinde paralel ILIKE
      if (search.trim()) {
        query = query.or(
          `name.ilike.%${search.trim()}%,` +
          `sku.ilike.%${search.trim()}%,` +
          `barcode.ilike.%${search.trim()}%`
        )
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data ?? []) as Product[]
    },
    // Arama değiştikçe önceki sonuç gösterilmeye devam etsin (kullanıcı deneyimi)
    placeholderData: (prev) => prev,
  })
}

/**
 * Tüm ürünleri (aktif/pasif fark etmeksizin) getirir.
 * Yönetim ekranları için kullanılır.
 */
export function useAllProducts() {
  return useQuery({
    queryKey: [...productKeys.lists(), 'all'],
    queryFn:  async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .is('deleted_at', null)
        .order('name')
        .limit(2000)
      if (error) throw new Error(error.message)
      return (data ?? []) as Product[]
    },
  })
}

/**
 * Soft-delete edilmiş ürünleri getirir ("Çöp Kutusu" görünümü için).
 *
 * @param enabled - false geçilirse query çalışmaz (modal kapalıyken gereksiz istek olmaz)
 */
export function useDeletedProducts(enabled = true) {
  return useQuery({
    queryKey: productKeys.deleted(),
    queryFn:  async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as Product[]
    },
    enabled,
  })
}

/**
 * Toplam aktif ürün sayısını getirir (sadece count — tüm satırlar çekilmez).
 * Dashboard KPI kartı için kullanılır.
 */
export function useProductCount() {
  return useQuery({
    queryKey: productKeys.count(),
    queryFn:  async (): Promise<number> => {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
      if (error) throw new Error(error.message)
      return count ?? 0
    },
    staleTime: 1000 * 60 * 5,  // 5 dakika taze tut — sık değişmez
  })
}

/**
 * Tek bir ürünün detayını getirir (kategori + tedarikçi join'i ile).
 *
 * @param id - Ürün UUID'si. Boş string geçilirse query devre dışı kalır.
 */
export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn:  async (): Promise<Product> => {
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('id', id)
        .single()
      if (error) throw new Error(error.message)
      return data as Product
    },
    enabled: !!id,
  })
}

/**
 * Minimum stok seviyesinin altındaki ürünleri getirir.
 * Stok Hareketleri / Raporlar sayfasındaki "Kritik Stok" için kullanılır.
 */
export function useLowStockProducts() {
  return useQuery({
    queryKey: [...productKeys.lists(), 'low-stock'],
    queryFn:  async (): Promise<Product[]> => {
      // PostgreSQL: current_stock < min_stock — filtre hesaplanan koşul
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .is('deleted_at', null)
        .eq('is_active', true)
        // Supabase filter: lt(column, value) → WHERE current_stock < min_stock
        // Dinamik sütun karşılaştırması için Supabase rpc() kullanımı gerekir;
        // bu yüzden tüm ürünleri çekip client'ta filtreleriz (2000 limit yeterli).
        .order('current_stock', { ascending: true })
        .limit(2000)
      if (error) throw new Error(error.message)
      const products = (data ?? []) as Product[]
      return products.filter(p => p.current_stock < p.min_stock)
    },
    staleTime: 1000 * 30,  // Stok kritik — 30 saniyede bir tazele
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Yeni ürün oluşturur.
 *
 * @fires invalidateQueries(['products']) → tüm ürün listeleri yeniden çekilir
 *
 * @example
 *   const addProduct = useAddProduct()
 *   await addProduct.mutateAsync({ name: 'Çekiç', sku: 'EL-001', ... })
 */
export function useAddProduct() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: ProductInput): Promise<Product> => {
      const { data, error } = await supabase
        .from('products')
        .insert({
          sku:            input.sku,
          barcode:        input.barcode,
          name:           input.name,
          description:    input.description,
          category_id:    input.category_id,
          supplier_id:    input.supplier_id,
          unit:           input.unit,
          current_stock:  input.current_stock,
          min_stock:      input.min_stock,
          purchase_price: input.purchase_price,
          sale_price:     input.sale_price,
          vat_rate:       input.vat_rate,
          image_url:      input.image_url ?? null,
          is_active:      input.is_active,
        })
        .select(PRODUCT_SELECT)
        .single()
      if (error) throw new Error(error.message)
      return data as Product
    },

    onSuccess: (newProduct) => {
      // Tüm ürün listelerini geçersiz kıl → otomatik yeniden çekme
      qc.invalidateQueries({ queryKey: productKeys.all() })
      // Yeni ürünün detail cache'ini önceden doldur (gereksiz istek önleme)
      qc.setQueryData(productKeys.detail(newProduct.id), newProduct)
    },
  })
}

/** @alias useAddProduct — mevcut `useCreateProduct` çağrılarıyla geriye dönük uyumluluk */
export const useCreateProduct = useAddProduct

/**
 * Mevcut bir ürünü günceller.
 * Optimistic update: UI önce değiştirilir, hata olursa eski haline döner.
 *
 * @example
 *   const updateProduct = useUpdateProduct()
 *   await updateProduct.mutateAsync({ id: product.id, sale_price: 150, ...restFields })
 */
export function useUpdateProduct() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ProductInput & { id: string }): Promise<Product> => {
      const { id, ...input } = payload
      const { data, error } = await supabase
        .from('products')
        .update({
          sku:            input.sku,
          barcode:        input.barcode,
          name:           input.name,
          description:    input.description,
          category_id:    input.category_id,
          supplier_id:    input.supplier_id,
          unit:           input.unit,
          current_stock:  input.current_stock,
          min_stock:      input.min_stock,
          purchase_price: input.purchase_price,
          sale_price:     input.sale_price,
          vat_rate:       input.vat_rate,
          image_url:      input.image_url ?? null,
          is_active:      input.is_active,
          // updated_at → PostgreSQL trigger (trg_products_updated_at) otomatik günceller
        })
        .eq('id', id)
        .select(PRODUCT_SELECT)
        .single()
      if (error) throw new Error(error.message)
      return data as Product
    },

    // Optimistic update: mutation başlamadan önce cache'i güncelle
    onMutate: async (payload) => {
      // Çakışan refetch'leri iptal et
      await qc.cancelQueries({ queryKey: productKeys.detail(payload.id) })
      // Mevcut cache'i yedekle (rollback için)
      const previous = qc.getQueryData<Product>(productKeys.detail(payload.id))
      // Cache'i iyimser olarak güncelle
      if (previous) {
        qc.setQueryData(productKeys.detail(payload.id), { ...previous, ...payload })
      }
      return { previous }
    },

    // Hata: eski cache'e geri dön
    onError: (_err, payload, context) => {
      if (context?.previous) {
        qc.setQueryData(productKeys.detail(payload.id), context.previous)
      }
    },

    // Her durumda (başarı/hata): cache'i gerçek sunucu verisiyle tazele
    onSettled: (_data, _err, payload) => {
      qc.invalidateQueries({ queryKey: productKeys.detail(payload.id) })
      qc.invalidateQueries({ queryKey: productKeys.lists() })
    },
  })
}

/**
 * Yalnızca stok miktarını günceller (hafif mutation — form açmadan kullanılır).
 */
export function useAdjustStock() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, current_stock }: StockAdjustInput): Promise<void> => {
      const { error } = await supabase
        .from('products')
        .update({ current_stock })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all() })
    },
  })
}

/**
 * Ürünü soft-delete yapar (deleted_at = now()).
 * Geri alınabilir — useRestoreProduct ile eski haline getirilir.
 *
 * @example
 *   const deleteProduct = useDeleteProduct()
 *   await deleteProduct.mutateAsync(product.id)
 */
export function useDeleteProduct() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('products')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      // Hem aktif liste hem silinen liste güncellenir
      qc.invalidateQueries({ queryKey: productKeys.all() })
    },
  })
}

/**
 * Soft-delete edilmiş bir ürünü geri yükler (deleted_at = null).
 */
export function useRestoreProduct() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('products')
        .update({ deleted_at: null })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all() })
    },
  })
}

/**
 * Ürünü kalıcı olarak siler (hard-delete).
 * ⚠️  DİKKAT: Bu işlem geri alınamaz.
 * İlgili stock_movements CASCADE ile silinir (DB kısıtı).
 * Yalnızca admin kullanıcıları tarafından kullanılmalıdır.
 */
export function useHardDeleteProduct() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all() })
    },
  })
}
