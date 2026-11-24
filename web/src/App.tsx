import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/auth'
import { BrandProvider } from '@/context/brand'
import AdminLayout from '@/pages/admin/AdminLayout'
import DashboardPage from '@/pages/admin/DashboardPage'
import DrinksPage from '@/pages/admin/DrinksPage'
import FlavorsPage from '@/pages/admin/FlavorsPage'
import FuncionamentoPage from '@/pages/admin/FuncionamentoPage'
import LoginPage from '@/pages/admin/LoginPage'
import OrderDetailPage from '@/pages/admin/OrderDetailPage'
import PixPage from '@/pages/admin/PixPage'
import PricingPage from '@/pages/admin/PricingPage'
import SettingsPage from '@/pages/admin/SettingsPage'
import NotFoundPage from '@/pages/NotFoundPage'
import OrderPage from '@/pages/order/OrderPage'
import TrackingPage from '@/pages/order/TrackingPage'

export default function App() {
  return (
    <BrowserRouter>
      <BrandProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/pedido" replace />} />
            <Route path="/pedido" element={<OrderPage />} />
            <Route path="/pedido/:codigo" element={<TrackingPage />} />

            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="pedidos/:codigo" element={<OrderDetailPage />} />
              <Route path="sabores" element={<FlavorsPage />} />
              <Route path="bebidas" element={<DrinksPage />} />
              <Route path="precos" element={<PricingPage />} />
              <Route path="funcionamento" element={<FuncionamentoPage />} />
              <Route path="pix" element={<PixPage />} />
              <Route path="configuracoes" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </BrandProvider>
    </BrowserRouter>
  )
}
