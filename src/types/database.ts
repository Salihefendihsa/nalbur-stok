export interface Category {
  id: string
  name: string
  parent_id: string | null
  sort_order: number
  created_at: string
  deleted_at: string | null
}

export interface Supplier {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  tax_no: string | null
  notes: string | null
  created_at: string
  deleted_at: string | null
}

export interface Product {
  id: string
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
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  category?: Category
  supplier?: Supplier
}

export type MovementType = 'in' | 'out' | 'adjustment'

export interface StockMovement {
  id: string
  product_id: string
  movement_type: MovementType
  quantity: number
  unit_price: number | null
  total: number | null
  reference_type: string | null
  reference_id: string | null
  stock_before: number | null
  stock_after: number | null
  note: string | null
  created_at: string
  deleted_at: string | null
  product?: Product
}

export interface Purchase {
  id: string
  supplier_id: string | null
  invoice_no: string | null
  total: number
  notes: string | null
  created_at: string
  deleted_at: string | null
  supplier?: Supplier
  items?: PurchaseItem[]
}

export interface PurchaseItem {
  id: string
  purchase_id: string
  product_id: string
  quantity: number
  unit_price: number
  total: number
  product?: Product
}

export interface Sale {
  id: string
  customer_name: string | null
  payment_method: string
  subtotal: number
  vat_total: number
  total: number
  notes: string | null
  created_at: string
  deleted_at: string | null
  items?: SaleItem[]
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  total: number
  product?: Product
}

export interface DashboardStats {
  totalProducts: number
  lowStockCount: number
  todaySales: number
  stockValue: number
}
