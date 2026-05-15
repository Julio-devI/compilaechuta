import { useState, useEffect, useCallback } from 'react'
import {
  Search, Table, Grid, ArrowUp,
  ArrowDown, Box, Calendar, ChevronDown, ChevronUp, Maximize2, Crown, RotateCcw, Sparkles, X, Flame,
  Loader2, Star, Ticket, UserMinus, Trophy, Activity, Heart, AlertTriangle
} from 'lucide-react'

import type { Cliente, FiltrosClientes } from '../services/customerService'
import { getClientes, getClienteStatusStyle } from '../services/customerService'

import { ExportCsvButton, ClientFilters } from '../components/ExportCsvButton'
import { Toaster, toast } from 'react-hot-toast'

type SortConfig = {
  key: string | null;
  direction: 'ascending' | 'descending';
};

export function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [isLoadingData, setIsLoadingData] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [selectedSegmento] = useState<string | undefined>()
  const [ticketRange, setTicketRange] = useState<{ min?: number, max?: number }>({})
  const [lvtRange, setLvtRange] = useState<{ min?: number, max?: number }>({})
  const [dateRange, setDateRange] = useState<{ inicio?: string, fim?: string }>({})
  const [regiaoSelecionada, setRegiaoSelecionada] = useState<string>('')

  const [viewMode, setViewMode] = useState<string>('tabela')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'ascending' });
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isTransitioningView, setIsTransitioningView] = useState(false);

  const handleTicketFilter = (min?: number, max?: number) => {
    setTicketRange({ min, max });
    setPage(1);
  };

  const handleLvtFilter = (min?: number, max?: number) => {
    setLvtRange({ min, max });
    setPage(1);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setPage(1);
  }

  const handleRegiaoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRegiaoSelecionada(e.target.value);
    setPage(1);
  }

  const fetchClientes = useCallback(async () => {
    setIsLoadingData(true)
    try {
      const filtros: FiltrosClientes = {
        search: searchTerm,
        status: filterStatus !== 'todos' ? filterStatus : undefined,
        segmento: selectedSegmento,
        ticket_min: ticketRange.min,
        ticket_max: ticketRange.max,
        lvtMin: lvtRange.min,
        lvtMax: lvtRange.max,
        data_inicio: dateRange.inicio,
        data_fim: dateRange.fim,
        regiao: regiaoSelecionada,
      }

      const res = await getClientes((page - 1) * pageSize, pageSize, filtros)
      setClientes(res.data)
      setTotalItems(res.total)
    } finally {
      setIsLoadingData(false)
    }
  }, [page, searchTerm, filterStatus, selectedSegmento, ticketRange, lvtRange, dateRange, regiaoSelecionada])

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchClientes()
    }, 500)

    return () => clearTimeout(handler)
  }, [fetchClientes])

  const totalPages = Math.ceil(totalItems / pageSize)

  // --- Lógica de Ordenação e Filtro ---
  const sortedClientes = [...clientes].sort((a, b) => {
    if (!sortConfig.key) return 0;
    let aValue: any = a[sortConfig.key as keyof Cliente];
    let bValue: any = b[sortConfig.key as keyof Cliente];

    if (typeof aValue === 'string' && aValue.startsWith('R$')) {
      aValue = parseFloat(aValue.replace('R$ ', '').replace('.', '').replace(',', '.'));
      bValue = parseFloat(bValue.replace('R$ ', '').replace('.', '').replace(',', '.'));
    }

    if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleFilterStatus = (status: string) => {
    setFilterStatus(status);
    setPage(1); // Sempre reseta a página ao filtrar
  };

  const handleViewChange = (mode: string) => {
    if (viewMode === mode) return;
    setIsTransitioningView(true);
    setViewMode(mode);
    setTimeout(() => setIsTransitioningView(false), 500);
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return <ArrowUp className="w-6 h-6 text-white ml-auto opacity-50" />;
    return sortConfig.direction === 'ascending'
      ? <ArrowUp className="w-6 h-6 text-white ml-auto" />
      : <ArrowDown className="w-6 h-6 text-white ml-auto" />;
  };

  const ClienteCardSkeleton = () => (
    <div className="bg-card p-6 rounded-2xl border border-border animate-pulse">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-gray-200"></div>
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        <div className="h-3 bg-gray-200 rounded w-4/6"></div>
        <div className="h-3 bg-gray-200 rounded w-3/6"></div>
      </div>
      <div className="mt-6 pt-4 border-t border-border flex justify-end">
        <div className="h-8 w-24 bg-gray-200 rounded-full"></div>
      </div>
    </div>
  );

  const StatusIcon = ({ status }: { status: string | undefined | null }) => {
    if (!status) return null;
    const s = status.toLowerCase();
    if (s.includes('vip')) return <Crown className="w-3.5 h-3.5" />;
    if (s.includes('novo')) return <Sparkles className="w-3.5 h-3.5" />;
    if (s.includes('inativo') || s.includes('perdido')) return <UserMinus className="w-3.5 h-3.5" />;
    if (s.includes('campeão') || s.includes('campeao')) return <Trophy className="w-3.5 h-3.5" />;
    if (s.includes('regular') || s.includes('recorrente') || s.includes('promissor') || s.includes('potencial')) return <Activity className="w-3.5 h-3.5" />;
    if (s.includes('fiel') || s.includes('leal')) return <Heart className="w-3.5 h-3.5" />;
    if (s.includes('risco')) return <AlertTriangle className="w-3.5 h-3.5" />;
    return <Sparkles className="w-3.5 h-3.5" />; // fallback
  };

  const getStyleFallback = (status: string) => {
    return getClienteStatusStyle(status);
  }

  // Lista dos segmentos com a grafia exata retornada pela API
  const segmentosFiltro = ['VIP', 'Novo Cliente', 'Inativo', 'Campeão', 'Regular', 'Fiel', 'Em Risco'];
  const regioesFiltro = ['Norte', 'Nordeste', 'Sudeste', 'Sul', 'Centro-Oeste'];

  return (
    <div className="p-8 bg-background min-h-screen">
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-5xl font-bold text-[#020854] dark:text-foreground">Clientes</h1>
      </div>

      {/* Top Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-5 h-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cliente"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-10 pr-4 py-2.5 bg-card rounded-4xl border border-border w-[500px] focus:ring-2 focus:ring-[#1E5EFF]/20 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#020854] dark:text-foreground">Visualizar por:</span>
            <div className="flex bg-card rounded-lg p-1 border border-border">
              <button
                onClick={() => handleViewChange('tabela')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'tabela' ? 'bg-[#1E5EFF] text-white shadow-sm' : 'text-muted hover:bg-background'}`}
              >
                <Table className="w-4 h-4" /> Tabela
              </button>
              <button
                onClick={() => handleViewChange('grade')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'grade' ? 'bg-[#1E5EFF] text-white shadow-sm' : 'text-muted hover:bg-background'}`}
              >
                <Grid className="w-4 h-4" /> Grade
              </button>
            </div>
          </div>
        </div>

        <ExportCsvButton<ClientFilters>
          type="client"
          filters={{
            averageTicketFloor: ticketRange.min,
            averageTicketCeil: ticketRange.max,
            ltvFloor: lvtRange.min,
            ltvCeil: lvtRange.max,
            lastOrderDateFloor: dateRange.inicio,
            lastOrderDateCeil: dateRange.fim,
            region: regiaoSelecionada,
            rfmSegment: filterStatus !== 'todos' ? filterStatus : undefined,
          }}
          endpoint="http://localhost:8000/api/v1/clients/exportar"
          onSuccess={(msg) => toast.success(msg)}
          onError={(err) => toast.error(err)}
        />
        <Toaster position="top-right" />
      </div>

      {/* PAINEL DE FILTROS EXPANSÍVEL */}
      <div className="bg-card rounded-3xl border border-border shadow-sm mb-8 overflow-hidden transition-all">
        <div
          className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-background"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="flex items-center gap-2 font-bold text-foreground">
            {showFilters ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            <span>{showFilters ? 'Esconder Filtros' : 'Mostrar Filtros'}</span>
          </div>
          <div className="flex gap-2">
            {(filterStatus !== 'todos' || searchTerm || selectedSegmento || ticketRange.min || ticketRange.max || lvtRange.min || lvtRange.max || dateRange.inicio || dateRange.fim || regiaoSelecionada) && (<span className="bg-[#1E5EFF]/10 text-[#1E5EFF] text-[10px] px-2 py-1 rounded-md">Filtros Ativos</span>)}
            <Maximize2 className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {showFilters && (
          <div className="px-8 pb-8 pt-4 grid grid-cols-12 gap-y-10 gap-x-8 border-t border-border animate-in fade-in slide-in-from-top-2 duration-300">

            {/* 1. Segmento RFM */}
            <div className="col-span-4">
              <div className="flex items-center gap-2 mb-4 font-bold text-foreground">
                <Calendar className="w-5 h-5" /> <span>Segmento rfm</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {segmentosFiltro.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleFilterStatus(filterStatus === status ? 'todos' : status)}
                    className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${filterStatus === status
                      ? 'ring-2 ring-[#1E5EFF] ring-offset-2 scale-105 shadow-md'
                      : 'opacity-70 hover:opacity-100'
                      } ${getStyleFallback(status)}`}
                  >
                    <StatusIcon status={status} />
                    {status}
                  </button>
                ))}
                {filterStatus !== 'todos' && (
                  <button
                    onClick={() => handleFilterStatus('todos')}
                    className="text-xs text-muted-foreground underline ml-2"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* 2. Faixa de LVT */}
            <div className="col-span-5">
              <div className="flex items-center gap-2 mb-4 font-bold text-foreground">
                <span className="text-lg font-bold">$</span> <span>Faixa de LVT</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleLvtFilter(0, 500)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${lvtRange.min === 0 && lvtRange.max === 500 ? 'bg-[#1E5EFF] text-white' : 'bg-[#F1F5F9] text-muted-foreground hover:bg-gray-200'}`}
                >
                  Até R$500
                </button>
                <button
                  onClick={() => handleLvtFilter(500, 2000)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${lvtRange.min === 500 && lvtRange.max === 2000 ? 'bg-[#1E5EFF] text-white' : 'bg-[#F1F5F9] text-muted-foreground hover:bg-gray-200'}`}
                >
                  R$500-R$2.000
                </button>
                <button
                  onClick={() => handleLvtFilter(2000, undefined)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${lvtRange.min === 2000 && lvtRange.max === undefined ? 'bg-[#1E5EFF] text-white' : 'bg-[#F1F5F9] text-muted-foreground hover:bg-gray-200'}`}
                >
                  + R$2.000
                </button>
                {(lvtRange.min !== undefined || lvtRange.max !== undefined) && (
                  <button
                    onClick={() => handleLvtFilter(undefined, undefined)}
                    className="text-xs text-muted-foreground underline ml-2 hover:text-[#1E5EFF]"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* 3. Faixa de Ticket Médio */}
            <div className="col-span-4">
              <div className="flex items-center gap-2 mb-4 font-bold text-foreground">
                <span className="text-lg font-bold">$</span> <span>Faixa de Ticket Médio</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleTicketFilter(0, 100)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${ticketRange.min === 0 && ticketRange.max === 100 ? 'bg-[#1E5EFF] text-white' : 'bg-[#F1F5F9] text-muted-foreground hover:bg-gray-200'}`}
                >
                  Até R$100
                </button>
                <button
                  onClick={() => handleTicketFilter(100, 500)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${ticketRange.min === 100 && ticketRange.max === 500 ? 'bg-[#1E5EFF] text-white' : 'bg-[#F1F5F9] text-muted-foreground hover:bg-gray-200'}`}
                >
                  R$100 - R$500
                </button>
                <button
                  onClick={() => handleTicketFilter(500, undefined)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${ticketRange.min === 500 && ticketRange.max === undefined ? 'bg-[#1E5EFF] text-white' : 'bg-[#F1F5F9] text-muted-foreground hover:bg-gray-200'}`}
                >
                  + R$500
                </button>
                {(ticketRange.min !== undefined || ticketRange.max !== undefined) && (
                  <button
                    onClick={() => handleTicketFilter(undefined, undefined)}
                    className="text-xs text-muted-foreground underline ml-2 hover:text-[#1E5EFF]"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* 4. Último Pedido */}
            <div className="col-span-4">
              <div className="flex items-center gap-2 mb-4 font-bold text-foreground">
                <Calendar className="w-5 h-5" /> <span>Último Pedido</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label htmlFor="inicio" className="text-xs text-muted-foreground">De</label>
                  <input type="date" name="inicio" id="inicio" value={dateRange.inicio} onChange={handleDateChange} className="w-full p-2 bg-[#F1F5F9] rounded-md px-3 outline-none text-sm text-muted-foreground border-none focus:ring-1 focus:ring-[#1E5EFF]/50" />
                </div>
                <div className="flex-1">
                  <label htmlFor="fim" className="text-xs text-muted-foreground">Até</label>
                  <input type="date" name="fim" id="fim" value={dateRange.fim} onChange={handleDateChange} className="w-full p-2 bg-[#F1F5F9] rounded-md px-3 outline-none text-sm text-muted-foreground border-none focus:ring-1 focus:ring-[#1E5EFF]/50" />
                </div>
              </div>
            </div>

            {/* 5. Região */}
            <div className="col-span-4">
              <div className="flex items-center gap-2 mb-4 font-bold text-foreground">
                <Search className="w-5 h-5" /> <span>Região</span>
              </div>
              <div className="relative">
                <select
                  value={regiaoSelecionada}
                  onChange={handleRegiaoChange}
                  className="w-full p-2.5 bg-[#F1F5F9] rounded-full px-6 outline-none text-sm text-muted-foreground border-none appearance-none focus:ring-1 focus:ring-[#1E5EFF]/50"
                >
                  <option value="">Todas</option>
                  {regioesFiltro.map(regiao => (
                    <option key={regiao} value={regiao}>{regiao}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer" />
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden relative min-h-[400px]">
        {isLoadingData ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm">
            <Loader2 className="w-8 h-8 text-[#1E5EFF] animate-spin mb-4" />
            <p className="text-muted-foreground font-medium">Buscando registros do banco de dados...</p>
          </div>
        ) : null}

        {isTransitioningView ? (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <ClienteCardSkeleton key={index} />
            ))}
          </div>
        ) : viewMode === 'tabela' ? (
          <div className="overflow-x-auto p-4">
            <table className="w-full border-separate border-spacing-y-0">
              <thead>
                <tr className="bg-[#020854] first:rounded-l-xl last:rounded-r-xl">
                  <th className="py-4 px-4 text-left rounded-l-xl">
                  </th>
                  <th className="py-4 px-2 text-white font-medium text-sm cursor-pointer" onClick={() => handleSort('nome')}>
                    <div className="flex items-center gap-2">Cliente </div>
                  </th>
                  <th className="py-4 px-2 text-white font-medium text-sm cursor-pointer" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-2">Segmento RFM <SortIcon columnKey="status" /></div>
                  </th>
                  <th className="py-4 px-2 text-white font-medium text-sm cursor-pointer" onClick={() => handleSort('lvtTotal')}>
                    <div className="flex items-center gap-2">LVT Total <SortIcon columnKey="lvtTotal" /></div>
                  </th>
                  <th className="py-4 px-2 text-white font-medium text-sm cursor-pointer" onClick={() => handleSort('ultimoPedido')}>
                    <div className="flex items-center gap-2">Último Pedido <SortIcon columnKey="ultimoPedido" /></div>
                  </th>
                  <th className="py-4 px-2 text-white font-medium text-sm cursor-pointer" onClick={() => handleSort('ticketMedio')}>
                    <div className="flex items-center gap-2">Ticket médio </div>
                  </th>
                  <th className="py-4 px-4 text-white font-medium text-sm rounded-r-xl">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedClientes.map((cliente) => (
                  <tr key={cliente.id} className="border-b border-border hover:bg-[#1E5EFF]/5 dark:hover:bg-[#1E5EFF]/10 transition-colors">
                    <td className="py-4 px-4">
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#BAE6FD] rounded-full flex items-center justify-center text-[#020854] dark:text-foreground text-xl font-medium mb-1 shrink-0">
                          {cliente.nome.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground text-sm">{cliente.nome}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStyleFallback(cliente.status)}`}>
                        <StatusIcon status={cliente.status} />
                        {cliente.status}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-sm font-medium text-foreground">{cliente.lvtTotal}</td>
                    <td className="py-4 px-2 text-sm font-medium text-foreground">{cliente.ultimoPedido}</td>
                    <td className="py-4 px-2 text-sm font-medium text-foreground">{cliente.ticketMedio}</td>
                    <td className="py-4 px-4">
                      <button
                        className="text-sm font-medium text-[#1E5EFF] hover:underline cursor-pointer"
                        onClick={() => {
                          setSelectedCliente(cliente)
                          setShowModal(true)
                        }}
                      >
                        Ver detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {sortedClientes.length === 0 && (
              <div className="w-full py-12 flex flex-col items-center justify-center text-slate-400">
                <Box className="w-12 h-12 mb-4 opacity-50" />
                <p className="font-bold text-lg text-slate-500">Nenhum cliente encontrado.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedClientes.map((cliente) => (
              <div key={cliente.id} className="bg-card p-6 rounded-2xl border border-[#ADE9FF] flex flex-col justify-between shadow-[0_4px_24px_-8px_rgba(0,110,219,0.12)] hover:shadow-lg transition-shadow">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-20 h-20 bg-[#BAE6FD] rounded-full flex items-center justify-center text-[#020854] dark:text-foreground text-3xl font-medium mb-1 shrink-0">
                      {cliente.nome.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-[#020854] dark:text-foreground">{cliente.nome}</h3>
                      <p className="text-sm text-muted-foreground">{cliente.cidade}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">LVT Total</span>
                      <span className="font-medium text-foreground">{cliente.lvtTotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ticket Médio</span>
                      <span className="font-medium text-foreground">{cliente.ticketMedio}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Segmento RFM</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getStyleFallback(cliente.status)}`}>
                        <StatusIcon status={cliente.status} />
                        {cliente.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-border flex justify-end">
                  <button
                    className="text-sm font-medium text-[#1E5EFF] hover:underline"
                    onClick={() => {
                      setSelectedCliente(cliente)
                      setShowModal(true)
                    }}
                  >
                    Ver detalhes
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="p-6 flex items-center justify-between border-t border-border bg-background">
          <p className="text-sm text-muted font-medium">Mostrando página {page} de {totalPages || 1} ({totalItems} registros totais)</p>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              className="px-4 py-2 border border-border rounded-xl text-sm text-muted bg-card hover:bg-gray-50 disabled:opacity-50 font-medium transition-all"
            >
              Anterior
            </button>
            <span className="px-4 py-2 bg-[#1E5EFF] text-white rounded-xl text-sm font-bold shadow-sm">{page}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              className="px-4 py-2 border border-border rounded-xl text-sm text-muted bg-card hover:bg-gray-50 disabled:opacity-50 font-medium transition-all"
            >
              Próximo
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes do Cliente */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div
            className="w-[800px] max-h-[95vh] bg-white rounded-[40px] shadow-2xl relative overflow-y-auto scrollbar-hide animate-in fade-in zoom-in duration-300 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="absolute top-6 right-8 flex flex-col items-end gap-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-8 h-8 text-black" />
                </button>
              </div>

              <h2 className="text-[40px] font-bold text-[#020854] mb-2">Detalhes do Cliente</h2>

              <div className="border border-[#BAE6FD] rounded-[35px] p-5 mb-2 relative bg-white">
                <div className="w-20 h-20 bg-[#BAE6FD] rounded-full flex items-center justify-center text-[#020854] text-3xl font-medium mb-1">
                  {selectedCliente ? selectedCliente.nome.substring(0, 2).toUpperCase() : 'AA'}
                </div>

                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold text-[#020854]">
                    {selectedCliente?.nome || 'Marina Albuquerque'}
                  </h3>
                  {selectedCliente && (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${getStyleFallback(selectedCliente.status)}`}>
                      <StatusIcon status={selectedCliente.status} />
                      {selectedCliente.status}
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-[#64748B] text-base">
                  <p>{selectedCliente ? `${selectedCliente.totalPedidos} pedidos no total` : '38 pedidos no total'}</p>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" /> Média de Estrelas dada: {selectedCliente?.estrelas || '0.0'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-blue-500" /> Tickets de suporte: {selectedCliente?.qtd_tickets_suporte || '0'}
                  </div>
                  <p className="flex items-center gap-2 mt-1">
                    <Box className="w-4 h-4" /> {selectedCliente?.cidade || 'São Paulo, SP'}
                  </p>
                </div>
              </div>

              <div className="border border-gray-100 rounded-[35px] p-5 shadow-sm bg-white">
                <span className="text-[#1E5EFF] text-xs font-bold tracking-widest uppercase mb-2 block">
                  Informações Gerais
                </span>
                <h4 className="text-2xl font-bold text-[#020854] mb-6">Produtos & Performance</h4>

                <div className="space-y-4">
                  <div className="bg-[#F8FAFC] rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-100">
                      <Box className="w-6 h-6 text-black" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-[#020854] text-sm">Smart TV 55" QLED 4K Vivara</p>
                      <p className="text-[10px] text-[#94A3B8] font-bold uppercase">SKU ELE-9921 · qtd 1</p>
                      <div className="flex gap-2 mt-2">
                        <span className="bg-[#DCFCE7] text-[#15803D] px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1">
                          <Flame className="w-3 h-3" /> Mais vendido
                        </span>
                        <span className="bg-[#FEE2E2] text-[#B91C1C] px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" /> Alta devolução
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#020854] text-sm">R$ 3.499,00</p>
                      <p className="text-[10px] text-[#94A3B8]">R$ 3.499,00 un</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-2">
                  <button className="bg-[#BAE6FD] text-[#020854] px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-[#7DD3FC] transition-colors text-sm">
                    Ver perfil completo
                    <ArrowUp className="w-4 h-4 rotate-45" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}