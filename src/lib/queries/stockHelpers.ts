import { supabase } from '@/lib/supabase'
import type { MovementType } from '@/types/database'

export type StockLine = { product_id: string; quantity: number; unit_price: number }

const OPPOSITE: Record<MovementType, MovementType> = { in: 'out', out: 'in', adjustment: 'adjustment' }

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

async function adjustProductStock(productId: string, type: MovementType, quantity: number) {
  const before = await fetchProductStock(productId)
  const after = computeAfter(type, before, quantity)
  const { error } = await supabase.from('products').update({ current_stock: after }).eq('id', productId)
  if (error) throw new Error(error.message)
  return { before, after }
}

export async function createStockMovementsForLines(
  lines: StockLine[],
  opts: { movement_type: MovementType; reference_type: string; reference_id: string }
) {
  for (const line of lines) {
    const { before, after } = await adjustProductStock(line.product_id, opts.movement_type, line.quantity)

    const { error: moveErr } = await supabase.from('stock_movements').insert({
      product_id: line.product_id,
      movement_type: opts.movement_type,
      quantity: line.quantity,
      unit_price: line.unit_price,
      total: line.quantity * line.unit_price,
      reference_type: opts.reference_type,
      reference_id: opts.reference_id,
      stock_before: before,
      stock_after: after,
    })
    if (moveErr) throw new Error(moveErr.message)
  }
}

type ReferenceMovement = { product_id: string; movement_type: MovementType; quantity: number }

async function fetchReferenceMovements(referenceType: string, referenceId: string, deleted: boolean) {
  let query = supabase
    .from('stock_movements')
    .select('id, product_id, movement_type, quantity')
    .eq('reference_type', referenceType)
    .eq('reference_id', referenceId)
  query = deleted ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as ReferenceMovement[]
}

/** Reverses the stock impact of a reference's movements and hard-deletes them (used when editing a sale/purchase before re-inserting fresh line items). */
export async function removeStockMovementsForReference(referenceType: string, referenceId: string) {
  const movements = await fetchReferenceMovements(referenceType, referenceId, false)
  for (const m of movements) {
    await adjustProductStock(m.product_id, OPPOSITE[m.movement_type], m.quantity)
  }
  const { error } = await supabase
    .from('stock_movements')
    .delete()
    .eq('reference_type', referenceType)
    .eq('reference_id', referenceId)
  if (error) throw new Error(error.message)
}

/** Reverses the stock impact and soft-deletes a reference's movements (used when soft-deleting a sale/purchase). */
export async function reverseStockMovementsForReference(referenceType: string, referenceId: string) {
  const movements = await fetchReferenceMovements(referenceType, referenceId, false)
  for (const m of movements) {
    await adjustProductStock(m.product_id, OPPOSITE[m.movement_type], m.quantity)
  }
  const { error } = await supabase
    .from('stock_movements')
    .update({ deleted_at: new Date().toISOString() })
    .eq('reference_type', referenceType)
    .eq('reference_id', referenceId)
  if (error) throw new Error(error.message)
}

/** Reapplies the stock impact and restores a reference's movements (used when restoring a soft-deleted sale/purchase). */
export async function reapplyStockMovementsForReference(referenceType: string, referenceId: string) {
  const movements = await fetchReferenceMovements(referenceType, referenceId, true)
  for (const m of movements) {
    await adjustProductStock(m.product_id, m.movement_type, m.quantity)
  }
  const { error } = await supabase
    .from('stock_movements')
    .update({ deleted_at: null })
    .eq('reference_type', referenceType)
    .eq('reference_id', referenceId)
  if (error) throw new Error(error.message)
}
