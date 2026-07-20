import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Purchase } from '@/types/database'
import {
  createStockMovementsForLines,
  removeStockMovementsForReference,
  reverseStockMovementsForReference,
  reapplyStockMovementsForReference,
} from './stockHelpers'

export type PurchaseLineItemInput = {
  product_id: string
  quantity: number
  unit_price: number
}

export type PurchaseInput = {
  supplier_id: string | null
  invoice_no: string | null
  items: PurchaseLineItemInput[]
}

function computeTotal(items: PurchaseLineItemInput[]) {
  return items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
}

export function usePurchases() {
  return useQuery({
    queryKey: ['purchases', 'list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchases')
        .select('*, supplier:suppliers(id,name), items:purchase_items(*, product:products(id,name,unit))')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(500)
      if (error) throw new Error(error.message)
      return (data ?? []) as Purchase[]
    },
  })
}

export function useDeletedPurchases(enabled = true) {
  return useQuery({
    queryKey: ['purchases', 'deleted'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchases')
        .select('*, supplier:suppliers(id,name), items:purchase_items(*, product:products(id,name,unit))')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as Purchase[]
    },
    enabled,
  })
}

export function useCreatePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: PurchaseInput) => {
      const total = computeTotal(input.items)
      const { data: purchase, error: purchaseErr } = await supabase
        .from('purchases')
        .insert({ supplier_id: input.supplier_id, invoice_no: input.invoice_no, total })
        .select()
        .single()
      if (purchaseErr) throw new Error(purchaseErr.message)

      const { error: itemsErr } = await supabase.from('purchase_items').insert(
        input.items.map((i) => ({
          purchase_id: purchase.id,
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total: i.quantity * i.unit_price,
        }))
      )
      if (itemsErr) throw new Error(itemsErr.message)

      await createStockMovementsForLines(input.items, {
        movement_type: 'in',
        reference_type: 'purchase',
        reference_id: purchase.id,
      })

      return purchase as Purchase
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdatePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: PurchaseInput & { id: string }) => {
      const total = computeTotal(input.items)
      const { data: purchase, error: purchaseErr } = await supabase
        .from('purchases')
        .update({ supplier_id: input.supplier_id, invoice_no: input.invoice_no, total })
        .eq('id', id)
        .select()
        .single()
      if (purchaseErr) throw new Error(purchaseErr.message)

      await removeStockMovementsForReference('purchase', id)

      const { error: deleteErr } = await supabase.from('purchase_items').delete().eq('purchase_id', id)
      if (deleteErr) throw new Error(deleteErr.message)

      const { error: itemsErr } = await supabase.from('purchase_items').insert(
        input.items.map((i) => ({
          purchase_id: id,
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total: i.quantity * i.unit_price,
        }))
      )
      if (itemsErr) throw new Error(itemsErr.message)

      await createStockMovementsForLines(input.items, {
        movement_type: 'in',
        reference_type: 'purchase',
        reference_id: id,
      })

      return purchase as Purchase
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeletePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await reverseStockMovementsForReference('purchase', id)
      const { error } = await supabase
        .from('purchases')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useRestorePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('purchases')
        .update({ deleted_at: null })
        .eq('id', id)
      if (error) throw new Error(error.message)
      await reapplyStockMovementsForReference('purchase', id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
