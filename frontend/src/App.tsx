import { BrowserRouter, Routes, Route } from 'react-router-dom'
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

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="ml-20">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/pedidos" element={<Pedidos />} />
              <Route path="/produtos" element={<Produtos />} />
              <Route path="/suporte" element={<Suporte />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/chat-ia" element={<ChatIA />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
