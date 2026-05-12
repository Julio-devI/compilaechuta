import { useState } from 'react'
import {
  Search, Maximize2, Minimize2, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Box, Calendar, Filter, Ticket, Headphones, MessageSquare, Clock, User
} from 'lucide-react'
import { ModalDetalhesTicket } from '../components/ModalDetalhesTicket'

// --- Interfaces ---
interface SuporteTicket {
  id_ticket: string
  id_cliente: string
  nome_cliente: string
  id_pedido: string | null
  id_produto: string | null
  data_abertura: string
  data_resolucao: string | null
  tempo_resolucao_horas: number | null
  status: 'aberto' | 'resolvido'
  tipo_problema: string
  agente_suporte: string | null
  nota_avaliacao: number | null
}

// --- Mock de Dados ---
const ticketsMock: SuporteTicket[] = [
  {
    id_ticket: 'TK-77821',
    id_cliente: 'CL-001',
    nome_cliente: 'Marina Albuquerque',
    id_pedido: 'VC-308422',
    id_produto: 'SKU-001234',
    data_abertura: '2024-05-10T14:30:00Z',
    data_resolucao: null,
    tempo_resolucao_horas: null,
    status: 'aberto',
    tipo_problema: 'Atraso na Entrega',
    agente_suporte: 'Carlos Silva',
    nota_avaliacao: null
  },
  {
    id_ticket: 'TK-77822',
    id_cliente: 'CL-002',
    nome_cliente: 'João Santos',
    id_pedido: 'VC-308423',
    id_produto: 'SKU-001235',
    data_abertura: '2024-05-09T10:15:00Z',
    data_resolucao: '2024-05-09T14:45:00Z',
    tempo_resolucao_horas: 4.5,
    status: 'resolvido',
    tipo_problema: 'Produto com Defeito',
    agente_suporte: 'Ana Costa',
    nota_avaliacao: 5.0
  },
  {
    id_ticket: 'TK-77823',
    id_cliente: 'CL-003',
    nome_cliente: 'Roberto Lima',
    id_pedido: null,
    id_produto: null,
    data_abertura: '2024-05-11T09:00:00Z',
    data_resolucao: null,
    tempo_resolucao_horas: null,
    status: 'aberto',
    tipo_problema: 'Dúvida de Pagamento',
    agente_suporte: null,
    nota_avaliacao: null
  },
  {
    id_ticket: 'TK-77824',
    id_cliente: 'CL-004',
    nome_cliente: 'Fernanda Souza',
    id_pedido: 'VC-308425',
    id_produto: 'SKU-001236',
    data_abertura: '2024-05-08T16:20:00Z',
    data_resolucao: '2024-05-10T11:30:00Z',
    tempo_resolucao_horas: 43.1,
    status: 'resolvido',
    tipo_problema: 'Troca de Produto',
    agente_suporte: 'Carlos Silva',
    nota_avaliacao: 4.5
  },
]

export function Suporte() {
  const [isFiltrosOpen, setIsFiltrosOpen] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [ticketSelecionado, setTicketSelecionado] = useState<SuporteTicket | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberto': return 'bg-[#FEF9C3] text-[#A16207]'
      case 'resolvido': return 'bg-[#DCFCE7] text-[#15803D]'
      default: return 'bg-slate-100 text-slate-600'
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  const filteredTickets = ticketsMock.filter(ticket => {
    const matchesSearch = ticket.id_ticket.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.nome_cliente.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'todos' || ticket.status === filterStatus
    return matchesSearch && matchesFilter
  })

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 font-sans text-slate-900">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-[#020854]">Suporte & Tickets</h1>
      </div>

      {/* 1. Cards de Resumo */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[#64748B] text-sm font-bold uppercase tracking-wider mb-1">Total de Tickets</p>
            <p className="text-3xl font-black text-[#020854]">{ticketsMock.length}</p>
          </div>
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
            <Ticket className="w-7 h-7 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[#64748B] text-sm font-bold uppercase tracking-wider mb-1">Tickets Abertos</p>
            <p className="text-3xl font-black text-amber-500">{ticketsMock.filter(t => t.status === 'aberto').length}</p>
          </div>
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-amber-500" />
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[#64748B] text-sm font-bold uppercase tracking-wider mb-1">Resolvidos</p>
            <p className="text-3xl font-black text-emerald-500">{ticketsMock.filter(t => t.status === 'resolvido').length}</p>
          </div>
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-emerald-500" />
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[#64748B] text-sm font-bold uppercase tracking-wider mb-1">Tempo Médio</p>
            <p className="text-3xl font-black text-purple-600">
              {(ticketsMock.reduce((acc, t) => acc + (t.tempo_resolucao_horas || 0), 0) / (ticketsMock.filter(t => t.status === 'resolvido').length || 1)).toFixed(1)}h
            </p>
          </div>
          <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center">
            <Clock className="w-7 h-7 text-purple-600" />
          </div>
        </div>
      </div>

      {/* 2. Database Search Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border-0 mb-6 flex items-center justify-between">
         <div className="relative w-full max-w-3xl">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por ID do ticket ou nome do cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-[#F1F5F9] rounded-full border-none text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
          />
        </div>
        <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm font-bold">Exibindo</span>
            <span className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-sm font-black border border-sky-200">{filteredTickets.length}</span>
        </div>
      </div>

      {/* 3. Seção de Filtros */}
      <div className="bg-white rounded-3xl shadow-sm border-0 mb-8 overflow-hidden transition-all duration-300">
        <div className="p-6 flex justify-between items-center">
          <button
            onClick={() => setIsFiltrosOpen(!isFiltrosOpen)}
            className="flex items-center gap-2 font-bold text-slate-800 border-none outline-none cursor-pointer hover:opacity-70 transition-opacity"
          >
            {isFiltrosOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            {isFiltrosOpen ? 'Esconder Filtros' : 'Mostrar Filtros'}
          </button>
          {isFiltrosOpen ? <Minimize2 className="w-5 h-5 text-slate-400" /> : <Maximize2 className="w-5 h-5 text-slate-400" />}
        </div>

        {isFiltrosOpen && (
          <div className="px-8 pb-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Coluna Esquerda */}
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 font-black text-[#020854] mb-3 text-sm">
                  <Filter className="w-4 h-4" /> Status do Ticket
                </label>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setFilterStatus('todos')}
                    className={`px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 transition-all ${filterStatus === 'todos' ? 'bg-[#020854] text-white shadow-md' : 'bg-[#F1F5F9] text-slate-500 hover:bg-slate-200'}`}
                  >
                    Todos
                  </button>
                  <button 
                    onClick={() => setFilterStatus('aberto')}
                    className={`px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 transition-all ${filterStatus === 'aberto' ? 'bg-[#FEF9C3] text-[#A16207] shadow-md border border-[#FEF08A]' : 'bg-[#F1F5F9] text-slate-500 hover:bg-[#FEF9C3] hover:text-[#A16207]'}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#A16207]"></span>
                    Aberto
                  </button>
                  <button 
                    onClick={() => setFilterStatus('resolvido')}
                    className={`px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 transition-all ${filterStatus === 'resolvido' ? 'bg-[#DCFCE7] text-[#15803D] shadow-md border border-[#BBF7D0]' : 'bg-[#F1F5F9] text-slate-500 hover:bg-[#DCFCE7] hover:text-[#15803D]'}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#15803D]"></span>
                    Resolvido
                  </button>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 font-black text-[#020854] mb-3 text-sm">
                  <Headphones className="w-4 h-4" /> Agente de Suporte
                </label>
                <div className="relative">
                  <select className="w-full p-4 bg-[#F1F5F9] rounded-2xl border-none text-slate-600 font-medium outline-none appearance-none cursor-pointer">
                    <option>Todos os Agentes</option>
                    <option>Carlos Silva</option>
                    <option>Ana Costa</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Coluna Direita */}
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 font-black text-[#020854] mb-3 text-sm">
                  <Calendar className="w-4 h-4" /> Data de Abertura
                </label>
                <div className="flex gap-2">
                  <button className="bg-blue-600 text-white px-5 py-2.5 rounded-full text-xs font-bold">Todos</button>
                  <button className="bg-[#F1F5F9] text-[#6B7588] px-5 py-2.5 rounded-full text-xs font-bold hover:bg-slate-200">Hoje</button>
                  <button className="bg-[#F1F5F9] text-[#6B7588] px-5 py-2.5 rounded-full text-xs font-bold hover:bg-slate-200">Últimos 7 dias</button>
                  <button className="bg-[#F1F5F9] text-[#6B7588] px-5 py-2.5 rounded-full text-xs font-bold hover:bg-slate-200">Personalizado</button>
                </div>
              </div>
              
              <div>
                <label className="flex items-center gap-2 font-black text-[#020854] mb-3 text-sm">
                  <Box className="w-4 h-4" /> Tipo de Problema
                </label>
                <div className="relative">
                  <select className="w-full p-4 bg-[#F1F5F9] rounded-2xl border-none text-slate-600 font-medium outline-none appearance-none cursor-pointer">
                    <option>Todos os Problemas</option>
                    <option>Atraso na Entrega</option>
                    <option>Produto com Defeito</option>
                    <option>Dúvida de Pagamento</option>
                    <option>Troca de Produto</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Lista de Tickets (Tabela com visual moderno) */}
      <div className="w-full overflow-x-auto bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
        <table className="w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="bg-[#020854] text-white">
              <th className="py-4 px-6 text-left rounded-l-xl text-[10px] font-black uppercase tracking-widest border-none">Ticket</th>
              <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-none">Cliente</th>
              <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-none">Problema</th>
              <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-none">Abertura</th>
              <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-none">Resolução</th>
              <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-none">Avaliação</th>
              <th className="py-4 px-6 text-left rounded-r-xl text-[10px] font-black uppercase tracking-widest border-none">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((ticket, idx) => (
              <tr
                key={idx}
                className="bg-white group cursor-pointer hover:bg-[#F8FAFC] transition-colors border-b border-slate-100"
                onClick={() => setTicketSelecionado(ticket)}
              >
                <td className="py-4 px-6 rounded-l-2xl border-0">
                  <div className="flex flex-col gap-1">
                    <span className="font-black text-[#020854] text-lg">{ticket.id_ticket}</span>
                    {ticket.agente_suporte ? (
                      <span className="text-slate-400 text-[10px] font-bold uppercase flex items-center gap-1">
                        <User className="w-3 h-3" /> {ticket.agente_suporte}
                      </span>
                    ) : (
                      <span className="text-amber-500 text-[10px] font-bold uppercase italic flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Aguardando Agente
                      </span>
                    )}
                  </div>
                </td>

                <td className="py-4 px-6 border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-black text-sm border border-sky-200">
                      {getInitials(ticket.nome_cliente)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">{ticket.nome_cliente}</span>
                      <span className="text-slate-400 text-xs font-medium">{ticket.id_cliente}</span>
                    </div>
                  </div>
                </td>

                <td className="py-4 px-6 border-0">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-slate-700">{ticket.tipo_problema}</span>
                    <div className="flex gap-2">
                      {ticket.id_pedido && (
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">Ped: {ticket.id_pedido}</span>
                      )}
                      {ticket.id_produto && (
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">Prod: {ticket.id_produto}</span>
                      )}
                    </div>
                  </div>
                </td>

                <td className="py-4 px-6 border-0">
                  <span className="text-slate-500 font-medium text-sm">
                    {new Date(ticket.data_abertura).toLocaleDateString('pt-BR')} <br/>
                    <span className="text-xs text-slate-400">{new Date(ticket.data_abertura).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                  </span>
                </td>

                <td className="py-4 px-6 border-0">
                  {ticket.data_resolucao ? (
                    <div className="flex flex-col gap-1">
                       <span className="text-emerald-600 font-bold text-sm">
                         {new Date(ticket.data_resolucao).toLocaleDateString('pt-BR')}
                       </span>
                       <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded w-fit">
                         {ticket.tempo_resolucao_horas}h
                       </span>
                    </div>
                  ) : (
                    <span className="text-slate-300 italic text-sm">-</span>
                  )}
                </td>

                <td className="py-4 px-6 border-0">
                  {ticket.nota_avaliacao ? (
                    <div className="flex items-center gap-1">
                      <span className="font-black text-slate-800">{ticket.nota_avaliacao.toFixed(1)}</span>
                      <span className="text-[#FFD700] text-lg leading-none">★</span>
                    </div>
                  ) : (
                    <span className="text-slate-300 italic text-sm">-</span>
                  )}
                </td>

                <td className="py-4 px-6 rounded-r-2xl border-0">
                  <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap border ${ticket.status === 'resolvido' ? 'border-[#BBF7D0]' : 'border-[#FEF08A]'} ${getStatusColor(ticket.status)}`}>
                    {ticket.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredTickets.length === 0 && (
          <div className="w-full py-12 flex flex-col items-center justify-center text-slate-400">
             <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
             <p className="font-bold text-lg">Nenhum ticket encontrado.</p>
             <p className="text-sm">Tente ajustar seus filtros de busca.</p>
          </div>
        )}
      </div>

      <ModalDetalhesTicket 
        isOpen={!!ticketSelecionado} 
        onClose={() => setTicketSelecionado(null)} 
        ticket={ticketSelecionado} 
      />
    </div>
  )
}
