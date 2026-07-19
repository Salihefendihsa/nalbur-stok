import { Bell, Search } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="h-16 border-b border-gray-200 bg-white/80 backdrop-blur px-6 flex items-center justify-between shrink-0 sticky top-0 z-10">
      <div>
        <h1 className="page-title-gradient text-lg font-bold leading-none tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <button className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
          <Search className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
