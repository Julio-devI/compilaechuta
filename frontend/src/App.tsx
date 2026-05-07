import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
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
import { Cadastro } from './pages/Cadastro'

function AppLayout() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
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
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/pedidos" element={<Pedidos />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/suporte" element={<Suporte />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/chat-ia" element={<ChatIA />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
