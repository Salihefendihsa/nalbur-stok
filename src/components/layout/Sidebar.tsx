import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Tag,
  Truck,
  ShoppingCart,
  ArrowDownToLine,
  ArrowRightLeft,
  BarChart3,
  Settings,
  Wrench,
  BookOpen,
} from 'lucide-react'
import { useProductCount } from '@/lib/queries/products'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/urunler', label: 'Ürünler', icon: Package, badge: 'products' as const },
  { to: '/kategoriler', label: 'Kategoriler', icon: Tag },
  { to: '/tedarikciler', label: 'Tedarikçiler', icon: Truck },
  { to: '/satis', label: 'Satış', icon: ShoppingCart },
  { to: '/alis', label: 'Alış', icon: ArrowDownToLine },
  { to: '/hareketler', label: 'Hareketler', icon: ArrowRightLeft },
  { to: '/raporlar', label: 'Raporlar', icon: BarChart3 },
  { to: '/kilavuz', label: 'Kullanım Kılavuzu', icon: BookOpen },
  { to: '/ayarlar', label: 'Ayarlar', icon: Settings },
]

export default function Sidebar() {
  const { data: productCount } = useProductCount()

  return (
    <aside
      className="w-64 shrink-0 h-screen sticky top-0 flex flex-col text-slate-100"
      style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #131c31 55%, #0f172a 100%)',
        boxShadow: '4px 0 24px -8px rgb(0 0 0 / 0.35)',
      }}
    >
      <div className="flex items-center gap-3 px-5 h-20 border-b border-white/10">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary-400), var(--color-primary-600))',
            boxShadow: '0 4px 14px 0 rgb(249 115 22 / 0.5)',
          }}
        >
          <Wrench className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[0.95rem] font-bold text-white leading-none tracking-tight truncate">
            Nalbur Stok
          </p>
          <p className="text-xs text-slate-400 mt-1">Yönetim Sistemi</p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <Icon className="w-4.5 h-4.5 shrink-0" />
            <span className="flex-1">{label}</span>
            {badge === 'products' && typeof productCount === 'number' && productCount > 0 && (
              <span
                className="text-[0.7rem] font-semibold px-1.5 py-0.5 rounded-md leading-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.14)', color: '#fff' }}
              >
                {productCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <p className="text-xs text-slate-500 text-center">v1.0.0</p>
      </div>
    </aside>
  )
}
