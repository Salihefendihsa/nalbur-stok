import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PaymentMethod, Sale } from '@/types/database'
import {
  createStockMovementsForLines,
  removeStockMovementsForReference,
  reverseStockMovementsForReference,
  reapplyStockMovementsForReference,
} from './stockHelpers'

export type SaleLineItemInput = {
  product_id: string
  quantity: number
  unit_price: number
}

export type SaleInput = {
  customer_name: string | null
  payment_method: string
  items: SaleLineItemInput[]
}

function computeTotals(items: SaleLineItemInput[]) {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
  const vat_total = Math.round(subtotal * 0.2 * 100) / 100
  const total = subtotal + vat_total
  return { subtotal, vat_total, total }
}

export function useSales() {
  return useQuery({
    queryKey: ['sales', 'list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*, items:sale_items(*, product:products(id,name,unit))')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(500)
      if (error) throw new Error(error.message)
      return (data ?? []) as Sale[]
    },
  })
}

export function useDeletedSales(enabled = true) {
  return useQuery({
    queryKey: ['sales', 'deleted'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*, items:sale_items(*, product:products(id,name,unit))')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as Sale[]
    },
    enabled,
  })
}

export function useCreateSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SaleInput) => {
      const { subtotal, vat_total, total } = computeTotals(input.items)
      const { data: sale, error: saleErr } = await supabase
        .from('sales')
        .insert({
          customer_name: input.customer_name,
          payment_method: input.payment_method as PaymentMethod,
          subtotal,
          vat_total,
          total,
          notes: null,
        })
        .select()
        .single()
      if (saleErr) throw new Error(saleErr.message)

      const { error: itemsErr } = await supabase.from('sale_items').insert(
        input.items.map((i) => ({
          sale_id: sale.id,
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
        }))
      )
      if (itemsErr) throw new Error(itemsErr.message)

      await createStockMovementsForLines(input.items, {
        movement_type: 'out',
        reference_type: 'sale',
        reference_id: sale.id,
      })

      return sale as Sale
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: SaleInput & { id: string }) => {
      const { subtotal, vat_total, total } = computeTotals(input.items)
      const { data: sale, error: saleErr } = await supabase
        .from('sales')
        .update({
          customer_name: input.customer_name,
          payment_method: input.payment_method as PaymentMethod,
          subtotal,
          vat_total,
          total,
        })
        .eq('id', id)
        .select()
        .single()
      if (saleErr) throw new Error(saleErr.message)

      await removeStockMovementsForReference('sale', id)

      const { error: deleteErr } = await supabase.from('sale_items').delete().eq('sale_id', id)
      if (deleteErr) throw new Error(deleteErr.message)

      const { error: itemsErr } = await supabase.from('sale_items').insert(
        input.items.map((i) => ({
          sale_id: id,
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
        }))
      )
      if (itemsErr) throw new Error(itemsErr.message)

      await createStockMovementsForLines(input.items, {
        movement_type: 'out',
        reference_type: 'sale',
        reference_id: id,
      })

      return sale as Sale
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await reverseStockMovementsForReference('sale', id)
      const { error } = await supabase
        .from('sales')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useRestoreSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sales')
        .update({ deleted_at: null })
        .eq('id', id)
      if (error) throw new Error(error.message)
      await reapplyStockMovementsForReference('sale', id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
