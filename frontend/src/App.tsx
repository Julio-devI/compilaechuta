import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { Dashboard } from './components/Dashboard'
import { Clientes } from './pages/Clientes'
import { Pedidos } from './pages/Pedidos'
import { Produtos } from './pages/Produtos'
import { Suporte } from './pages/Suporte'
import { Relatorios } from './pages/Relatorios'
import { ChatIA } from './pages/ChatIA'
import { Configuracoes } from './pages/Configuracoes'
import { Login } from './pages/Login'
import { EsqueciSenha } from './pages/EsqueciSenha'
import { Cadastro } from './pages/Cadastro'
import { CadastroProduto } from './pages/CadastroProduto'
import { EditarProduto } from './pages/EditarProduto'
import {ThemeProvider} from "./contexts/ThemeContext";
import { Toaster } from 'sonner'

function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-20">
        <Header />
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
      <ThemeProvider>
        <Toaster position="top-right" richColors />
        <BrowserRouter>
          <Routes>
            <Route index element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/cadastro" element={<Cadastro />} />
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
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
  )
}

export default App
