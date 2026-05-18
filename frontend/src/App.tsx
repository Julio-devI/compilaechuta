import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  Navigate, useNavigate, useLocation,
} from "react-router-dom";

import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Dashboard } from "./components/Dashboard";
import { Clientes } from "./pages/Clientes";
import { Pedidos } from "./pages/Pedidos";
import { Produtos } from "./pages/Produtos";
import { Suporte } from "./pages/Suporte";
import { Categorias } from "./pages/Categorias";
import { ChatIA } from "./pages/ChatIA";
import { Configuracoes } from "./pages/Configuracoes";
import { Login } from "./pages/Login";
import { EsqueciSenha } from "./pages/EsqueciSenha";
import { RedefinirSenha } from "./pages/RedefinirSenha";
import { Operadores } from "./pages/Operadores";
import { CadastroProduto } from "./pages/CadastroProduto";
import { EditarProduto } from "./pages/EditarProduto";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ChatProvider, useChat } from "./contexts/ChatContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { toast, Toaster } from "sonner";
import { useEffect } from "react";
import { AUTH_EXPIRED_EVENT } from "@/services/setupFetchInterceptor.ts";
import { ChatIADrawer } from "@/components/ChatIADrawer.tsx";

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
  const { setLastRoute } = useChat()
  const isChatRoute = location.pathname === '/chat-ia'
  const isSettingsOrOperators = ['/configuracoes', '/operadores'].includes(location.pathname)
  const showDrawer = !isChatRoute && !isSettingsOrOperators

  useEffect(() => {
    if (!isChatRoute) {
      setLastRoute(location.pathname)
    }
  }, [location.pathname, isChatRoute, setLastRoute])

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
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatProvider>
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
                  <Route
                    path="/produtos/editar/:id"
                    element={<EditarProduto />}
                  />
                  <Route path="/suporte" element={<Suporte />} />
                  <Route path="/categorias" element={<Categorias />} />

                  <Route path="/chat-ia" element={<ChatIA />} />
                  <Route path="/configuracoes" element={<Configuracoes />} />
                </Route>
              </Route>

              {/* Rotas protegidas — apenas Admin e Super Admin */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={["admin", "super_admin"]} />
                }
              >
                <Route element={<AppLayout />}>
                  <Route path="/operadores" element={<Operadores />} />
                </Route>
              </Route>

              {/* Qualquer rota desconhecida redireciona para login */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
