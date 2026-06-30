import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import ToastContainer from '@/components/ui/Toast'

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}
