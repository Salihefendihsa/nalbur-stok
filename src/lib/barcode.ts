// =============================================================================
// src/lib/barcode.ts — Barkod arama yardımcıları
//
//  • findProductByBarcode → Supabase'de barkodla ürün arar
//  • lookupOpenFoodFacts  → Ürün bizim veritabanımızda yoksa, ücretsiz
//    Open Food Facts API'sinden isim/marka bilgisi çekmeyi dener
// =============================================================================

import { supabase } from '@/lib/supabase'
import type { Product } from '@/types/database'

const PRODUCT_SELECT = `
  *,
  category:categories(id, name),
  supplier:suppliers(id, name)
` as const

/**
 * Verilen barkoda sahip (silinmemiş) ürünü döner, yoksa null.
 */
export async function findProductByBarcode(barcode: string): Promise<Product | null> {
  const trimmed = barcode.trim()
  if (!trimmed) return null

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('barcode', trimmed)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as Product | null
}

export interface OpenFoodFactsResult {
  name: string | null
  brand: string | null
}

/**
 * Open Food Facts üzerinden barkod arar. Ürün nalbiye/hırdavat kalemi olduğu
 * için çoğu zaman sonuç bulunmaz — bu durumda null döner, hata fırlatmaz.
 */
export async function lookupOpenFoodFacts(barcode: string): Promise<OpenFoodFactsResult | null> {
  const trimmed = barcode.trim()
  if (!trimmed) return null

  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(trimmed)}.json`)
    if (!res.ok) return null
    const json = await res.json()
    if (json.status !== 1 || !json.product) return null

    const name = (json.product.product_name || json.product.product_name_tr || '').trim() || null
    const brand = (json.product.brands || '').trim() || null
    if (!name && !brand) return null

    return { name, brand }
  } catch {
    return null
  }
}
