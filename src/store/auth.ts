import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
  session: Session | null
  loading: boolean
  initialized: boolean
  init: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  loading: true,
  initialized: false,
  init: () => {
    if (get().initialized) return
    set({ initialized: true })

    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, loading: false })
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, loading: false })
    })
  },
}))
