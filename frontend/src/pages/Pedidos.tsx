import { useState } from 'react'
import { Search, Filter, Eye, Package, Truck, CheckCircle, Clock, XCircle, TrendingUp } from 'lucide-react'

interface Pedido {
  id: string
  cliente: string
  produtos: number
  valor: string
  data: string
  status: 'pendente' | 'processando' | 'enviado' | 'entregue' | 'cancelado'
  pagamento: 'pix' | 'cartao' | 'boleto'
  avatar: string
}

const pedidos: Pedido[] = [
  { id: '#PED-001234', cliente: 'Maria Silva', produtos: 3, valor: 'R$ 459,90', data: '18/01/2024 14:32', status: 'entregue', pagamento: 'pix', avatar: 'MS' },
  { id: '#PED-001235', cliente: 'João Santos', produtos: 1, valor: 'R$ 189,00', data: '18/01/2024 13:15', status: 'enviado', pagamento: 'cartao', avatar: 'JS' },
  { id: '#PED-001236', cliente: 'Ana Oliveira', produtos: 5, valor: 'R$ 892,50', data: '18/01/2024 11:45', status: 'processando', pagamento: 'cartao', avatar: 'AO' },
  { id: '#PED-001237', cliente: 'Carlos Ferreira', produtos: 2, valor: 'R$ 328,00', data: '18/01/2024 10:20', status: 'pendente', pagamento: 'boleto', avatar: 'CF' },
  { id: '#PED-001238', cliente: 'Beatriz Lima', produtos: 4, valor: 'R$ 1.245,00', data: '17/01/2024 18:50', status: 'entregue', pagamento: 'pix', avatar: 'BL' },
  { id: '#PED-001239', cliente: 'Roberto Costa', produtos: 1, valor: 'R$ 99,90', data: '17/01/2024 16:30', status: 'cancelado', pagamento: 'cartao', avatar: 'RC' },
  { id: '#PED-001240', cliente: 'Fernanda Alves', produtos: 6, valor: 'R$ 1.567,80', data: '17/01/2024 14:15', status: 'enviado', pagamento: 'pix', avatar: 'FA' },
  { id: '#PED-001241', cliente: 'Pedro Mendes', produtos: 2, valor: 'R$ 445,00', data: '17/01/2024 11:00', status: 'entregue', pagamento: 'cartao', avatar: 'PM' },
]

const statusConfig = {
  pendente: { color: 'bg-[#FFD60A]/10 text-[#B8860B]', icon: Clock, label: 'Pendente' },
  processando: { color: 'bg-[#1E5EFF]/10 text-[#1E5EFF]', icon: Package, label: 'Processando' },
  enviado: { color: 'bg-[#8B5CF6]/10 text-[#8B5CF6]', icon: Truck, label: 'Enviado' },
  entregue: { color: 'bg-[#00C48C]/10 text-[#00C48C]', icon: CheckCircle, label: 'Entregue' },
  cancelado: { color: 'bg-[#FF4757]/10 text-[#FF4757]', icon: XCircle, label: 'Cancelado' },
}

const pagamentoLabels = {
  pix: 'PIX',
  cartao: 'Cartão',
  boleto: 'Boleto'
}

export function Pedidos() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('todos')

  const filteredPedidos = pedidos.filter(pedido => {
    const matchesSearch = pedido.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pedido.cliente.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'todos' || pedido.status === filterStatus
    return matchesSearch && matchesFilter
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Pedidos</h1>
          <p className="text-[#64748B] mt-1">Acompanhe e gerencie todos os pedidos</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#64748B] text-sm">Total Pedidos</p>
              <p className="text-2xl font-bold text-[#1E293B] mt-1">310.000</p>
            </div>
            <div className="w-12 h-12 bg-[#1E5EFF]/10 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-[#1E5EFF]" />
            </div>
          </div>
          <p className="text-[#00C48C] text-sm mt-3 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            +8,5% este mês
          </p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#64748B] text-sm">Pendentes</p>
              <p className="text-2xl font-bold text-[#B8860B] mt-1">1.234</p>
            </div>
            <div className="w-12 h-12 bg-[#FFD60A]/10 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-[#B8860B]" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#64748B] text-sm">Em Trânsito</p>
              <p className="text-2xl font-bold text-[#8B5CF6] mt-1">3.456</p>
            </div>
            <div className="w-12 h-12 bg-[#8B5CF6]/10 rounded-xl flex items-center justify-center">
              <Truck className="w-6 h-6 text-[#8B5CF6]" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#64748B] text-sm">Entregues</p>
              <p className="text-2xl font-bold text-[#00C48C] mt-1">298.765</p>
            </div>
            <div className="w-12 h-12 bg-[#00C48C]/10 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-[#00C48C]" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#64748B] text-sm">Cancelados</p>
              <p className="text-2xl font-bold text-[#FF4757] mt-1">6.545</p>
            </div>
            <div className="w-12 h-12 bg-[#FF4757]/10 rounded-xl flex items-center justify-center">
              <XCircle className="w-6 h-6 text-[#FF4757]" />
            </div>
          </div>
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
                placeholder="Buscar pedido ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#1E5EFF]/20 focus:border-[#1E5EFF] w-80"
              />
            </div>
            <div className="flex items-center gap-2">
              {['todos', 'pendente', 'processando', 'enviado', 'entregue', 'cancelado'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${filterStatus === status ? 'bg-[#1E5EFF] text-white' : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#E2E8F0]'}`}
                >
                  {status === 'todos' ? 'Todos' : statusConfig[status as keyof typeof statusConfig]?.label}
                </button>
              ))}
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
                <th className="text-left py-4 px-6 text-[#64748B] font-medium text-sm">Pedido</th>
                <th className="text-left py-4 px-6 text-[#64748B] font-medium text-sm">Cliente</th>
                <th className="text-left py-4 px-6 text-[#64748B] font-medium text-sm">Produtos</th>
                <th className="text-left py-4 px-6 text-[#64748B] font-medium text-sm">Valor</th>
                <th className="text-left py-4 px-6 text-[#64748B] font-medium text-sm">Pagamento</th>
                <th className="text-left py-4 px-6 text-[#64748B] font-medium text-sm">Status</th>
                <th className="text-left py-4 px-6 text-[#64748B] font-medium text-sm">Data</th>
                <th className="text-left py-4 px-6 text-[#64748B] font-medium text-sm"></th>
              </tr>
            </thead>
            <tbody>
              {filteredPedidos.map((pedido) => {
                const StatusIcon = statusConfig[pedido.status].icon
                return (
                  <tr key={pedido.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-medium text-[#1E5EFF]">{pedido.id}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1E5EFF] flex items-center justify-center text-white font-medium text-xs">
                          {pedido.avatar}
                        </div>
                        <span className="text-[#1E293B]">{pedido.cliente}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[#1E293B]">{pedido.produtos} {pedido.produtos === 1 ? 'item' : 'itens'}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-medium text-[#1E293B]">{pedido.valor}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[#64748B]">{pagamentoLabels[pedido.pagamento]}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 w-fit ${statusConfig[pedido.status].color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusConfig[pedido.status].label}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[#64748B] text-sm">{pedido.data}</span>
                    </td>
                    <td className="py-4 px-6">
                      <button className="p-2 hover:bg-[#E2E8F0] rounded-lg transition-colors" title="Ver detalhes">
                        <Eye className="w-5 h-5 text-[#64748B]" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 flex items-center justify-between border-t border-[#E2E8F0]">
          <p className="text-sm text-[#64748B]">Mostrando {filteredPedidos.length} de {pedidos.length} pedidos</p>
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
