import { createClient } from '@supabase/supabase-js'

process.loadEnvFile(new URL('../.env', import.meta.url))

const supabaseUrl = process.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing in .env')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

function daysAgo(n: number, hour = 10, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

async function main() {
  console.log('Ek örnek veri ekleniyor...\n')

  const { data: products, error: prodErr } = await supabase.from('products').select('*')
  if (prodErr) throw prodErr
  if (!products || products.length === 0) {
    throw new Error('Ürün bulunamadı. Önce scripts/seed.ts çalıştırılmalı.')
  }
  const { data: suppliers, error: supErr } = await supabase.from('suppliers').select('*')
  if (supErr) throw supErr
  if (!suppliers || suppliers.length === 0) {
    throw new Error('Tedarikçi bulunamadı. Önce scripts/seed.ts çalıştırılmalı.')
  }

  const productAt = (i: number) => products[i % products.length]
  const supplierAt = (i: number) => suppliers[i % suppliers.length]

  // ---------- Stock movements (15, spread over last 30 days) ----------
  const movementNotes = {
    in: ['Tedarikçiden alım', 'Stok takviyesi', 'İade ürün girişi'],
    out: ['Müşteriye satış', 'Toptan satış çıkışı', 'Şantiye siparişi'],
    adjustment: ['Sayım düzeltmesi', 'Hasar düzeltmesi', 'Stok sayım farkı'],
  } as const

  const movementPlan: Array<{ type: 'in' | 'out' | 'adjustment'; day: number; productIdx: number; qty: number }> = [
    { type: 'in', day: 28, productIdx: 0, qty: 30 },
    { type: 'out', day: 27, productIdx: 1, qty: 6 },
    { type: 'out', day: 25, productIdx: 2, qty: 10 },
    { type: 'in', day: 23, productIdx: 3, qty: 20 },
    { type: 'adjustment', day: 21, productIdx: 4, qty: 2 },
    { type: 'out', day: 19, productIdx: 5, qty: 4 },
    { type: 'in', day: 17, productIdx: 6, qty: 25 },
    { type: 'out', day: 15, productIdx: 7, qty: 3 },
    { type: 'in', day: 13, productIdx: 8, qty: 12 },
    { type: 'out', day: 11, productIdx: 9, qty: 8 },
    { type: 'adjustment', day: 9, productIdx: 10, qty: 1 },
    { type: 'in', day: 7, productIdx: 11, qty: 40 },
    { type: 'out', day: 5, productIdx: 12, qty: 5 },
    { type: 'out', day: 3, productIdx: 13, qty: 7 },
    { type: 'in', day: 1, productIdx: 14, qty: 15 },
  ]

  const movementsToInsert = movementPlan.map((m, i) => {
    const product = productAt(m.productIdx)
    const before = product.current_stock
    const after = m.type === 'in' ? before + m.qty : m.type === 'out' ? before - m.qty : before
    const notes = movementNotes[m.type]
    const price = m.type === 'in' ? product.purchase_price : product.sale_price
    return {
      product_id: product.id,
      movement_type: m.type,
      quantity: m.qty,
      unit_price: price,
      total: m.qty * price,
      reference_type: 'manual',
      reference_id: null,
      stock_before: before,
      stock_after: after,
      note: notes[i % notes.length],
      created_at: daysAgo(m.day, 9 + (i % 8)),
    }
  })

  const { data: movements, error: movErr } = await supabase
    .from('stock_movements')
    .insert(movementsToInsert)
    .select()
  if (movErr) throw movErr
  console.log(`✔ ${movements!.length} stok hareketi eklendi`)

  // ---------- Sales (8, with items, spread over last 30 days) ----------
  const customerNames = [
    'Mehmet Yılmaz', 'Ayşe Demir İnşaat', null, 'Kaya Yapı Market',
    'Hasan Usta', null, 'Öz Nalbur Bayii', 'Fatma Kaya',
  ]
  const paymentMethods = ['nakit', 'kredi kartı', 'nakit', 'havale', 'nakit', 'kredi kartı', 'havale', 'nakit']

  let salesInserted = 0
  let saleItemsInserted = 0
  for (let i = 0; i < 8; i++) {
    const itemCount = 1 + (i % 3)
    const lineItems = Array.from({ length: itemCount }, (_, j) => {
      const product = productAt(i * 3 + j)
      const qty = 1 + ((i + j) % 4)
      const total = product.sale_price * qty
      return { product_id: product.id, quantity: qty, unit_price: product.sale_price, total }
    })
    const subtotal = lineItems.reduce((sum, li) => sum + li.total, 0)
    const vat_total = Math.round(subtotal * 0.2 * 100) / 100
    const total = subtotal + vat_total
    const createdAt = daysAgo(29 - i * 4, 9 + i)

    const { data: sale, error: saleErr } = await supabase
      .from('sales')
      .insert({
        customer_name: customerNames[i],
        payment_method: paymentMethods[i],
        subtotal,
        vat_total,
        total,
        notes: null,
        created_at: createdAt,
      })
      .select()
      .single()
    if (saleErr) throw saleErr
    salesInserted++

    const { data: saleItems, error: saleItemErr } = await supabase
      .from('sale_items')
      .insert(lineItems.map((li) => ({ ...li, sale_id: sale.id })))
      .select()
    if (saleItemErr) throw saleItemErr
    saleItemsInserted += saleItems!.length
  }
  console.log(`✔ ${salesInserted} satış, ${saleItemsInserted} satış kalemi eklendi`)

  // ---------- Purchases (5, with items, spread over last 30 days) ----------
  const invoiceNos = ['FTR-2026-0501', 'FTR-2026-0502', 'FTR-2026-0503', 'FTR-2026-0504', 'FTR-2026-0505']

  let purchasesInserted = 0
  let purchaseItemsInserted = 0
  for (let i = 0; i < 5; i++) {
    const itemCount = 1 + (i % 2)
    const lineItems = Array.from({ length: itemCount }, (_, j) => {
      const product = productAt(i * 4 + j + 2)
      const qty = 10 + (i + j) * 5
      const total = product.purchase_price * qty
      return { product_id: product.id, quantity: qty, unit_price: product.purchase_price, total }
    })
    const total = lineItems.reduce((sum, li) => sum + li.total, 0)
    const createdAt = daysAgo(26 - i * 5, 11)

    const { data: purchase, error: purchaseErr } = await supabase
      .from('purchases')
      .insert({
        supplier_id: supplierAt(i).id,
        invoice_no: invoiceNos[i],
        total,
        notes: null,
        created_at: createdAt,
      })
      .select()
      .single()
    if (purchaseErr) throw purchaseErr
    purchasesInserted++

    const { data: purchaseItems, error: purchaseItemErr } = await supabase
      .from('purchase_items')
      .insert(lineItems.map((li) => ({ ...li, purchase_id: purchase.id })))
      .select()
    if (purchaseItemErr) throw purchaseItemErr
    purchaseItemsInserted += purchaseItems!.length
  }
  console.log(`✔ ${purchasesInserted} alış, ${purchaseItemsInserted} alış kalemi eklendi`)

  // ---------- Verify counts ----------
  console.log('\nDoğrulama:')
  const tables = [
    'categories', 'suppliers', 'products', 'stock_movements',
    'sales', 'sale_items', 'purchases', 'purchase_items',
  ] as const

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
    if (error) throw error
    console.log(`  ${table}: ${count}`)
  }

  console.log('\nEk veri ekleme tamamlandı.')
}

main().catch((err) => {
  console.error('Seed hatası:', err)
  process.exit(1)
})
