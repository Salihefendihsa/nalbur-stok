import { Package, AlertTriangle, ShoppingCart, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import Header from '@/components/layout/Header'
import { formatCurrency } from '@/utils/format'

interface KpiCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: { value: number; label: string }
  accent?: boolean
  loading?: boolean
}

function KpiCard({ title, value, icon, trend, accent, loading }: KpiCardProps) {
  if (loading) {
    return (
      <div className="kpi-card">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-8 w-32 mt-2" />
        <div className="skeleton h-3 w-20 mt-1" />
      </div>
    )
  }
  return (
    <div className={`kpi-card ${accent ? 'border-primary-200' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 font-medium">{title}</span>
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent ? 'text-primary-600' : 'text-gray-500 bg-gray-100'}`}
          style={accent ? { backgroundColor: 'var(--color-primary-50)' } : {}}>
          {icon}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trend.value >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend.value >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          <span>{Math.abs(trend.value)}%</span>
          <span className="text-gray-400 font-normal">{trend.label}</span>
        </div>
      )}
    </div>
  )
}

const kpis = [
  {
    title: 'Toplam Ürün',
    value: '—',
    icon: <Package className="w-4.5 h-4.5" />,
    trend: undefined,
  },
  {
    title: 'Kritik Stok',
    value: '—',
    icon: <AlertTriangle className="w-4.5 h-4.5" />,
    trend: undefined,
  },
  {
    title: "Bugünkü Satış",
    value: formatCurrency(0),
    icon: <ShoppingCart className="w-4.5 h-4.5" />,
    trend: undefined,
    accent: true,
  },
  {
    title: 'Stok Değeri',
    value: formatCurrency(0),
    icon: <TrendingUp className="w-4.5 h-4.5" />,
    trend: undefined,
  },
]

export default function Dashboard() {
  return (
    <div className="flex flex-col">
      <Header title="Dashboard" subtitle="Stok yönetim sistemine hoş geldiniz" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {kpis.map((kpi, i) => (
            <KpiCard key={i} {...kpi} />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 card p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Son Hareketler</h3>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton h-3 w-3 rounded-full" />
                  <div className="skeleton h-3 flex-1" />
                  <div className="skeleton h-3 w-20" />
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Kritik Stoklar</h3>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="skeleton h-3 w-28" />
                  <div className="skeleton h-5 w-12 rounded-md" />
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">Supabase bağlantısı kurulduktan sonra veriler yüklenecek</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
