import { useState } from 'react'
import { Search, Filter, MessageSquare, Clock, CheckCircle, AlertCircle, User, Calendar, ChevronRight } from 'lucide-react'

interface Ticket {
  id: string
  assunto: string
  cliente: string
  email: string
  categoria: 'duvida' | 'problema' | 'solicitacao' | 'reclamacao'
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
  status: 'aberto' | 'em_andamento' | 'aguardando' | 'resolvido'
  dataCriacao: string
  ultimaAtualizacao: string
  avatar: string
  mensagens: number
}

const tickets: Ticket[] = [
  { id: '#TKT-001234', assunto: 'Problema com entrega do pedido', cliente: 'Maria Silva', email: 'maria.silva@email.com', categoria: 'problema', prioridade: 'alta', status: 'em_andamento', dataCriacao: '18/01/2024 14:32', ultimaAtualizacao: '2 horas atrás', avatar: 'MS', mensagens: 5 },
  { id: '#TKT-001235', assunto: 'Dúvida sobre política de troca', cliente: 'João Santos', email: 'joao.santos@email.com', categoria: 'duvida', prioridade: 'baixa', status: 'aberto', dataCriacao: '18/01/2024 13:15', ultimaAtualizacao: '3 horas atrás', avatar: 'JS', mensagens: 2 },
  { id: '#TKT-001236', assunto: 'Solicitação de reembolso', cliente: 'Ana Oliveira', email: 'ana.oliveira@email.com', categoria: 'solicitacao', prioridade: 'media', status: 'aguardando', dataCriacao: '18/01/2024 11:45', ultimaAtualizacao: '5 horas atrás', avatar: 'AO', mensagens: 8 },
  { id: '#TKT-001237', assunto: 'Produto com defeito', cliente: 'Carlos Ferreira', email: 'carlos.ferreira@email.com', categoria: 'reclamacao', prioridade: 'urgente', status: 'em_andamento', dataCriacao: '18/01/2024 10:20', ultimaAtualizacao: '1 hora atrás', avatar: 'CF', mensagens: 12 },
  { id: '#TKT-001238', assunto: 'Atualização de cadastro', cliente: 'Beatriz Lima', email: 'beatriz.lima@email.com', categoria: 'solicitacao', prioridade: 'baixa', status: 'resolvido', dataCriacao: '17/01/2024 18:50', ultimaAtualizacao: '1 dia atrás', avatar: 'BL', mensagens: 3 },
  { id: '#TKT-001239', assunto: 'Dificuldade no pagamento', cliente: 'Roberto Costa', email: 'roberto.costa@email.com', categoria: 'problema', prioridade: 'alta', status: 'aberto', dataCriacao: '17/01/2024 16:30', ultimaAtualizacao: '4 horas atrás', avatar: 'RC', mensagens: 1 },
]

const statusConfig = {
  aberto: { color: 'bg-[#1E5EFF]/10 text-[#1E5EFF]', label: 'Aberto' },
  em_andamento: { color: 'bg-[#FFD60A]/10 text-[#B8860B]', label: 'Em Andamento' },
  aguardando: { color: 'bg-[#8B5CF6]/10 text-[#8B5CF6]', label: 'Aguardando' },
  resolvido: { color: 'bg-[#00C48C]/10 text-[#00C48C]', label: 'Resolvido' },
}

const prioridadeConfig = {
  baixa: { color: 'bg-[#64748B]/10 text-[#64748B]', label: 'Baixa' },
  media: { color: 'bg-[#1E5EFF]/10 text-[#1E5EFF]', label: 'Média' },
  alta: { color: 'bg-[#FFD60A]/10 text-[#B8860B]', label: 'Alta' },
  urgente: { color: 'bg-[#FF4757]/10 text-[#FF4757]', label: 'Urgente' },
}

const categoriaConfig = {
  duvida: { icon: '❓', label: 'Dúvida' },
  problema: { icon: '⚠️', label: 'Problema' },
  solicitacao: { icon: '📝', label: 'Solicitação' },
  reclamacao: { icon: '😤', label: 'Reclamação' },
}

export function Suporte() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.assunto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.cliente.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'todos' || ticket.status === filterStatus
    return matchesSearch && matchesFilter
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Suporte</h1>
          <p className="text-[#64748B] mt-1">Gerencie os tickets de atendimento</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#64748B] text-sm">Tickets Abertos</p>
              <p className="text-2xl font-bold text-[#1E5EFF] mt-1">156</p>
            </div>
            <div className="w-12 h-12 bg-[#1E5EFF]/10 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-[#1E5EFF]" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#64748B] text-sm">Em Andamento</p>
              <p className="text-2xl font-bold text-[#B8860B] mt-1">89</p>
            </div>
            <div className="w-12 h-12 bg-[#FFD60A]/10 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-[#B8860B]" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#64748B] text-sm">Resolvidos Hoje</p>
              <p className="text-2xl font-bold text-[#00C48C] mt-1">45</p>
            </div>
            <div className="w-12 h-12 bg-[#00C48C]/10 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-[#00C48C]" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#64748B] text-sm">Tempo Médio Resposta</p>
              <p className="text-2xl font-bold text-[#1E293B] mt-1">2.5h</p>
            </div>
            <div className="w-12 h-12 bg-[#8B5CF6]/10 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-[#8B5CF6]" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Tickets List */}
        <div className="flex-1 bg-white rounded-2xl border border-[#E2E8F0]">
          <div className="p-4 flex items-center justify-between border-b border-[#E2E8F0]">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-5 h-5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar ticket..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#1E5EFF]/20 focus:border-[#1E5EFF] w-64"
                />
              </div>
              <div className="flex items-center gap-2">
                {['todos', 'aberto', 'em_andamento', 'aguardando', 'resolvido'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus === status ? 'bg-[#1E5EFF] text-white' : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#E2E8F0]'}`}
                  >
                    {status === 'todos' ? 'Todos' : statusConfig[status as keyof typeof statusConfig]?.label}
                  </button>
                ))}
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-[#E2E8F0] rounded-xl text-[#64748B] hover:bg-[#F8FAFC] transition-colors">
              <Filter className="w-4 h-4" />
              Filtros
            </button>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`p-4 hover:bg-[#F8FAFC] cursor-pointer transition-colors ${selectedTicket?.id === ticket.id ? 'bg-[#F8FAFC]' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1E5EFF] flex items-center justify-center text-white font-medium text-sm">
                      {ticket.avatar}
                    </div>
                    <div>
                      <p className="font-medium text-[#1E293B]">{ticket.cliente}</p>
                      <p className="text-sm text-[#64748B]">{ticket.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${prioridadeConfig[ticket.prioridade].color}`}>
                      {prioridadeConfig[ticket.prioridade].label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[ticket.status].color}`}>
                      {statusConfig[ticket.status].label}
                    </span>
                  </div>
                </div>
                <p className="text-[#1E293B] mb-2">{ticket.assunto}</p>
                <div className="flex items-center justify-between text-sm text-[#64748B]">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      {ticket.mensagens}
                    </span>
                    <span>{categoriaConfig[ticket.categoria].icon} {categoriaConfig[ticket.categoria].label}</span>
                  </div>
                  <span>{ticket.ultimaAtualizacao}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ticket Detail */}
        {selectedTicket && (
          <div className="w-96 bg-white rounded-2xl border border-[#E2E8F0]">
            <div className="p-4 border-b border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#1E293B]">Detalhes do Ticket</h3>
                <span className="text-sm text-[#1E5EFF] font-medium">{selectedTicket.id}</span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[selectedTicket.status].color}`}>
                  {statusConfig[selectedTicket.status].label}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${prioridadeConfig[selectedTicket.prioridade].color}`}>
                  {prioridadeConfig[selectedTicket.prioridade].label}
                </span>
              </div>
              <h4 className="font-medium text-[#1E293B] mb-2">{selectedTicket.assunto}</h4>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1E5EFF] flex items-center justify-center text-white font-medium text-sm">
                  {selectedTicket.avatar}
                </div>
                <div>
                  <p className="font-medium text-[#1E293B]">{selectedTicket.cliente}</p>
                  <p className="text-sm text-[#64748B]">{selectedTicket.email}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <User className="w-4 h-4 text-[#94A3B8]" />
                  <span className="text-[#64748B]">Categoria:</span>
                  <span className="text-[#1E293B]">{categoriaConfig[selectedTicket.categoria].label}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-[#94A3B8]" />
                  <span className="text-[#64748B]">Criado em:</span>
                  <span className="text-[#1E293B]">{selectedTicket.dataCriacao}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="w-4 h-4 text-[#94A3B8]" />
                  <span className="text-[#64748B]">Atualizado:</span>
                  <span className="text-[#1E293B]">{selectedTicket.ultimaAtualizacao}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MessageSquare className="w-4 h-4 text-[#94A3B8]" />
                  <span className="text-[#64748B]">Mensagens:</span>
                  <span className="text-[#1E293B]">{selectedTicket.mensagens}</span>
                </div>
              </div>

              <button className="w-full flex items-center justify-center gap-2 bg-[#1E5EFF] text-white py-3 rounded-xl font-medium hover:bg-[#1E5EFF]/90 transition-colors">
                Abrir Conversa
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
