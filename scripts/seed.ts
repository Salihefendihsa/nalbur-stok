import { createClient } from '@supabase/supabase-js'

process.loadEnvFile(new URL('../.env', import.meta.url))

const supabaseUrl = process.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing in .env')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function main() {
  console.log('Seeding nalbur stok verileri...\n')

  // ---------- Categories ----------
  const rootCategoryDefs = [
    { name: 'Vidalar', sort_order: 1 },
    { name: 'Çiviler', sort_order: 2 },
    { name: 'Boya & Kimyasal', sort_order: 3 },
    { name: 'El Aletleri', sort_order: 4 },
    { name: 'Hırdavat', sort_order: 5 },
  ]
  const { data: rootCategories, error: rootCatErr } = await supabase
    .from('categories')
    .insert(rootCategoryDefs)
    .select()
  if (rootCatErr) throw rootCatErr

  const vidalar = rootCategories!.find((c) => c.name === 'Vidalar')!
  const childCategoryDefs = [
    { name: 'Ahşap Vidası', parent_id: vidalar.id, sort_order: 1 },
    { name: 'Metal Vidası', parent_id: vidalar.id, sort_order: 2 },
  ]
  const { data: childCategories, error: childCatErr } = await supabase
    .from('categories')
    .insert(childCategoryDefs)
    .select()
  if (childCatErr) throw childCatErr

  const categories = [...rootCategories!, ...childCategories!]
  const catByName = (name: string) => categories.find((c) => c.name === name)!.id
  console.log(`✔ ${categories.length} kategori eklendi`)

  // ---------- Suppliers ----------
  const supplierDefs = [
    {
      name: 'Anadolu Hırdavat Toptan Tic. Ltd. Şti.',
      phone: '0212 555 12 34',
      email: 'info@anadoluhirdavat.com.tr',
      address: 'İkitelli OSB, Hırdavatçılar Sanayi Sitesi No:45, Başakşehir/İstanbul',
      tax_no: '1234567890',
      notes: 'Vida ve çivi ana tedarikçisi, aylık cari hesap',
    },
    {
      name: 'Marmara Boya Kimyasal San. A.Ş.',
      phone: '0224 444 56 78',
      email: 'satis@marmaraboya.com.tr',
      address: 'Nilüfer OSB, Kimya Cad. No:12, Nilüfer/Bursa',
      tax_no: '2345678901',
      notes: 'Boya, tiner ve yapı kimyasalları',
    },
    {
      name: 'Karadeniz El Aletleri Dağıtım Ltd. Şti.',
      phone: '0362 333 90 21',
      email: 'destek@karadenizelaletleri.com',
      address: 'Kutlukent Mah. Sanayi Sok. No:8, İlkadım/Samsun',
      tax_no: '3456789012',
      notes: 'El aletleri ve hırdavat malzemesi tedarikçisi',
    },
  ]
  const { data: suppliers, error: supErr } = await supabase
    .from('suppliers')
    .insert(supplierDefs)
    .select()
  if (supErr) throw supErr
  console.log(`✔ ${suppliers!.length} tedarikçi eklendi`)

  const [anadolu, marmara, karadeniz] = suppliers!

  // ---------- Products ----------
  const productDefs = [
    { sku: 'NAL-0001', barcode: '8690000000011', name: 'Ahşap Vidası 3.5x30mm (100 Adet)', category: 'Ahşap Vidası', supplier: anadolu.id, unit: 'paket', current_stock: 150, min_stock: 30, purchase_price: 28.5, sale_price: 45.9 },
    { sku: 'NAL-0002', barcode: '8690000000028', name: 'Ahşap Vidası 4x40mm (100 Adet)', category: 'Ahşap Vidası', supplier: anadolu.id, unit: 'paket', current_stock: 12, min_stock: 25, purchase_price: 32.0, sale_price: 52.5 },
    { sku: 'NAL-0003', barcode: '8690000000035', name: 'Metal Vidası 4.2x25mm (100 Adet)', category: 'Metal Vidası', supplier: anadolu.id, unit: 'paket', current_stock: 80, min_stock: 20, purchase_price: 35.0, sale_price: 58.0 },
    { sku: 'NAL-0004', barcode: '8690000000042', name: 'Alçıpan Vidası 3.5x25mm (500 Adet)', category: 'Metal Vidası', supplier: anadolu.id, unit: 'kutu', current_stock: 8, min_stock: 15, purchase_price: 65.0, sale_price: 99.9 },
    { sku: 'NAL-0005', barcode: '8690000000059', name: 'Çivi 2.5x50mm (1 Kg)', category: 'Çiviler', supplier: anadolu.id, unit: 'kg', current_stock: 200, min_stock: 40, purchase_price: 42.0, sale_price: 68.0 },
    { sku: 'NAL-0006', barcode: '8690000000066', name: 'Çivi 3x70mm (1 Kg)', category: 'Çiviler', supplier: anadolu.id, unit: 'kg', current_stock: 18, min_stock: 30, purchase_price: 44.0, sale_price: 71.0 },
    { sku: 'NAL-0007', barcode: '8690000000073', name: 'Beton Çivisi 4x80mm (1 Kg)', category: 'Çiviler', supplier: karadeniz.id, unit: 'kg', current_stock: 95, min_stock: 20, purchase_price: 55.0, sale_price: 89.0 },
    { sku: 'NAL-0008', barcode: '8690000000080', name: 'İç Cephe Su Bazlı Boya Beyaz (15 Lt)', category: 'Boya & Kimyasal', supplier: marmara.id, unit: 'teneke', current_stock: 25, min_stock: 8, purchase_price: 890.0, sale_price: 1350.0 },
    { sku: 'NAL-0009', barcode: '8690000000097', name: 'Dış Cephe Silikonlu Boya (20 Lt)', category: 'Boya & Kimyasal', supplier: marmara.id, unit: 'teneke', current_stock: 6, min_stock: 6, purchase_price: 1450.0, sale_price: 2199.0 },
    { sku: 'NAL-0010', barcode: '8690000000103', name: 'Sentetik Tiner (5 Lt)', category: 'Boya & Kimyasal', supplier: marmara.id, unit: 'teneke', current_stock: 40, min_stock: 10, purchase_price: 210.0, sale_price: 349.0 },
    { sku: 'NAL-0011', barcode: '8690000000110', name: 'Silikon Yapıştırıcı Şeffaf (280ml)', category: 'Boya & Kimyasal', supplier: marmara.id, unit: 'adet', current_stock: 3, min_stock: 15, purchase_price: 65.0, sale_price: 109.0 },
    { sku: 'NAL-0012', barcode: '8690000000127', name: 'Poliüretan Köpük (750ml)', category: 'Boya & Kimyasal', supplier: marmara.id, unit: 'adet', current_stock: 55, min_stock: 12, purchase_price: 145.0, sale_price: 229.0 },
    { sku: 'NAL-0013', barcode: '8690000000134', name: 'Çekiç 500gr Ahşap Saplı', category: 'El Aletleri', supplier: karadeniz.id, unit: 'adet', current_stock: 22, min_stock: 6, purchase_price: 165.0, sale_price: 279.0 },
    { sku: 'NAL-0014', barcode: '8690000000141', name: 'Yıldız Tornavida Seti (6 Parça)', category: 'El Aletleri', supplier: karadeniz.id, unit: 'set', current_stock: 4, min_stock: 8, purchase_price: 220.0, sale_price: 359.0 },
    { sku: 'NAL-0015', barcode: '8690000000158', name: 'Kombine Pense 8 inç', category: 'El Aletleri', supplier: karadeniz.id, unit: 'adet', current_stock: 30, min_stock: 8, purchase_price: 145.0, sale_price: 249.0 },
    { sku: 'NAL-0016', barcode: '8690000000165', name: 'Şerit Metre 5m', category: 'El Aletleri', supplier: karadeniz.id, unit: 'adet', current_stock: 60, min_stock: 15, purchase_price: 85.0, sale_price: 139.0 },
    { sku: 'NAL-0017', barcode: '8690000000172', name: 'Su Terazisi 40cm', category: 'El Aletleri', supplier: karadeniz.id, unit: 'adet', current_stock: 5, min_stock: 10, purchase_price: 175.0, sale_price: 289.0 },
    { sku: 'NAL-0018', barcode: '8690000000189', name: 'Asma Kilit 50mm Pirinç', category: 'Hırdavat', supplier: anadolu.id, unit: 'adet', current_stock: 45, min_stock: 12, purchase_price: 95.0, sale_price: 159.0 },
    { sku: 'NAL-0019', barcode: '8690000000196', name: 'Menteşe 100mm Paslanmaz (Çift)', category: 'Hırdavat', supplier: anadolu.id, unit: 'çift', current_stock: 70, min_stock: 20, purchase_price: 55.0, sale_price: 89.0 },
    { sku: 'NAL-0020', barcode: '8690000000202', name: 'Kapı Kolu Takımı Krom', category: 'Hırdavat', supplier: anadolu.id, unit: 'takım', current_stock: 2, min_stock: 5, purchase_price: 320.0, sale_price: 499.0 },
  ]

  const productsToInsert = productDefs.map((p) => ({
    sku: p.sku,
    barcode: p.barcode,
    name: p.name,
    description: null,
    category_id: catByName(p.category),
    supplier_id: p.supplier,
    unit: p.unit,
    current_stock: p.current_stock,
    min_stock: p.min_stock,
    purchase_price: p.purchase_price,
    sale_price: p.sale_price,
    vat_rate: 20,
    is_active: true,
  }))

  const { data: products, error: prodErr } = await supabase
    .from('products')
    .insert(productsToInsert)
    .select()
  if (prodErr) throw prodErr
  console.log(`✔ ${products!.length} ürün eklendi`)

  // ---------- Stock movements ----------
  const movementDefs = [
    { sku: 'NAL-0001', type: 'in', qty: 50, note: 'Tedarikçiden teslim alındı' },
    { sku: 'NAL-0002', type: 'out', qty: 8, note: 'Perakende satış' },
    { sku: 'NAL-0003', type: 'in', qty: 40, note: 'Stok takviyesi' },
    { sku: 'NAL-0005', type: 'out', qty: 15, note: 'Toptan satış' },
    { sku: 'NAL-0006', type: 'out', qty: 5, note: 'Perakende satış' },
    { sku: 'NAL-0008', type: 'in', qty: 10, note: 'Tedarikçiden teslim alındı' },
    { sku: 'NAL-0009', type: 'out', qty: 3, note: 'Şantiye siparişi' },
    { sku: 'NAL-0013', type: 'in', qty: 12, note: 'Stok takviyesi' },
    { sku: 'NAL-0017', type: 'out', qty: 2, note: 'Perakende satış' },
    { sku: 'NAL-0020', type: 'adjustment', qty: 1, note: 'Sayım düzeltmesi' },
  ] as const

  const prodBySku = (sku: string) => products!.find((p) => p.sku === sku)!

  const movementsToInsert = movementDefs.map((m) => {
    const product = prodBySku(m.sku)
    const before = product.current_stock
    const after = m.type === 'in' ? before + m.qty : m.type === 'out' ? before - m.qty : before
    return {
      product_id: product.id,
      movement_type: m.type,
      quantity: m.qty,
      unit_price: m.type === 'in' ? product.purchase_price : product.sale_price,
      total: m.qty * (m.type === 'in' ? product.purchase_price : product.sale_price),
      reference_type: 'manual',
      reference_id: null,
      stock_before: before,
      stock_after: after,
      note: m.note,
    }
  })

  const { data: movements, error: movErr } = await supabase
    .from('stock_movements')
    .insert(movementsToInsert)
    .select()
  if (movErr) throw movErr
  console.log(`✔ ${movements!.length} stok hareketi eklendi`)

  // ---------- Sales ----------
  const saleDefs = [
    {
      customer_name: 'Yılmaz İnşaat',
      payment_method: 'nakit',
      items: [
        { sku: 'NAL-0001', qty: 3 },
        { sku: 'NAL-0005', qty: 2 },
      ],
    },
    {
      customer_name: 'Kaan Usta',
      payment_method: 'kredi kartı',
      items: [
        { sku: 'NAL-0013', qty: 1 },
        { sku: 'NAL-0016', qty: 2 },
      ],
    },
    {
      customer_name: null,
      payment_method: 'nakit',
      items: [{ sku: 'NAL-0008', qty: 1 }],
    },
  ]

  let salesInserted = 0
  let saleItemsInserted = 0
  for (const s of saleDefs) {
    const lineItems = s.items.map((i) => {
      const product = prodBySku(i.sku)
      const total = product.sale_price * i.qty
      return { product_id: product.id, quantity: i.qty, unit_price: product.sale_price, total }
    })
    const subtotal = lineItems.reduce((sum, li) => sum + li.total, 0)
    const vat_total = Math.round(subtotal * 0.2 * 100) / 100
    const total = subtotal + vat_total

    const { data: sale, error: saleErr } = await supabase
      .from('sales')
      .insert({
        customer_name: s.customer_name,
        payment_method: s.payment_method,
        subtotal,
        vat_total,
        total,
        notes: null,
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

  // ---------- Purchases ----------
  const purchaseDefs = [
    {
      supplier_id: anadolu.id,
      invoice_no: 'FTR-2026-0451',
      items: [
        { sku: 'NAL-0001', qty: 100 },
        { sku: 'NAL-0003', qty: 60 },
      ],
    },
    {
      supplier_id: marmara.id,
      invoice_no: 'FTR-2026-0452',
      items: [
        { sku: 'NAL-0008', qty: 15 },
        { sku: 'NAL-0010', qty: 20 },
      ],
    },
  ]

  let purchasesInserted = 0
  let purchaseItemsInserted = 0
  for (const p of purchaseDefs) {
    const lineItems = p.items.map((i) => {
      const product = prodBySku(i.sku)
      const total = product.purchase_price * i.qty
      return { product_id: product.id, quantity: i.qty, unit_price: product.purchase_price, total }
    })
    const total = lineItems.reduce((sum, li) => sum + li.total, 0)

    const { data: purchase, error: purchaseErr } = await supabase
      .from('purchases')
      .insert({ supplier_id: p.supplier_id, invoice_no: p.invoice_no, total, notes: null })
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
    'categories',
    'suppliers',
    'products',
    'stock_movements',
    'sales',
    'sale_items',
    'purchases',
    'purchase_items',
  ] as const

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
    if (error) throw error
    console.log(`  ${table}: ${count}`)
  }

  console.log('\nSeed işlemi tamamlandı.')
}

main().catch((err) => {
  console.error('Seed hatası:', err)
  process.exit(1)
})
