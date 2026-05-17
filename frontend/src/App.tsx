import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { ChatIADrawer } from './components/ChatIADrawer'
import { Dashboard } from './components/Dashboard'
import { AUTH_EXPIRED_EVENT } from './services/setupFetchInterceptor'
import { useAuth } from './contexts/AuthContext'
import { Clientes } from './pages/Clientes'
import { Pedidos } from './pages/Pedidos'
import { Produtos } from './pages/Produtos'
import { Suporte } from './pages/Suporte'
import { Relatorios } from './pages/Relatorios'
import { ChatIA } from './pages/ChatIA'
import { Configuracoes } from './pages/Configuracoes'
import { Login } from './pages/Login'
import { EsqueciSenha } from './pages/EsqueciSenha'
import { RedefinirSenha } from './pages/RedefinirSenha'
import { Operadores } from './pages/Operadores'
import { CadastroProduto } from './pages/CadastroProduto'
import { EditarProduto } from './pages/EditarProduto'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Toaster } from 'sonner'

function AuthExpirationGuard() {
  const navigate = useNavigate()
  const { logout, isAuthenticated } = useAuth()
  useEffect(() => {
    const handler = () => {
      if (!isAuthenticated) return
      logout()
      toast.error('Sua sessão expirou. Faça login novamente.')
      navigate('/login', { replace: true })
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, handler)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handler)
  }, [isAuthenticated, logout, navigate])
  return null
}

function AppLayout() {
  const location = useLocation()
  const showDrawer = location.pathname !== '/chat-ia'
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-20">
        <Header />
        <main>
          <Outlet />
        </main>
      </div>
      {showDrawer && <ChatIADrawer />}
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <BrowserRouter>
          <AuthExpirationGuard />
          <Routes>
            {/* Redireciona raiz para login */}
            <Route index element={<Navigate to="/login" replace />} />

            {/* Rotas públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />

            {/* Rotas protegidas — qualquer usuário autenticado */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/pedidos" element={<Pedidos />} />
                <Route path="/produtos" element={<Produtos />} />
                <Route path="/produtos/novo" element={<CadastroProduto />} />
                <Route path="/produtos/editar/:id" element={<EditarProduto />} />
                <Route path="/suporte" element={<Suporte />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/chat-ia" element={<ChatIA />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
              </Route>
            </Route>

            {/* Rotas protegidas — apenas Admin e Super Admin */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'super_admin']} />}>
              <Route element={<AppLayout />}>
                <Route path="/operadores" element={<Operadores />} />
              </Route>
            </Route>

            {/* Qualquer rota desconhecida redireciona para login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
