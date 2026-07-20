import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from '@/components/layout/Layout'
import Dashboard from '@/pages/Dashboard'
import Products from '@/pages/Products'
import ProductDetail from '@/pages/ProductDetail'
import ProductForm from '@/pages/ProductForm'
import Categories from '@/pages/Categories'
import Suppliers from '@/pages/Suppliers'
import SupplierDetail from '@/pages/SupplierDetail'
import StockMovements from '@/pages/StockMovements'
import Sales from '@/pages/Sales'
import Purchases from '@/pages/Purchases'
import Reports from '@/pages/Reports'
import Settings from '@/pages/Settings'
import UserGuide from '@/pages/UserGuide'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="urunler" element={<Products />} />
            <Route path="urunler/yeni" element={<ProductForm />} />
            <Route path="urunler/:id" element={<ProductDetail />} />
            <Route path="urunler/:id/duzenle" element={<ProductForm />} />
            <Route path="kategoriler" element={<Categories />} />
            <Route path="tedarikciler" element={<Suppliers />} />
            <Route path="tedarikciler/:id" element={<SupplierDetail />} />
            <Route path="satis" element={<Sales />} />
            <Route path="alis" element={<Purchases />} />
            <Route path="hareketler" element={<StockMovements />} />
            <Route path="raporlar" element={<Reports />} />
            <Route path="kilavuz" element={<UserGuide />} />
            <Route path="ayarlar" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
