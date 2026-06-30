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
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/urunler', label: 'Ürünler', icon: Package },
  { to: '/kategoriler', label: 'Kategoriler', icon: Tag },
  { to: '/tedarikciler', label: 'Tedarikçiler', icon: Truck },
  { to: '/satis', label: 'Satış', icon: ShoppingCart },
  { to: '/alis', label: 'Alış', icon: ArrowDownToLine },
  { to: '/hareketler', label: 'Hareketler', icon: ArrowRightLeft },
  { to: '/raporlar', label: 'Raporlar', icon: BarChart3 },
  { to: '/ayarlar', label: 'Ayarlar', icon: Settings },
]

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-gray-200">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary-500)' }}>
          <Wrench className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 leading-none">Nalbur Stok</p>
          <p className="text-xs text-gray-400 mt-0.5">Yönetim Sistemi</p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `sidebar-link${isActive ? ' active' : ''}`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-200">
        <p className="text-xs text-gray-400 text-center">v1.0.0</p>
      </div>
    </aside>
  )
}
