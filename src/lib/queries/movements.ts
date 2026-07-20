import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MovementType, StockMovement } from '@/types/database'

export type MovementInput = {
  product_id: string
  movement_type: MovementType
  quantity: number
  note: string | null
}

export function useProductMovements(productId: string) {
  return useQuery({
    queryKey: ['movements', 'product', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('product_id', productId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw new Error(error.message)
      return (data ?? []) as StockMovement[]
    },
    enabled: !!productId,
  })
}

export function useMovements() {
  return useQuery({
    queryKey: ['movements', 'list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*, product:products(id,name,sku,unit,current_stock)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(500)
      if (error) throw new Error(error.message)
      return (data ?? []) as StockMovement[]
    },
  })
}

export function useDeletedMovements(enabled = true) {
  return useQuery({
    queryKey: ['movements', 'deleted'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*, product:products(id,name,sku,unit,current_stock)')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as StockMovement[]
    },
    enabled,
  })
}

async function fetchProductStock(productId: string): Promise<number> {
  const { data, error } = await supabase
    .from('products')
    .select('current_stock')
    .eq('id', productId)
    .single()
  if (error) throw new Error(error.message)
  return data.current_stock as number
}

function computeAfter(type: MovementType, before: number, quantity: number): number {
  if (type === 'in') return before + quantity
  if (type === 'out') return before - quantity
  return quantity
}

export function useCreateMovement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: MovementInput) => {
      const before = await fetchProductStock(input.product_id)
      const after = computeAfter(input.movement_type, before, input.quantity)

      const { data, error } = await supabase
        .from('stock_movements')
        .insert({
          product_id: input.product_id,
          movement_type: input.movement_type,
          quantity: input.quantity,
          note: input.note,
          reference_type: 'manual',
          stock_before: before,
          stock_after: after,
        })
        .select()
        .single()
      if (error) throw new Error(error.message)

      const { error: updateErr } = await supabase
        .from('products')
        .update({ current_stock: after })
        .eq('id', input.product_id)
      if (updateErr) throw new Error(updateErr.message)

      return data as StockMovement
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movements'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateMovement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string | null }) => {
      const { data, error } = await supabase
        .from('stock_movements')
        .update({ note })
        .eq('id', id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as StockMovement
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['movements'] }),
  })
}

export function useDeleteMovement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('stock_movements')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['movements'] }),
  })
}

export function useRestoreMovement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('stock_movements')
        .update({ deleted_at: null })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['movements'] }),
  })
}
