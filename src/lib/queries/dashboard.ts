import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Product, StockMovement } from '@/types/database'

export interface DashboardData {
  totalProducts: number
  lowStockCount: number
  todaySalesTotal: number
  stockValue: number
  lowStockProducts: Product[]
  recentMovements: StockMovement[]
}

function startOfTodayISO(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async (): Promise<DashboardData> => {
      const [productsRes, todaySalesRes, movementsRes] = await Promise.all([
        supabase
          .from('products')
          .select('*, category:categories(id,name)')
          .is('deleted_at', null)
          .order('name'),
        supabase
          .from('sales')
          .select('total')
          .is('deleted_at', null)
          .gte('created_at', startOfTodayISO()),
        supabase
          .from('stock_movements')
          .select('*, product:products(id,name,unit)')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(6),
      ])

      if (productsRes.error) throw new Error(productsRes.error.message)
      if (todaySalesRes.error) throw new Error(todaySalesRes.error.message)
      if (movementsRes.error) throw new Error(movementsRes.error.message)

      const products = (productsRes.data ?? []) as Product[]
      const lowStockProducts = products.filter((p) => p.current_stock <= p.min_stock)
      const stockValue = products.reduce((sum, p) => sum + p.current_stock * p.purchase_price, 0)
      const todaySalesTotal = (todaySalesRes.data ?? []).reduce(
        (sum, s) => sum + (s.total ?? 0),
        0
      )

      return {
        totalProducts: products.length,
        lowStockCount: lowStockProducts.length,
        todaySalesTotal,
        stockValue,
        lowStockProducts: lowStockProducts.slice(0, 6),
        recentMovements: (movementsRes.data ?? []) as StockMovement[],
      }
    },
  })
}
