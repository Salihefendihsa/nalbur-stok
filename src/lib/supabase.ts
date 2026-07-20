// =============================================================================
// src/lib/supabase.ts
//
// Tiplendirilmiş Supabase client.
// createClient<Database>() ile generic tip parametresi geçildiğinde
// tüm .from('tablo').select() çağrıları otomatik tür güvenliği sağlar.
// =============================================================================

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// ─── Ortam değişkeni doğrulama ────────────────────────────────────────────────
const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (import.meta.env.DEV) {
  if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
    console.warn(
      '[Supabase] VITE_SUPABASE_URL tanımlı değil veya placeholder değerinde.\n' +
      '.env dosyanızı kontrol edin.'
    )
  }
  if (!supabaseAnonKey || supabaseAnonKey === 'placeholder') {
    console.warn('[Supabase] VITE_SUPABASE_ANON_KEY tanımlı değil veya placeholder değerinde.')
  }
}

// ─── Tiplendirilmiş client ────────────────────────────────────────────────────
/**
 * Projenin tek Supabase client örneği.
 *
 * Generic tip parametresi `Database` sayesinde:
 *   supabase.from('products')   → Products tablosunun Row/Insert/Update tipleri
 *   supabase.from('sales')      → Sales tablosunun Row/Insert/Update tipleri
 *   ... vb. otomatik IntelliSense & tip kontrolü sağlar.
 */
export const supabase = createClient<Database>(
  supabaseUrl     ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder',
  {
    auth: {
      // Supabase Auth token'ını localStorage'da sakla (varsayılan davranış)
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        // Tüm isteklere uygulamanın adını ekle (Supabase dashboard loglarında görünür)
        'x-app-name': 'nalbur-stok',
      },
    },
  }
)

// ─── Tip yardımcıları ─────────────────────────────────────────────────────────
/**
 * Bir tablodan dönen satır tipini kısaca almak için yardımcı.
 * @example
 *   type ProductRow = SupabaseRow<'products'>  // → Database['public']['Tables']['products']['Row']
 */
export type SupabaseRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

/**
 * Bir tabloya Insert yapılacak tipi almak için yardımcı.
 * @example
 *   type NewProduct = SupabaseInsert<'products'>
 */
export type SupabaseInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

/**
 * Bir tabloda Update yapılacak tipi almak için yardımcı.
 * @example
 *   type ProductPatch = SupabaseUpdate<'products'>
 */
export type SupabaseUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
