import { lazy, Suspense } from 'react'
import { NavLink, Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { useAuth } from './contexts/AuthContext.js'
import AuthPage from './components/AuthPage.jsx'
import Icon from './components/Icon.jsx'

const Dashboard = lazy(() => import('./components/Dashboard.jsx'))
const EntriesPage = lazy(() => import('./components/EntriesPage.jsx'))
const CatalogPage = lazy(() => import('./components/CatalogPage.jsx'))
const ReportsPage = lazy(() => import('./components/ReportsPage.jsx'))
const InvoicesPage = lazy(() => import('./components/InvoicesPage.jsx'))
const HealthPage = lazy(() => import('./components/HealthPage.jsx'))
const links = [
  ['/', 'Visão geral', 'dashboard'],
  ['/lancamentos', 'Lançamentos', 'entries'],
  ['/categorias', 'Categorias', 'category'],
  ['/fontes-destinos', 'Fontes e destinos', 'wallet'],
  ['/relatorios', 'Relatórios', 'chart'],
  ['/faturas', 'Faturas', 'card'],
  ['/saude-financeira', 'Saúde financeira', 'health'],
]

function ProtectedLayout() {
  const { usuario, initializing, logout, notice } = useAuth()
  const location = useLocation()
  if (initializing)
    return (
      <div className="full-loading" role="status">
        Recuperando sua sessão…
      </div>
    )
  if (!usuario) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Ir para o conteúdo
      </a>
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <span className="brand-mark">
            <Icon name="logo" size={24} />
          </span>
          money<span className="brand-light">finder</span>
          <span className="brand-dot">.</span>
        </NavLink>
        <span className="nav-label">SEU DIA A DIA</span>
        <nav aria-label="Navegação principal">
          {links.map(([path, label, icon]) => (
            <NavLink key={path} to={path} end={path === '/'}>
              <Icon name={icon} size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <span>um passo de cada vez.</span>
          <p>O melhor plano é aquele que você consegue acompanhar.</p>
          <Icon name="arrow" size={20} />
        </div>
        <div className="user-menu">
          <span className="avatar">{usuario.nome.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{usuario.nome}</strong>
            <small>Minha conta</small>
          </div>
          <button className="icon-button" onClick={logout} aria-label="Sair da conta">
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="workspace-header">
          <span>
            Seu espaço financeiro <span className="header-slash">/</span>{' '}
            <strong>
              {links.find(([path]) => path === location.pathname)?.[1] || 'Visão geral'}
            </strong>
          </span>
          <span className="private-label">
            <Icon name="lock" size={13} /> Só você acessa seus dados
          </span>
        </header>
        <main id="main" className="main-content">
          {notice && (
            <div className="alert" role="status">
              {notice}
            </div>
          )}
          <Suspense
            fallback={
              <div className="loading-state" role="status">
                <span className="spinner" /> Carregando página…
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
        <footer className="site-footer">
          <span>
            moneyfinder. <span>Mais clareza para suas escolhas.</span>
          </span>
          <small>Projeto 2 · Programação Web Fullstack</small>
        </footer>
      </div>
    </div>
  )
}
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage key="login" />} />
      <Route path="/cadastro" element={<AuthPage key="cadastro" registerMode />} />
      <Route element={<ProtectedLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="/lancamentos" element={<EntriesPage />} />
        <Route path="/categorias" element={<CatalogPage key="categories" category />} />
        <Route path="/fontes-destinos" element={<CatalogPage key="sources" />} />
        <Route path="/relatorios" element={<ReportsPage />} />
        <Route path="/faturas" element={<InvoicesPage />} />
        <Route path="/saude-financeira" element={<HealthPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
