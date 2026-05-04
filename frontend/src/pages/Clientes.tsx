import { useState } from 'react'
import { Search, Filter, Plus, MoreHorizontal, Mail, Phone, MapPin, TrendingUp, TrendingDown } from 'lucide-react'

interface Cliente {
  id: number
  nome: string
  email: string
  telefone: string
  cidade: string
  totalPedidos: number
  valorTotal: string
  ultimaCompra: string
  status: 'ativo' | 'inativo' | 'novo'
  avatar: string
  tendencia: 'up' | 'down' | 'stable'
}

const clientes: Cliente[] = [
  { id: 1, nome: 'Maria Silva', email: 'maria.silva@email.com', telefone: '(11) 99999-1234', cidade: 'São Paulo, SP', totalPedidos: 45, valorTotal: 'R$ 12.450,00', ultimaCompra: '15/01/2024', status: 'ativo', avatar: 'MS', tendencia: 'up' },
  { id: 2, nome: 'João Santos', email: 'joao.santos@email.com', telefone: '(21) 98888-5678', cidade: 'Rio de Janeiro, RJ', totalPedidos: 32, valorTotal: 'R$ 8.920,00', ultimaCompra: '12/01/2024', status: 'ativo', avatar: 'JS', tendencia: 'up' },
  { id: 3, nome: 'Ana Oliveira', email: 'ana.oliveira@email.com', telefone: '(31) 97777-9012', cidade: 'Belo Horizonte, MG', totalPedidos: 28, valorTotal: 'R$ 7.350,00', ultimaCompra: '10/01/2024', status: 'novo', avatar: 'AO', tendencia: 'stable' },
  { id: 4, nome: 'Carlos Ferreira', email: 'carlos.ferreira@email.com', telefone: '(41) 96666-3456', cidade: 'Curitiba, PR', totalPedidos: 18, valorTotal: 'R$ 4.200,00', ultimaCompra: '05/01/2024', status: 'ativo', avatar: 'CF', tendencia: 'down' },
  { id: 5, nome: 'Beatriz Lima', email: 'beatriz.lima@email.com', telefone: '(51) 95555-7890', cidade: 'Porto Alegre, RS', totalPedidos: 12, valorTotal: 'R$ 2.890,00', ultimaCompra: '28/12/2023', status: 'inativo', avatar: 'BL', tendencia: 'down' },
  { id: 6, nome: 'Roberto Costa', email: 'roberto.costa@email.com', telefone: '(71) 94444-1234', cidade: 'Salvador, BA', totalPedidos: 56, valorTotal: 'R$ 15.780,00', ultimaCompra: '18/01/2024', status: 'ativo', avatar: 'RC', tendencia: 'up' },
  { id: 7, nome: 'Fernanda Alves', email: 'fernanda.alves@email.com', telefone: '(61) 93333-5678', cidade: 'Brasília, DF', totalPedidos: 8, valorTotal: 'R$ 1.450,00', ultimaCompra: '20/12/2023', status: 'novo', avatar: 'FA', tendencia: 'stable' },
  { id: 8, nome: 'Pedro Mendes', email: 'pedro.mendes@email.com', telefone: '(81) 92222-9012', cidade: 'Recife, PE', totalPedidos: 23, valorTotal: 'R$ 5.670,00', ultimaCompra: '08/01/2024', status: 'ativo', avatar: 'PM', tendencia: 'up' },
]

const statusColors = {
  ativo: 'bg-[#00C48C]/10 text-[#00C48C]',
  inativo: 'bg-[#FF4757]/10 text-[#FF4757]',
  novo: 'bg-[#1E5EFF]/10 text-[#1E5EFF]'
}

const statusLabels = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  novo: 'Novo'
}

export function Clientes() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('todos')

  const filteredClientes = clientes.filter(cliente => {
    const matchesSearch = cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cliente.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'todos' || cliente.status === filterStatus
    return matchesSearch && matchesFilter
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Clientes</h1>
          <p className="text-[#64748B] mt-1">Gerencie sua base de clientes</p>
        </div>
        <button className="flex items-center gap-2 bg-[#1E5EFF] text-white px-4 py-2.5 rounded-xl font-medium hover:bg-[#1E5EFF]/90 transition-colors">
          <Plus className="w-5 h-5" />
          Novo Cliente
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
          <p className="text-[#64748B] text-sm">Total de Clientes</p>
          <p className="text-3xl font-bold text-[#1E293B] mt-2">50.859</p>
          <p className="text-[#00C48C] text-sm mt-2 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            +12,5% este mês
          </p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
          <p className="text-[#64748B] text-sm">Clientes Ativos</p>
          <p className="text-3xl font-bold text-[#1E293B] mt-2">42.150</p>
          <p className="text-[#00C48C] text-sm mt-2 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            +8,3% este mês
          </p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
          <p className="text-[#64748B] text-sm">Novos Clientes</p>
          <p className="text-3xl font-bold text-[#1E293B] mt-2">1.234</p>
          <p className="text-[#00C48C] text-sm mt-2 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            +15,2% este mês
          </p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
          <p className="text-[#64748B] text-sm">Taxa de Retenção</p>
          <p className="text-3xl font-bold text-[#1E293B] mt-2">94,5%</p>
          <p className="text-[#00C48C] text-sm mt-2 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            +2,1% este mês
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] mb-6">
        <div className="p-4 flex items-center justify-between border-b border-[#E2E8F0]">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-5 h-5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#1E5EFF]/20 focus:border-[#1E5EFF] w-80"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterStatus('todos')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'todos' ? 'bg-[#1E5EFF] text-white' : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#E2E8F0]'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterStatus('ativo')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'ativo' ? 'bg-[#1E5EFF] text-white' : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#E2E8F0]'}`}
              >
                Ativos
              </button>
              <button
                onClick={() => setFilterStatus('novo')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'novo' ? 'bg-[#1E5EFF] text-white' : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#E2E8F0]'}`}
              >
                Novos
              </button>
              <button
                onClick={() => setFilterStatus('inativo')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'inativo' ? 'bg-[#1E5EFF] text-white' : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#E2E8F0]'}`}
              >
                Inativos
              </button>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 border border-[#E2E8F0] rounded-xl text-[#64748B] hover:bg-[#F8FAFC] transition-colors">
            <Filter className="w-4 h-4" />
            Filtros
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E2E8F0]">
                <th className="text-left py-4 px-6 text-[#64748B] font-medium text-sm">Cliente</th>
                <th className="text-left py-4 px-6 text-[#64748B] font-medium text-sm">Contato</th>
                <th className="text-left py-4 px-6 text-[#64748B] font-medium text-sm">Localização</th>
                <th className="text-left py-4 px-6 text-[#64748B] font-medium text-sm">Pedidos</th>
                <th className="text-left py-4 px-6 text-[#64748B] font-medium text-sm">Valor Total</th>
                <th className="text-left py-4 px-6 text-[#64748B] font-medium text-sm">Status</th>
                <th className="text-left py-4 px-6 text-[#64748B] font-medium text-sm"></th>
              </tr>
            </thead>
            <tbody>
              {filteredClientes.map((cliente) => (
                <tr key={cliente.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1E5EFF] flex items-center justify-center text-white font-medium text-sm">
                        {cliente.avatar}
                      </div>
                      <div>
                        <p className="font-medium text-[#1E293B]">{cliente.nome}</p>
                        <p className="text-sm text-[#64748B]">Última compra: {cliente.ultimaCompra}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="space-y-1">
                      <p className="text-sm text-[#1E293B] flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[#94A3B8]" />
                        {cliente.email}
                      </p>
                      <p className="text-sm text-[#64748B] flex items-center gap-2">
                        <Phone className="w-4 h-4 text-[#94A3B8]" />
                        {cliente.telefone}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm text-[#1E293B] flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#94A3B8]" />
                      {cliente.cidade}
                    </p>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#1E293B]">{cliente.totalPedidos}</span>
                      {cliente.tendencia === 'up' && <TrendingUp className="w-4 h-4 text-[#00C48C]" />}
                      {cliente.tendencia === 'down' && <TrendingDown className="w-4 h-4 text-[#FF4757]" />}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-medium text-[#1E293B]">{cliente.valorTotal}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[cliente.status]}`}>
                      {statusLabels[cliente.status]}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <button className="p-2 hover:bg-[#E2E8F0] rounded-lg transition-colors">
                      <MoreHorizontal className="w-5 h-5 text-[#64748B]" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 flex items-center justify-between border-t border-[#E2E8F0]">
          <p className="text-sm text-[#64748B]">Mostrando {filteredClientes.length} de {clientes.length} clientes</p>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#64748B] hover:bg-[#F8FAFC] transition-colors">
              Anterior
            </button>
            <button className="px-4 py-2 bg-[#1E5EFF] text-white rounded-lg text-sm font-medium">1</button>
            <button className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#64748B] hover:bg-[#F8FAFC] transition-colors">2</button>
            <button className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#64748B] hover:bg-[#F8FAFC] transition-colors">3</button>
            <button className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#64748B] hover:bg-[#F8FAFC] transition-colors">
              Próximo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
