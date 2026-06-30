import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { StockMovement } from '@/types/database'

export function useProductMovements(productId: string) {
  return useQuery({
    queryKey: ['movements', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw new Error(error.message)
      return (data ?? []) as StockMovement[]
    },
    enabled: !!productId,
  })
}
