import { useState, useEffect, useCallback } from 'react'
import {
  Search, Maximize2, Minimize2, ChevronDown, ChevronUp, History,
  AlertCircle, CheckCircle2, Database, Box, Calendar,
  Filter, Ticket, Table, Grid
} from 'lucide-react'
import { ModalDetalhesPedido } from '../components/ModalDetalhesPedido'
import { getPedidos, FiltrosPedidos } from '../services/orderService'

// --- Interfaces ---
// Mantemos a interface do layout original para não quebrar os cards
interface Pedido {
  id: string
  idReal: string
  cliente: string
  cidade: string
  estado: string
  produtos: number
  valor: string
  data: string
  status: 'Atrasado' | 'No prazo' | string
  recorrente: boolean
  ticket: number
  tempoAberto: string
  progresso: number
  mediaEstrelas: number
  totalPedidosCliente: number
  nomeProduto: string
  valorUnitario: string
  skuProduto: string
}

// --- Mock de Dados ---
const pedidosMock: Pedido[] = Array(5).fill({
  id: 'VC-308422',
  idReal: 'mock-uuid',
  cliente: 'Marina Albuquerque',
  cidade: 'São Paulo',
  estado: 'SP',
  produtos: 2,
  valor: 'R$ 4.289,90',
  data: '22 de abr. de 2026',
  status: 'Atrasado',
  recorrente: true,
  ticket: 1,
  tempoAberto: '3d aberto',
  progresso: 4,
  mediaEstrelas: 5.0,
  totalPedidosCliente: 38,
  nomeProduto: 'Smart TV 55" QLED 4K Vivara',
  valorUnitario: 'R$ 2.144,95',
  skuProduto: 'ELE-9921'
}).map((pedido, index) => ({ ...pedido, id: `VC-30842${index}` }));

const getStatusStyle = (status: string) => {
  const normalizedStatus = status.toLowerCase();

  switch (normalizedStatus) {
    case "aprovado":
      return {
        bg: "bg-background dark:bg-card text-purple-600",
        dot: "bg-purple-500",
      };
    case "processando":
      return {
        bg: "bg-background dark:bg-card text-orange-600",
        dot: "bg-orange-500",
      };
    case "recusado":
    case "atrasado": // Cor mapeada para o seu mock
      return {
        bg: "bg-background dark:bg-card text-red-600",
        dot: "bg-red-500",
      };
    case "reembolsado":
      return {
        bg: "bg-background dark:bg-card text-blue-600",
        dot: "bg-blue-500",
      };
    case "no prazo": // Cor mapeada para o seu mock
      return {
        bg: "bg-background dark:bg-card text-emerald-600",
        dot: "bg-emerald-500",
      };
    default:
      return {
        bg: "bg-background dark:bg-card text-slate-600",
        dot: "bg-slate-500",
      };
  }
};

export function Pedidos() {
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null)
  const [isFiltrosOpen, setIsFiltrosOpen] = useState(true)
  const [viewMode, setViewMode] = useState<'tabela' | 'grade'>('tabela')
  const [isLoading, setIsLoading] = useState(false)

  // --- API State ---
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20

  // --- Filter State ---
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [tipoClienteFilter] = useState<string>('')
  const [periodoFilter, setPeriodoFilter] = useState<string>('Todos')
  const [ticketFilter, setTicketFilter] = useState<string>('')

  const fetchPedidosData = useCallback(async () => {
    setIsLoading(true)
    try {
      const filtros: FiltrosPedidos = {
        id_produto: searchTerm || undefined,
        status: statusFilter || undefined,
        tipo_cliente: tipoClienteFilter || undefined,
        status_ticket: ticketFilter === 'Aberto' ? 'aberto' : ticketFilter === 'Finalizado' ? 'resolvido' : undefined,
      }

      const res = await getPedidos((page - 1) * pageSize, pageSize, filtros)
      
      const pedidosMapeados: Pedido[] = res.data.map((p) => ({
        id: p.id,
        idReal: p.idReal, // RECUPERADO AQUI PARA REPASSAR AO MODAL
        cliente: p.cliente,
        cidade: p.cidade,
        estado: p.estado,
        produtos: p.produtos,
        valor: p.valor,
        data: p.data,
        status: p.status,
        recorrente: p.recorrente,
        ticket: p.ticket,
        tempoAberto: p.tempoAberto,
        progresso: p.progresso,
        mediaEstrelas: p.mediaEstrelas,
        totalPedidosCliente: p.totalPedidosCliente,
        nomeProduto: p.nomeProduto,
        valorUnitario: p.valorUnitario,
        skuProduto: p.skuProduto
      }));

      setPedidos(pedidosMapeados)
      setTotalItems(res.total)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [page, searchTerm, statusFilter, tipoClienteFilter, ticketFilter, periodoFilter])

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchPedidosData()
    }, 500)
    return () => clearTimeout(handler)
  }, [fetchPedidosData])

  const handleViewChange = (mode: 'tabela' | 'grade') => {
    if (viewMode === mode) return;

    setIsLoading(true);
    setViewMode(mode);

    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  const toggleStatus = (label: string) => setStatusFilter(prev => prev === label ? '' : label)
  const toggleTicket = (label: string) => setTicketFilter(prev => prev === label ? '' : label)

  const dataSource = pedidos.length > 0 ? pedidos : pedidosMock;

  const PedidoCardSkeleton = () => (
    <div className="bg-card p-6 rounded-3xl border border-border animate-pulse flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col gap-2 w-1/2">
            <div className="h-6 bg-slate-200 rounded w-full"></div>
            <div className="h-3 bg-slate-200 rounded w-2/3"></div>
          </div>
          <div className="h-5 w-16 bg-slate-200 rounded-full"></div>
        </div>

        <div className="bg-background rounded-2xl p-4 mb-4 space-y-2">
          <div className="h-5 bg-slate-200 rounded w-3/4"></div>
          <div className="h-3 bg-slate-200 rounded w-1/2"></div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="h-4 w-16 bg-slate-200 rounded"></div>
            <div className="h-4 w-12 bg-slate-200 rounded"></div>
          </div>
          <div className="flex justify-between items-center">
            <div className="h-4 w-20 bg-slate-200 rounded"></div>
            <div className="h-5 w-24 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center gap-1 justify-center">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center">
              <div className="w-5 h-5 rounded-full bg-slate-200"></div>
              {step < 5 && <div className="w-3 h-0.5 bg-slate-200" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-8 font-sans text-foreground">
      <h1 className="text-4xl font-bold text-[#020854] dark:text-foreground mb-8">Pedidos</h1>

      {/* 1. Database Search Card */}
      <div className="bg-card rounded-3xl p-6 shadow-sm border-0 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-foreground font-bold">
            <span className="p-1.5 bg-background rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-muted-foreground" />
            </span>
            Consultar Database
          </div>
          <div className="text-sm font-semibold text-muted-foreground">
            Total <span className="text-blue-700 ml-2 font-black">{totalItems > 0 ? totalItems : "300.000"}</span>
          </div>
        </div>

        <div className="relative">
          <Search className="w-5 h-5 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por ID do pedido, cliente ou SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-background rounded-2xl border-none text-foreground focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Exibindo</span>
            <span className="bg-sky-400 text-white px-2 py-0.5 rounded-full text-xs font-bold">{dataSource.length}</span>
          </div>
        </div>
      </div>

      {/* 2. Seção de Filtros (Conforme Imagem) */}
      <div className="bg-card rounded-3xl shadow-sm border-0 mb-8 overflow-hidden transition-all duration-300">
        <div className="p-6 flex justify-between items-center">
          <button
            onClick={() => setIsFiltrosOpen(!isFiltrosOpen)}
            className="flex items-center gap-2 font-bold text-foreground border-none outline-none cursor-pointer hover:opacity-70 transition-opacity"
          >
            {isFiltrosOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            {isFiltrosOpen ? 'Esconder Filtros' : 'Mostrar Filtros'}
          </button>
          {isFiltrosOpen ? <Minimize2 className="w-5 h-5 text-muted-foreground" /> : <Maximize2 className="w-5 h-5 text-muted-foreground" />}
        </div>

        {isFiltrosOpen && (
          <div className="px-8 pb-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Coluna Esquerda */}
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 font-black text-[#020854] dark:text-foreground mb-3 text-sm">
                  <Box className="w-4 h-4" /> SKU Produto
                </label>
                <div className="relative">
                  <select className="w-full p-4 bg-background rounded-2xl border-none text-muted-foreground outline-none appearance-none cursor-pointer">
                    <option>Todos os Produtos</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 font-black text-[#020854] dark:text-foreground mb-3 text-sm">
                  <Filter className="w-4 h-4" /> Status
                </label>
                <div className="flex flex-wrap gap-2">
                  <StatusChip label="Aprovado" color="bg-background dark:bg-card text-purple-600" dot="bg-purple-500" isActive={statusFilter === 'Aprovado'} onClick={() => toggleStatus('Aprovado')} />
                  <StatusChip label="Processando" color="bg-background dark:bg-card text-orange-600" dot="bg-orange-500" isActive={statusFilter === 'Processando'} onClick={() => toggleStatus('Processando')} />
                  <StatusChip label="Recusado" color="bg-background dark:bg-card text-red-600" dot="bg-red-500" isActive={statusFilter === 'Recusado'} onClick={() => toggleStatus('Recusado')} />
                  <StatusChip label="Reembolsado" color="bg-background dark:bg-card text-blue-600" dot="bg-blue-500" isActive={statusFilter === 'Reembolsado'} onClick={() => toggleStatus('Reembolsado')} />
                </div>
              </div>
            </div>

            {/* Coluna Direita */}
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 font-black text-[#020854] dark:text-foreground mb-3 text-sm">
                  <Calendar className="w-4 h-4" /> Período de Abertura
                </label>
                <div className="flex gap-2">
                  <button onClick={() => setPeriodoFilter('Todos')} className={`px-5 py-2.5 rounded-full text-xs font-bold transition-colors ${periodoFilter === 'Todos' ? 'bg-blue-600 text-white' : 'bg-background text-muted-foreground'}`}>Todos</button>
                  <button onClick={() => setPeriodoFilter('Hoje')} className={`px-5 py-2.5 rounded-full text-xs font-bold transition-colors ${periodoFilter === 'Hoje' ? 'bg-blue-600 text-white' : 'bg-background text-muted-foreground'}`}>Hoje</button>
                  <button onClick={() => setPeriodoFilter('Últimos 7 dias')} className={`px-5 py-2.5 rounded-full text-xs font-bold transition-colors ${periodoFilter === 'Últimos 7 dias' ? 'bg-blue-600 text-white' : 'bg-background text-muted-foreground'}`}>Últimos 7 dias</button>
                  <button onClick={() => setPeriodoFilter('Personalizado')} className={`px-5 py-2.5 rounded-full text-xs font-bold transition-colors ${periodoFilter === 'Personalizado' ? 'bg-blue-600 text-white' : 'bg-background text-muted-foreground'}`}>Personalizado</button>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 font-black text-[#020854] dark:text-foreground mb-3 text-sm">
                  <Ticket className="w-4 h-4" /> Ticket
                </label>
                <div className="flex gap-2">
                  <button onClick={() => toggleTicket('Não tem')} className={`px-5 py-2.5 rounded-full text-xs font-bold ${ticketFilter === 'Não tem' ? 'bg-blue-600 text-white' : 'bg-background text-muted-foreground'}`}>Não tem</button>
                  <button onClick={() => toggleTicket('Aberto')} className={`px-5 py-2.5 rounded-full text-xs font-bold ${ticketFilter === 'Aberto' ? 'bg-blue-600 text-white' : 'bg-background text-muted-foreground'}`}>Aberto</button>
                  <button onClick={() => toggleTicket('Finalizado')} className={`px-5 py-2.5 rounded-full text-xs font-bold ${ticketFilter === 'Finalizado' ? 'bg-blue-600 text-white' : 'bg-background text-muted-foreground'}`}>Finalizado</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Tabela Header */}
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-2xl font-bold text-[#020854] dark:text-foreground">{dataSource.length} Pedidos Encontrados</h2>
        <div className="flex items-center gap-2 bg-slate-200 dark:bg-border p-1 rounded-xl">
          <button
            onClick={() => handleViewChange('tabela')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border-none outline-none transition-colors cursor-pointer ${viewMode === 'tabela' ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:bg-slate-300 dark:hover:bg-background'}`}
          >
            <Table className="w-4 h-4" />
            Tabela
          </button>
          <button
            onClick={() => handleViewChange('grade')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border-none outline-none transition-colors cursor-pointer ${viewMode === 'grade' ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:bg-slate-300 dark:hover:bg-background'}`}
          >
            <Grid className="w-4 h-4" />
            Grade
          </button>
        </div>
      </div>

      {/* 4. Tabela de Conteúdo / Grid / Skeleton */}
      <div className="w-full overflow-hidden">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <PedidoCardSkeleton key={index} />
            ))}
          </div>
        ) : viewMode === 'tabela' ? (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="bg-[#020854] text-white">
                  <th className="py-4 px-6 text-left rounded-l-xl text-[10px] font-black uppercase tracking-widest border-none">SKU Pedido</th>
                  <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-none">Cliente</th>
                  <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-none">Data</th>
                  <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-none">Qtd.</th>
                  <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-none">Valor</th>
                  <th className="py-4 px-6 text-left rounded-r-xl text-[10px] font-black uppercase tracking-widest border-none">Status</th>
                </tr>
              </thead>
              <tbody>
                {dataSource.map((pedido, idx) => (
                  <tr
                    key={idx}
                    className="bg-card group cursor-pointer hover:bg-background transition-colors"
                    onClick={() => setPedidoSelecionado(pedido)}
                  >
                    <td className="py-4 px-6 rounded-l-2xl border-0">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-blue-900 dark:text-blue-300 text-lg">{pedido.id}</span>
                          <span className="text-[#FFD700] text-[10px] font-black flex items-center gap-1">
                            # {pedido.ticket} TICKET
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <History className="w-3 h-3" /> {pedido.tempoAberto}
                          </span>
                          <span className="flex items-center gap-1 text-red-500 uppercase italic">
                            <AlertCircle className="w-3 h-3" /> Fora do prazo
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6 border-0">
                      <div className="bg-background rounded-2xl p-4 flex items-center justify-between min-w-[240px]">
                        <div className="flex flex-col">
                          <span className="font-black text-[#020854] dark:text-foreground text-base leading-tight">
                            {pedido.cliente}
                          </span>
                          <span className="text-muted-foreground text-sm font-medium">
                            {pedido.cidade}, {pedido.estado}
                          </span>
                        </div>
                        {pedido.recorrente && (
                          <span className="bg-[#BDEBFF] text-[#0070E0] px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5">
                            <History className="w-3.5 h-3.5 rotate-180 stroke-[3px]" />
                            Recorrente
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6 border-0 text-[11px]">
                      <div className="text-muted-foreground leading-tight font-medium">
                        Comprado em:<br />
                        <span className="text-foreground font-bold">{pedido.data}</span>
                      </div>
                    </td>

                    <td className="py-4 px-6 border-0">
                      <span className="text-muted-foreground font-bold text-sm">
                        {pedido.produtos == -1 ? "Sem dados" : `${pedido.produtos} itens`}
                      </span>
                    </td>

                    <td className="py-4 px-6 border-0">
                      <span className="text-blue-900 dark:text-blue-300 font-black text-lg">{pedido.valor}</span>
                    </td>

                    <td className="py-4 px-6 rounded-r-2xl border-0">
                      <div className="flex items-center gap-4">
                        <span className={`${getStatusStyle(pedido.status).bg} px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${getStatusStyle(pedido.status).dot}`}></span>
                          {pedido.status.toUpperCase()}
                        </span>

                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((step) => (
                            <div key={step} className="flex items-center">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 
                                ${step < pedido.progresso ? 'bg-blue-900 border-blue-900 text-white' : 
                                  step === pedido.progresso ? 'bg-red-400 border-red-400 text-white' : 
                                  'bg-background border-border text-muted-foreground'}`}>
                                {step < pedido.progresso ? <CheckCircle2 className="w-4 h-4" /> : step}
                              </div>
                              {step < 5 && (
                                <div className={`w-3 h-0.5 ${step < pedido.progresso ? 'bg-blue-900' : 'bg-border'}`} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dataSource.map((pedido) => (
              <div 
                key={pedido.id} 
                className="bg-card p-6 rounded-3xl border border-border flex flex-col justify-between hover:shadow-[0_4px_24px_-8px_rgba(0,110,219,0.12)] transition-shadow cursor-pointer h-full"
                onClick={() => setPedidoSelecionado(pedido)}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-black text-blue-900 dark:text-blue-300 text-xl">{pedido.id}</span>
                      <span className="text-muted-foreground text-xs font-bold">{pedido.data}</span>
                    </div>
                    <span className={`${getStatusStyle(pedido.status).bg} px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${getStatusStyle(pedido.status).dot}`}></span>
                      {pedido.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="bg-background rounded-2xl p-4 mb-4">
                    <h3 className="font-black text-[#020854] dark:text-foreground text-lg">{pedido.cliente}</h3>
                    <p className="text-muted-foreground text-sm font-medium">{pedido.cidade}, {pedido.estado}</p>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-bold">Produtos</span>
                      <span className="font-medium text-foreground">{pedido.produtos} itens</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-bold">Valor Total</span>
                      <span className="font-black text-blue-900 dark:text-blue-300 text-lg">{pedido.valor}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="flex items-center gap-1 justify-center">
                    {[1, 2, 3, 4, 5].map((step) => (
                      <div key={step} className="flex items-center">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold border-2 
                          ${step < pedido.progresso ? 'bg-blue-900 border-blue-900 text-white' : 
                            step === pedido.progresso ? 'bg-red-400 border-red-400 text-white' : 
                            'bg-background border-border text-muted-foreground'}`}>
                          {step < pedido.progresso ? <CheckCircle2 className="w-3 h-3" /> : step}
                        </div>
                        {step < 5 && <div className={`w-3 h-0.5 ${step < pedido.progresso ? 'bg-blue-900' : 'bg-border'}`} />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6 bg-card p-4 rounded-2xl shadow-sm">
        <p className="text-sm text-muted-foreground font-medium">Mostrando página {page} de {Math.ceil(totalItems / pageSize) || 1}</p>
        <div className="flex items-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            className="px-4 py-2 bg-background border border-border rounded-xl text-sm text-muted-foreground hover:bg-slate-50 disabled:opacity-50 font-bold transition-all"
          >
            Anterior
          </button>
          <span className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-sm">{page}</span>
          <button
            disabled={page >= Math.ceil(totalItems / pageSize)}
            onClick={() => setPage(prev => Math.min(Math.ceil(totalItems / pageSize), prev + 1))}
            className="px-4 py-2 bg-background border border-border rounded-xl text-sm text-muted-foreground hover:bg-slate-50 disabled:opacity-50 font-bold transition-all"
          >
            Próximo
          </button>
        </div>
      </div>

      {/* 5. Floating Action Button */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg cursor-pointer">
        <span className="text-2xl">✨</span>
      </button>

      {/* 6. Modal de Detalhes */}
      <ModalDetalhesPedido
        isOpen={!!pedidoSelecionado}
        onClose={() => setPedidoSelecionado(null)}
        pedido={pedidoSelecionado}
      />
    </div>
  )
}

function StatusChip({ label, color, dot, isActive, onClick }: { label: string, color: string, dot: string, isActive?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`${color} px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 border-none hover:opacity-80 transition-transform ${isActive ? 'scale-105 ring-2 ring-current ring-offset-2' : ''}`}
    >
      <span className={`w-2 h-2 rounded-full ${dot}`}></span>
      {label}
    </button>
  )
}