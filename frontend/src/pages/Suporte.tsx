import { useEffect, useState } from 'react'
import {
  Search, Maximize2, Minimize2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Box, Calendar, Filter, Ticket, Headphones, MessageSquare, Clock, User
} from 'lucide-react'
import { ModalDetalhesTicket } from '../components/ModalDetalhesTicket'
import {
  getSupportTickets,
  getSupportTicketsCount,
  getSupportTicketSummary,
  type SupportTicket,
  type SupportTicketFilters,
  type SupportTicketSummary,
} from '../services/supportService'

type DatePreset = 'all' | 'today' | 'last7Days'
const TICKETS_PER_PAGE = 15

function formatDateParam(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getDateRange(preset: DatePreset) {
  if (preset === 'all') return {}

  const end = new Date()
  const start = new Date()

  if (preset === 'last7Days') {
    start.setDate(end.getDate() - 7)
  }

  return {
    startDate: formatDateParam(start),
    endDate: formatDateParam(end),
  }
}

export function Suporte() {
  const [areFiltersOpen, setAreFiltersOpen] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [agentFilter, setAgentFilter] = useState('')
  const [problemTypeFilter, setProblemTypeFilter] = useState('')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [matchingTicketsCount, setMatchingTicketsCount] = useState(0)
  const [summary, setSummary] = useState<SupportTicketSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSummaryLoading, setIsSummaryLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)

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

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, agentFilter, problemTypeFilter, datePreset])

  useEffect(() => {
    const controller = new AbortController()

    async function loadSummary() {
      setIsSummaryLoading(true)

      try {
        const data = await getSupportTicketSummary()

        if (!controller.signal.aborted) {
          setSummary(data)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Erro ao buscar resumo de tickets:', error)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSummaryLoading(false)
        }
      }
    }

    loadSummary()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function loadTickets() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const filters: SupportTicketFilters = {
          search: searchTerm.trim(),
          status: statusFilter,
          agent: agentFilter,
          problemType: problemTypeFilter,
          skip: (currentPage - 1) * TICKETS_PER_PAGE,
          limit: TICKETS_PER_PAGE,
          ...getDateRange(datePreset),
        }
        const [data, total] = await Promise.all([
          getSupportTickets(filters),
          getSupportTicketsCount(filters),
        ])

        if (!controller.signal.aborted) {
          setTickets(data)
          setMatchingTicketsCount(total)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Erro ao buscar tickets:', error)
          setErrorMessage('Não foi possível carregar os tickets.')
          setTickets([])
          setMatchingTicketsCount(0)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadTickets()

    return () => controller.abort()
  }, [searchTerm, statusFilter, agentFilter, problemTypeFilter, datePreset, currentPage])

  const totalTickets = summary?.total ?? 0
  const openTicketsCount = summary?.open ?? 0
  const resolvedTicketsCount = summary?.resolved ?? 0
  const averageResolutionTime = (summary?.averageResolutionTimeHours ?? 0).toFixed(1)
  const supportAgents = summary?.agents ?? []
  const problemTypes = summary?.problemTypes ?? []
  const totalPages = Math.max(1, Math.ceil(matchingTicketsCount / TICKETS_PER_PAGE))
  const firstVisibleTicket = matchingTicketsCount === 0 ? 0 : (currentPage - 1) * TICKETS_PER_PAGE + 1
  const lastVisibleTicket = Math.min(currentPage * TICKETS_PER_PAGE, matchingTicketsCount)
  const paginationPages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter(page => (
      page === 1 ||
      page === totalPages ||
      Math.abs(page - currentPage) <= 1
    ))

  return (
    <div className="min-h-screen bg-background p-8 font-sans text-foreground">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-[#020854] dark:text-foreground">Suporte & Tickets</h1>
      </div>

      {/* 1. Cards de Resumo */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-card rounded-3xl p-6 shadow-sm border border-border flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-1">Total de Tickets</p>
            <p className="text-3xl font-black text-[#020854] dark:text-foreground">{isSummaryLoading ? '...' : totalTickets}</p>
          </div>
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
            <Ticket className="w-7 h-7 text-blue-600" />
          </div>
        </div>
        <div className="bg-card rounded-3xl p-6 shadow-sm border border-border flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-1">Tickets Abertos</p>
            <p className="text-3xl font-black text-amber-500">{isSummaryLoading ? '...' : openTicketsCount}</p>
          </div>
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-amber-500" />
          </div>
        </div>
        <div className="bg-card rounded-3xl p-6 shadow-sm border border-border flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-1">Resolvidos</p>
            <p className="text-3xl font-black text-emerald-500">{isSummaryLoading ? '...' : resolvedTicketsCount}</p>
          </div>
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-emerald-500" />
          </div>
        </div>
        <div className="bg-card rounded-3xl p-6 shadow-sm border border-border flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-1">Tempo Médio</p>
            <p className="text-3xl font-black text-purple-600">
              {isSummaryLoading ? '...' : `${averageResolutionTime}h`}
            </p>
          </div>
          <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center">
            <Clock className="w-7 h-7 text-purple-600" />
          </div>
        </div>
      </div>

      {/* 2. Database Search Card */}
      <div className="bg-card rounded-3xl p-6 shadow-sm border-0 mb-6 flex items-center justify-between">
         <div className="relative w-full max-w-3xl">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por ID do ticket ou nome do cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-background rounded-full border-none text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
          />
        </div>
        <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm font-bold">Exibindo</span>
            <span className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-sm font-black border border-sky-200">{tickets.length} de {matchingTicketsCount}</span>
        </div>
      </div>

      {/* 3. Seção de Filtros */}
      <div className="bg-card rounded-3xl shadow-sm border-0 mb-8 overflow-hidden transition-all duration-300">
        <div className="p-6 flex justify-between items-center">
          <button
            onClick={() => setAreFiltersOpen(!areFiltersOpen)}
            className="flex items-center gap-2 font-bold text-foreground border-none outline-none cursor-pointer hover:opacity-70 transition-opacity"
          >
            {areFiltersOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            {areFiltersOpen ? 'Esconder Filtros' : 'Mostrar Filtros'}
          </button>
          {areFiltersOpen ? <Minimize2 className="w-5 h-5 text-slate-400" /> : <Maximize2 className="w-5 h-5 text-slate-400" />}
        </div>

        {areFiltersOpen && (
          <div className="px-8 pb-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Coluna Esquerda */}
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 font-black text-[#020854] dark:text-foreground mb-3 text-sm">
                  <Filter className="w-4 h-4" /> Status do Ticket
                </label>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setStatusFilter('all')}
                    className={`px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 transition-all ${statusFilter === 'all' ? 'bg-[#020854] text-white shadow-md' : 'bg-background text-muted-foreground hover:bg-slate-200 dark:hover:bg-border'}`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setStatusFilter('aberto')}
                    className={`px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 transition-all ${statusFilter === 'aberto' ? 'bg-[#FEF9C3] text-[#A16207] shadow-md border border-[#FEF08A]' : 'bg-background text-muted-foreground hover:bg-[#FEF9C3] hover:text-[#A16207]'}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#A16207]"></span>
                    Aberto
                  </button>
                  <button
                    onClick={() => setStatusFilter('resolvido')}
                    className={`px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 transition-all ${statusFilter === 'resolvido' ? 'bg-[#DCFCE7] text-[#15803D] shadow-md border border-[#BBF7D0]' : 'bg-background text-muted-foreground hover:bg-[#DCFCE7] hover:text-[#15803D]'}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#15803D]"></span>
                    Resolvido
                  </button>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 font-black text-[#020854] dark:text-foreground mb-3 text-sm">
                  <Headphones className="w-4 h-4" /> Agente de Suporte
                </label>
                <div className="relative">
                  <select
                    value={agentFilter}
                    onChange={(e) => setAgentFilter(e.target.value)}
                    className="w-full p-4 bg-background rounded-2xl border-none text-foreground font-medium outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Todos os Agentes</option>
                    {supportAgents.map(agent => (
                      <option key={agent} value={agent}>{agent}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Coluna Direita */}
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 font-black text-[#020854] dark:text-foreground mb-3 text-sm">
                  <Calendar className="w-4 h-4" /> Data de Abertura
                </label>
                <div className="flex gap-2">
                  <button onClick={() => setDatePreset('all')} className={`${datePreset === 'all' ? 'bg-blue-600 text-white' : 'bg-background text-muted-foreground hover:bg-slate-200 dark:hover:bg-border'} px-5 py-2.5 rounded-full text-xs font-bold`}>Todos</button>
                  <button onClick={() => setDatePreset('today')} className={`${datePreset === 'today' ? 'bg-blue-600 text-white' : 'bg-background text-muted-foreground hover:bg-slate-200 dark:hover:bg-border'} px-5 py-2.5 rounded-full text-xs font-bold`}>Hoje</button>
                  <button onClick={() => setDatePreset('last7Days')} className={`${datePreset === 'last7Days' ? 'bg-blue-600 text-white' : 'bg-background text-muted-foreground hover:bg-slate-200 dark:hover:bg-border'} px-5 py-2.5 rounded-full text-xs font-bold`}>Últimos 7 dias</button>
                </div>
              </div>
              
              <div>
                <label className="flex items-center gap-2 font-black text-[#020854] dark:text-foreground mb-3 text-sm">
                  <Box className="w-4 h-4" /> Tipo de Problema
                </label>
                <div className="relative">
                  <select
                    value={problemTypeFilter}
                    onChange={(e) => setProblemTypeFilter(e.target.value)}
                    className="w-full p-4 bg-background rounded-2xl border-none text-foreground font-medium outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Todos os Problemas</option>
                    {problemTypes.map(problemType => (
                      <option key={problemType} value={problemType}>{problemType}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Lista de Tickets (Tabela com visual moderno) */}
      <div className="w-full overflow-x-auto bg-card rounded-3xl p-4 shadow-sm border border-border">
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
            {tickets.map((ticket) => (
              <tr
                key={ticket.ticketId}
                className="bg-card group cursor-pointer hover:bg-background transition-colors border-b border-border"
                onClick={() => setSelectedTicket(ticket)}
              >
                <td className="py-4 px-6 rounded-l-2xl border-0">
                  <div className="flex flex-col gap-1">
                    <span className="font-black text-[#020854] dark:text-foreground text-lg">{ticket.ticketDisplayId}</span>
                    {ticket.supportAgent ? (
                      <span className="text-muted-foreground text-[10px] font-bold uppercase flex items-center gap-1">
                        <User className="w-3 h-3" /> {ticket.supportAgent}
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
                      {getInitials(ticket.customerName)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground">{ticket.customerName}</span>
                      <span className="text-muted-foreground text-xs font-medium">{ticket.customerId}</span>
                    </div>
                  </div>
                </td>

                <td className="py-4 px-6 border-0">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-foreground">{ticket.problemType}</span>
                    <div className="flex gap-2">
                      {ticket.orderId && (
                        <span className="text-[9px] bg-background text-muted-foreground px-2 py-0.5 rounded font-bold uppercase">Ped: {ticket.orderId}</span>
                      )}
                      {ticket.productId && (
                        <span className="text-[9px] bg-background text-muted-foreground px-2 py-0.5 rounded font-bold uppercase">Prod: {ticket.productId}</span>
                      )}
                    </div>
                  </div>
                </td>

                <td className="py-4 px-6 border-0">
                  <span className="text-muted-foreground font-medium text-sm">
                    {new Date(ticket.openedAt).toLocaleDateString('pt-BR')} <br/>
                    <span className="text-xs text-muted-foreground">{new Date(ticket.openedAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                  </span>
                </td>

                <td className="py-4 px-6 border-0">
                  {ticket.resolvedAt ? (
                    <div className="flex flex-col gap-1">
                       <span className="text-emerald-600 font-bold text-sm">
                         {new Date(ticket.resolvedAt).toLocaleDateString('pt-BR')}
                       </span>
                       <span className="text-xs font-bold text-muted-foreground bg-background px-2 py-0.5 rounded w-fit">
                         {ticket.resolutionTimeHours}h
                       </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic text-sm">-</span>
                  )}
                </td>

                <td className="py-4 px-6 border-0">
                  {ticket.rating ? (
                    <div className="flex items-center gap-1">
                      <span className="font-black text-foreground">{ticket.rating.toFixed(1)}</span>
                      <span className="text-[#FFD700] text-lg leading-none">★</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic text-sm">-</span>
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
        
        {isLoading && (
          <div className="w-full py-12 flex flex-col items-center justify-center text-muted-foreground">
             <Clock className="w-12 h-12 mb-4 opacity-50" />
             <p className="font-bold text-lg">Carregando tickets...</p>
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="w-full py-12 flex flex-col items-center justify-center text-red-500">
             <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
             <p className="font-bold text-lg">{errorMessage}</p>
          </div>
        )}

        {!isLoading && !errorMessage && tickets.length === 0 && (
          <div className="w-full py-12 flex flex-col items-center justify-center text-muted-foreground">
             <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
             <p className="font-bold text-lg">Nenhum ticket encontrado.</p>
             <p className="text-sm">Tente ajustar seus filtros de busca.</p>
          </div>
        )}

        {!isLoading && !errorMessage && matchingTicketsCount > 0 && (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-2 py-4 border-t border-border">
            <p className="text-sm font-bold text-muted-foreground">
              Mostrando {firstVisibleTicket}-{lastVisibleTicket} de {matchingTicketsCount}
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 rounded-full bg-background text-muted-foreground border border-border flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-border transition-colors"
                aria-label="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {paginationPages.map((page, index) => {
                const previousPage = paginationPages[index - 1]
                const shouldShowGap = previousPage !== undefined && page - previousPage > 1

                return (
                  <div key={page} className="flex items-center gap-2">
                    {shouldShowGap && (
                      <span className="text-muted-foreground font-bold px-1">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-10 h-10 rounded-full px-3 text-sm font-black transition-colors ${
                        currentPage === page
                          ? 'bg-[#020854] text-white shadow-md'
                          : 'bg-background text-muted-foreground border border-border hover:bg-slate-100 dark:hover:bg-border'
                      }`}
                    >
                      {page}
                    </button>
                  </div>
                )
              })}

              <button
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="w-10 h-10 rounded-full bg-background text-muted-foreground border border-border flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-border transition-colors"
                aria-label="Próxima página"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ModalDetalhesTicket 
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        ticket={selectedTicket}
      />
    </div>
  )
}
