import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Wrench } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function Login() {
  const session = useAuthStore((s) => s.session)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (session) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError('E-posta veya şifre hatalı.')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #0f172a 0%, #131c31 55%, #0f172a 100%)',
        padding: '1.5rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <div
            style={{
              width: '3rem', height: '3rem', borderRadius: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, var(--color-primary-400), var(--color-primary-600))',
              boxShadow: '0 4px 14px 0 rgb(249 115 22 / 0.5)',
            }}
          >
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'white', letterSpacing: '-0.01em' }}>Nalbur Stok</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#94a3b8' }}>Yönetim Sistemi</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="card"
          style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'white' }}
        >
          <Input
            label="E-posta"
            type="email"
            autoFocus
            required
            placeholder="ornek@nalbur.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Şifre"
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p style={{ margin: 0, fontSize: '0.8125rem', color: '#dc2626' }}>{error}</p>}
          <Button type="submit" loading={loading} style={{ width: '100%', justifyContent: 'center' }}>
            Giriş Yap
          </Button>
        </form>
      </div>
    </div>
  )
}
