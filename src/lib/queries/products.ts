import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Product } from '@/types/database'

export type ProductInput = {
  sku: string
  barcode: string | null
  name: string
  description: string | null
  category_id: string | null
  supplier_id: string | null
  unit: string
  current_stock: number
  min_stock: number
  purchase_price: number
  sale_price: number
  vat_rate: number
  is_active: boolean
}

export function useProducts(search = '') {
  return useQuery({
    queryKey: ['products', 'list', search],
    queryFn: async () => {
      let q = supabase
        .from('products')
        .select('*, category:categories(id,name), supplier:suppliers(id,name)')
        .is('deleted_at', null)
        .order('name')
        .limit(2000)
      if (search.trim()) {
        q = q.or(
          `name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`
        )
      }
      const { data, error } = await q
      if (error) throw new Error(error.message)
      return (data ?? []) as Product[]
    },
  })
}

export function useDeletedProducts(enabled = true) {
  return useQuery({
    queryKey: ['products', 'deleted'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(id,name), supplier:suppliers(id,name)')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as Product[]
    },
    enabled,
  })
}

export function useProductCount() {
  return useQuery({
    queryKey: ['products', 'count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
      if (error) throw new Error(error.message)
      return count ?? 0
    },
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', 'detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(id,name), supplier:suppliers(id,name)')
        .eq('id', id)
        .single()
      if (error) throw new Error(error.message)
      return data as Product
    },
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ProductInput) => {
      const { data, error } = await supabase
        .from('products')
        .insert(input)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as Product
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: ProductInput & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as Product
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useRestoreProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .update({ deleted_at: null })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}
