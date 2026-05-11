import { useState, useEffect } from 'react'
import { Search, Filter, Eye, Package, Truck, CheckCircle, Clock, XCircle, TrendingUp } from 'lucide-react'
import type { Pedido, PedidoStatus } from '../services/orderService'
import { getPedidos, pedidoStatusConfig, pagamentoLabels } from '../services/orderService'

const statusConfig: Record<PedidoStatus, { color: string; icon: React.ElementType; label: string }> = {
  pendente:    { ...pedidoStatusConfig.pendente,    icon: Clock },
  processando: { ...pedidoStatusConfig.processando, icon: Package },
  enviado:     { ...pedidoStatusConfig.enviado,     icon: Truck },
  entregue:    { ...pedidoStatusConfig.entregue,    icon: CheckCircle },
  cancelado:   { ...pedidoStatusConfig.cancelado,   icon: XCircle },
}

export function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('todos')

  useEffect(() => {
    getPedidos().then(setPedidos)
  }, [])

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
          <h1 className="text-2xl font-bold text-foreground">Pedidos</h1>
          <p className="text-muted mt-1">Acompanhe e gerencie todos os pedidos</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-6 mb-8">
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-sm">Total Pedidos</p>
              <p className="text-2xl font-bold text-foreground mt-1">310.000</p>
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
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-sm">Pendentes</p>
              <p className="text-2xl font-bold text-[#B8860B] mt-1">1.234</p>
            </div>
            <div className="w-12 h-12 bg-[#FFD60A]/10 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-[#B8860B]" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-sm">Em Trânsito</p>
              <p className="text-2xl font-bold text-[#8B5CF6] mt-1">3.456</p>
            </div>
            <div className="w-12 h-12 bg-[#8B5CF6]/10 rounded-xl flex items-center justify-center">
              <Truck className="w-6 h-6 text-[#8B5CF6]" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-sm">Entregues</p>
              <p className="text-2xl font-bold text-[#00C48C] mt-1">298.765</p>
            </div>
            <div className="w-12 h-12 bg-[#00C48C]/10 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-[#00C48C]" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-sm">Cancelados</p>
              <p className="text-2xl font-bold text-[#FF4757] mt-1">6.545</p>
            </div>
            <div className="w-12 h-12 bg-[#FF4757]/10 rounded-xl flex items-center justify-center">
              <XCircle className="w-6 h-6 text-[#FF4757]" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border mb-6">
        <div className="p-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-5 h-5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar pedido ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-[#1E5EFF]/20 focus:border-[#1E5EFF] w-80"
              />
            </div>
            <div className="flex items-center gap-2">
              {['todos', 'pendente', 'processando', 'enviado', 'entregue', 'cancelado'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${filterStatus === status ? 'bg-[#1E5EFF] text-white' : 'bg-background text-muted hover:bg-border'}`}
                >
                  {status === 'todos' ? 'Todos' : statusConfig[status as keyof typeof statusConfig]?.label}
                </button>
              ))}
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-muted hover:bg-background transition-colors">
            <Filter className="w-4 h-4" />
            Filtros
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-4 px-6 text-muted font-medium text-sm">Pedido</th>
                <th className="text-left py-4 px-6 text-muted font-medium text-sm">Cliente</th>
                <th className="text-left py-4 px-6 text-muted font-medium text-sm">Produtos</th>
                <th className="text-left py-4 px-6 text-muted font-medium text-sm">Valor</th>
                <th className="text-left py-4 px-6 text-muted font-medium text-sm">Pagamento</th>
                <th className="text-left py-4 px-6 text-muted font-medium text-sm">Status</th>
                <th className="text-left py-4 px-6 text-muted font-medium text-sm">Data</th>
                <th className="text-left py-4 px-6 text-muted font-medium text-sm"></th>
              </tr>
            </thead>
            <tbody>
              {filteredPedidos.map((pedido) => {
                const StatusIcon = statusConfig[pedido.status].icon
                return (
                  <tr key={pedido.id} className="border-b border-border hover:bg-background transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-medium text-[#1E5EFF]">{pedido.id}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1E5EFF] flex items-center justify-center text-white font-medium text-xs">
                          {pedido.avatar}
                        </div>
                        <span className="text-foreground">{pedido.cliente}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-foreground">{pedido.produtos} {pedido.produtos === 1 ? 'item' : 'itens'}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-medium text-foreground">{pedido.valor}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-muted">{pagamentoLabels[pedido.pagamento]}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 w-fit ${statusConfig[pedido.status].color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusConfig[pedido.status].label}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-muted text-sm">{pedido.data}</span>
                    </td>
                    <td className="py-4 px-6">
                      <button className="p-2 hover:bg-border rounded-lg transition-colors" title="Ver detalhes">
                        <Eye className="w-5 h-5 text-muted" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 flex items-center justify-between border-t border-border">
          <p className="text-sm text-muted">Mostrando {filteredPedidos.length} de {pedidos.length} pedidos</p>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 border border-border rounded-lg text-sm text-muted hover:bg-background transition-colors">
              Anterior
            </button>
            <button className="px-4 py-2 bg-[#1E5EFF] text-white rounded-lg text-sm font-medium">1</button>
            <button className="px-4 py-2 border border-border rounded-lg text-sm text-muted hover:bg-background transition-colors">2</button>
            <button className="px-4 py-2 border border-border rounded-lg text-sm text-muted hover:bg-background transition-colors">3</button>
            <button className="px-4 py-2 border border-border rounded-lg text-sm text-muted hover:bg-background transition-colors">
              Próximo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
