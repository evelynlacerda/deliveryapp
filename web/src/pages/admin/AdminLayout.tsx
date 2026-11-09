import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  CircleDollarSign,
  ExternalLink,
  Clock,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  QrCode,
  Settings,
  Soup,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Brand } from '@/components/brand'
import { NewOrderAlerts } from '@/components/new-order-alerts'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth'

const navItems: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/admin/dashboard', label: 'Pedidos', icon: LayoutDashboard },
  { to: '/admin/sabores', label: 'Sabores', icon: Soup },
  { to: '/admin/precos', label: 'Preços e entrega', icon: CircleDollarSign },
  { to: '/admin/funcionamento', label: 'Funcionamento', icon: Clock },
  { to: '/admin/pix', label: 'Pix e contato', icon: QrCode },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
]

const COLLAPSED_KEY = 'deliveryApp:sidebarRecolhida'

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

function pageTitle(pathname: string) {
  if (pathname.includes('/pedidos/')) return 'Detalhes do pedido'
  return navItems.find((i) => pathname.startsWith(i.to))?.label ?? 'Admin'
}

export default function AdminLayout() {
  const { isAdmin, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [menuAberto, setMenuAberto] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMenuAberto(false), [location.pathname])
  useEffect(() => {
    if (!menuAberto) return
    const fora = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAberto(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenuAberto(false)
    document.addEventListener('pointerdown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [menuAberto])

  if (!isAdmin) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />

  function sair() {
    logout()
    navigate('/admin/login')
  }

  function toggleSidebar() {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
    } catch {
    }
  }

  return (
    <div className="admin-shell" data-collapsed={collapsed}>
      <aside className="admin-sidebar" aria-label="Barra lateral">
        <Brand to="/admin/dashboard" showName={!collapsed} tema="escuro" />
        <nav className="admin-nav" aria-label="Menu do admin">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className="admin-nav__link" title={collapsed ? label : undefined}>
              <Icon className="size-4 shrink-0" />
              <span className="admin-nav__label">{label}</span>
            </NavLink>
          ))}
          <Link to="/pedido" className="admin-nav__link mt-auto" title={collapsed ? 'Ver página de pedido' : undefined}>
            <ExternalLink className="size-4 shrink-0" />
            <span className="admin-nav__label">Ver página de pedido</span>
          </Link>
        </nav>
        <div className="admin-sidebar__footer">
          <Button variant="ghost" className="admin-nav__button" onClick={sair} title={collapsed ? 'Sair' : undefined}>
            <LogOut />
            <span className="admin-nav__label">Sair</span>
          </Button>
          <Button
            variant="ghost"
            className="admin-nav__button"
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            title={collapsed ? 'Expandir menu' : undefined}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            <span className="admin-nav__label">Recolher menu</span>
          </Button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="admin-topbar">
          <div className="admin-topbar__start">
            <div className="admin-menu" ref={menuRef}>
              <Button
                variant="ghost"
                size="icon"
                aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={menuAberto}
                aria-controls="admin-menu-celular"
                onClick={() => setMenuAberto((v) => !v)}
              >
                {menuAberto ? <X /> : <Menu />}
              </Button>
              {menuAberto && (
                <nav id="admin-menu-celular" className="admin-dropdown" aria-label="Menu do admin">
                  {navItems.map(({ to, label, icon: Icon }) => (
                    <NavLink key={to} to={to} className="admin-nav__link">
                      <Icon className="size-4 shrink-0" /> {label}
                    </NavLink>
                  ))}
                  <Link to="/pedido" className="admin-nav__link">
                    <ExternalLink className="size-4 shrink-0" /> Ver página de pedido
                  </Link>
                  <button type="button" className="admin-nav__link" onClick={sair}>
                    <LogOut className="size-4 shrink-0" /> Sair
                  </button>
                </nav>
              )}
            </div>
            <div className="admin-topbar__brand"><Brand to="/admin/dashboard" /></div>
          </div>
          <h1 className="admin-topbar__title">{pageTitle(location.pathname)}</h1>
          <div className="site-header__actions">
            <NewOrderAlerts />
            <ThemeToggle />
          </div>
        </header>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
