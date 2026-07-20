import { Bell, Menu, Search } from 'lucide-react'
import { useMobileNavStore } from '@/store/mobileNav'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  const toggleMobileNav = useMobileNavStore((s) => s.toggle)

  return (
    <header className="min-h-16 border-b border-gray-200 bg-white/80 backdrop-blur px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 flex-wrap shrink-0 sticky top-0 z-10">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={toggleMobileNav}
          className="md:hidden w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors shrink-0"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h1 className="page-title-gradient text-base sm:text-lg font-bold leading-none tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500 mt-1 truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
        {actions}
        <button className="hidden sm:flex w-8 h-8 rounded-lg border border-gray-200 items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
          <Search className="w-4 h-4" />
        </button>
        <button className="hidden sm:flex w-8 h-8 rounded-lg border border-gray-200 items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
