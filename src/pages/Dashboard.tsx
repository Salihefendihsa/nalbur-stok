import { Package, AlertTriangle, ShoppingCart, TrendingUp, ArrowRightLeft } from 'lucide-react'
import Header from '@/components/layout/Header'
import PageSkeleton from '@/components/ui/PageSkeleton'
import { useDashboardData } from '@/lib/queries/dashboard'
import { formatCurrency, formatStock, formatDateTime } from '@/utils/format'

interface KpiCardProps {
  title: string
  value: string
  icon: React.ReactNode
  accentColor: string
  hint?: string
}

function KpiCard({ title, value, icon, accentColor, hint }: KpiCardProps) {
  return (
    <div className="kpi-card" style={{ ['--kpi-accent' as string]: accentColor }}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 font-medium">{title}</span>
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
        >
          {icon}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      <svg className="mt-1 w-full h-8 opacity-70" viewBox="0 0 100 24" preserveAspectRatio="none">
        <polyline
          points="0,18 15,14 30,16 45,9 60,11 75,5 90,7 100,3"
          fill="none"
          stroke={accentColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']

function greeting(hour: number): string {
  if (hour < 6) return 'İyi geceler'
  if (hour < 12) return 'Günaydın'
  if (hour < 18) return 'İyi günler'
  return 'İyi akşamlar'
}

export default function Dashboard() {
  const { data, isLoading, error } = useDashboardData()
  const now = new Date()

  return (
    <div className="flex flex-col">
      <Header title="Dashboard" subtitle="Stok yönetim sistemine hoş geldiniz" />

      {isLoading ? (
        <PageSkeleton />
      ) : error ? (
        <div className="p-6">
          <div className="card p-6 text-sm text-red-500">
            Veri yüklenemedi: {(error as Error).message}
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-6" style={{ animation: 'fade-in-up 300ms ease' }}>
          <div
            className="rounded-2xl p-6 flex items-center justify-between text-white"
            style={{
              background: 'linear-gradient(135deg, #0f172a, #1e293b 60%, var(--color-primary-700))',
              boxShadow: '0 8px 30px -8px rgb(15 23 42 / 0.4)',
            }}
          >
            <div>
              <p className="text-lg font-semibold">
                {greeting(now.getHours())}, hoş geldiniz 👋
              </p>
              <p className="text-sm text-slate-300 mt-1">
                {WEEKDAYS[now.getDay()]}, {formatDateTime(now.toISOString())}
              </p>
            </div>
            <div className="hidden sm:flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10">
              <TrendingUp className="w-7 h-7" />
            </div>
          </div>

          {data && data.lowStockCount > 0 && (
            <div
              className="rounded-xl border px-4 py-3 flex items-center gap-3"
              style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}
            >
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">
                <span className="font-semibold">{data.lowStockCount} ürün</span> kritik stok
                seviyesinin altında. Stok takviyesi yapmanız önerilir.
              </p>
            </div>
          )}

          <div className="grid grid-cols-4 gap-4">
            <KpiCard
              title="Toplam Ürün"
              value={(data?.totalProducts ?? 0).toLocaleString('tr-TR')}
              icon={<Package className="w-4.5 h-4.5" />}
              accentColor="#3b82f6"
            />
            <KpiCard
              title="Kritik Stok"
              value={(data?.lowStockCount ?? 0).toLocaleString('tr-TR')}
              icon={<AlertTriangle className="w-4.5 h-4.5" />}
              accentColor="#ef4444"
              hint={data && data.lowStockCount > 0 ? 'Takviye gerekli' : 'Her şey yolunda'}
            />
            <KpiCard
              title="Bugünkü Satış"
              value={formatCurrency(data?.todaySalesTotal ?? 0)}
              icon={<ShoppingCart className="w-4.5 h-4.5" />}
              accentColor="#f97316"
            />
            <KpiCard
              title="Stok Değeri"
              value={formatCurrency(data?.stockValue ?? 0)}
              icon={<TrendingUp className="w-4.5 h-4.5" />}
              accentColor="#16a34a"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 card p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Son Hareketler</h3>
              {data && data.recentMovements.length > 0 ? (
                <div className="space-y-1">
                  {data.recentMovements.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: m.movement_type === 'in' ? '#f0fdf4' : '#fef2f2',
                          color: m.movement_type === 'in' ? '#16a34a' : '#dc2626',
                        }}
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </span>
                      <span className="flex-1 text-sm text-gray-700 truncate">
                        {m.product?.name ?? 'Ürün'}
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          m.movement_type === 'in' ? 'text-green-600' : 'text-red-500'
                        }`}
                      >
                        {m.movement_type === 'in' ? '+' : '-'}
                        {formatStock(m.quantity, m.product?.unit ?? 'adet')}
                      </span>
                      <span className="text-xs text-gray-400 w-24 text-right shrink-0">
                        {formatDateTime(m.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">Henüz hareket kaydı yok.</p>
              )}
            </div>

            <div className="card p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Kritik Stoklar</h3>
              {data && data.lowStockProducts.length > 0 ? (
                <div className="space-y-3">
                  {data.lowStockProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-gray-700 truncate">{p.name}</span>
                      <span className="badge-red shrink-0">{formatStock(p.current_stock, p.unit)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">Kritik stokta ürün yok.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
