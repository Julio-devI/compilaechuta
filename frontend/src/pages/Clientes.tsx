import { useState, useEffect, useCallback } from 'react'
import {
  Search, Table, Grid, ArrowUp, ArrowDown,
  Box, ChevronDown, ChevronUp, Crown, Sparkles, X,
  Loader2, Star, Ticket as TicketIcon, UserMinus, Trophy, Activity, Heart, AlertTriangle,
  ShoppingBag, ExternalLink, ArrowLeft, Clock, Package, Headphones,
  CheckCircle2, AlertCircle, MessageSquare,
  MousePointer, Zap, Globe, Monitor
} from 'lucide-react'

import type { Cliente, FiltrosClientes, ClientesKPIs } from '../services/customerService'
import { getClientes, getClienteStatusStyle, getClientesKPIs } from '../services/customerService'
import { ExportCsvButton, type ClientFilters } from '../components/ExportCsvButton'
import { Toaster, toast } from 'react-hot-toast'
import { getPedidos } from '../services/orderService'
import type { Pedido as PedidoService } from '../services/orderService'
import { getSupportTickets } from '../services/supportService'
import type { SupportTicket } from '../services/supportService'
import { ModalDetalhesPedido } from '../components/ModalDetalhesPedido'

type SortConfig = {
  key: string | null;
  direction: 'ascending' | 'descending';
};

const LTV_MIN = 0;
const LTV_MAX = 5000;

function DualRangeSlider({
  min, max, minVal, maxVal, onMinChange, onMaxChange,
}: {
  min: number; max: number; minVal: number; maxVal: number;
  onMinChange: (v: number) => void; onMaxChange: (v: number) => void;
}) {
  const minPercent = ((minVal - min) / (max - min)) * 100;
  const maxPercent = ((maxVal - min) / (max - min)) * 100;
  return (
    <div className="relative h-5 mt-1">
      <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 bg-gray-200 rounded-full" />
      <div
        className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-[#1E5EFF] rounded-full pointer-events-none"
        style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
      />
      <input
        type="range" min={min} max={max} step={100} value={minVal}
        onChange={(e) => onMinChange(Math.min(Number(e.target.value), maxVal - 100))}
        className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer range-slider"
        style={{ zIndex: minVal > maxVal - 200 ? 5 : 3 }}
      />
      <input
        type="range" min={min} max={max} step={100} value={maxVal}
        onChange={(e) => onMaxChange(Math.max(Number(e.target.value), minVal + 100))}
        className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer range-slider"
        style={{ zIndex: 4 }}
      />
    </div>
  );
}

export function Clientes() {
  const [kpis, setKpis] = useState<ClientesKPIs | null>(null)

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [isLoadingData, setIsLoadingData] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')

  const [filterTipoCliente, setFilterTipoCliente] = useState('Todos')
  const [filterCategoria, setFilterCategoria] = useState('Todos')
  const [filterTicketStatus, setFilterTicketStatus] = useState('Todos')
  const [filterNPS, setFilterNPS] = useState('Todos')
  const [filterCSAT, setFilterCSAT] = useState('Todos')
  const [filterRegiao, setFilterRegiao] = useState('Todos')
  const [filterSKU, setFilterSKU] = useState('')
  const [lvtMin, setLvtMin] = useState(LTV_MIN)
  const [lvtMax, setLvtMax] = useState(LTV_MAX)

  const [viewMode, setViewMode] = useState<'tabela' | 'grade'>('tabela')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'ascending' })
  const [showFilters, setShowFilters] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())

  const [clientOrders, setClientOrders] = useState<PedidoService[]>([])
  const [clientTickets, setClientTickets] = useState<SupportTicket[]>([])
  const [clientOrdersLoading, setClientOrdersLoading] = useState(false)
  const [clientTicketsLoading, setClientTicketsLoading] = useState(false)
  const [orderDetailModal, setOrderDetailModal] = useState<PedidoService | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)

  const [clickstream, setClickstream] = useState<any>(null)
  const [clickstreamLoading, setClickstreamLoading] = useState(false)

  const fetchClientes = useCallback(async () => {
    setIsLoadingData(true)
    try {
      const filtros: FiltrosClientes = {
        search: searchTerm,
        status: filterTipoCliente !== 'Todos' ? filterTipoCliente : undefined,
        lvtMin: lvtMin > LTV_MIN ? lvtMin : undefined,
        lvtMax: lvtMax < LTV_MAX ? lvtMax : undefined,
        regiao: filterRegiao !== 'Todos' && filterRegiao ? filterRegiao : undefined,
        status_ticket: filterTicketStatus === 'Aberto' ? 'aberto' : filterTicketStatus === 'Finalizado' ? 'resolvido' : undefined,
        sem_ticket: filterTicketStatus === 'Sem ticket' ? true : undefined,
        nps: filterNPS !== 'Todos' ? filterNPS : undefined,
        csat: filterCSAT !== 'Todos' ? filterCSAT : undefined,
        sku: filterSKU || undefined,
        categoria: filterCategoria !== 'Todos' ? filterCategoria : undefined,
      }
      const res = await getClientes((page - 1) * pageSize, pageSize, filtros)
      setClientes(res.data)
      setTotalItems(res.total)
    } finally {
      setIsLoadingData(false)
    }
  }, [page, searchTerm, filterTipoCliente, lvtMin, lvtMax, filterRegiao, filterTicketStatus, filterNPS, filterCSAT, filterSKU, filterCategoria])

  useEffect(() => {
    const handler = setTimeout(() => { fetchClientes() }, 500)
    return () => clearTimeout(handler)
  }, [fetchClientes])

  useEffect(() => {
    getClientesKPIs().then(setKpis)
  }, [])

  useEffect(() => {
    document.body.style.overflow = showModal ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showModal])

  useEffect(() => {
    if (!selectedCliente || !showModal) {
      setClientOrders([])
      setClientTickets([])
      setClickstream(null)
      return
    }
    const id = String(selectedCliente.id)

    setClientOrdersLoading(true)
    getPedidos(0, 10, { id_cliente: id })
      .then(res => setClientOrders(res.data))
      .finally(() => setClientOrdersLoading(false))

    setClientTicketsLoading(true)
    getSupportTickets({ customer_id: id, limit: 10 })
      .then(setClientTickets)
      .finally(() => setClientTicketsLoading(false))

    setClickstreamLoading(true)
    fetch(`http://localhost:8000/api/v1/clickstream/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setClickstream(data))
      .catch(() => setClickstream(null))
      .finally(() => setClickstreamLoading(false))
  }, [selectedCliente, showModal])

  const totalPages = Math.ceil(totalItems / pageSize)

  const sortedClientes = [...clientes].sort((a, b) => {
    if (!sortConfig.key) return 0;
    let aValue: any = a[sortConfig.key as keyof Cliente];
    let bValue: any = b[sortConfig.key as keyof Cliente];
    if (typeof aValue === 'string' && aValue.startsWith('R$')) {
      aValue = parseFloat(aValue.replace('R$ ', '').replace(/\./g, '').replace(',', '.'));
      bValue = parseFloat((bValue as string).replace('R$ ', '').replace(/\./g, '').replace(',', '.'));
    }
    if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: string) => {
    const direction: 'ascending' | 'descending' =
      sortConfig.key === key && sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
    setSortConfig({ key, direction });
  };

  const isAllSelected = sortedClientes.length > 0 && selectedIds.size === sortedClientes.length;

  const handleSelectAll = () => {
    setSelectedIds(isAllSelected ? new Set() : new Set(sortedClientes.map(c => c.id)));
  };

  const handleSelectOne = (id: string | number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const getNPS = (estrelas: number) => {
    if (estrelas >= 4) return 'Promotor';
    if (estrelas >= 3) return 'Neutro';
    return 'Detrator';
  };

  const getNPSStyle = (nps: string) => {
    if (nps === 'Promotor') return 'text-emerald-600';
    if (nps === 'Neutro') return 'text-amber-500';
    return 'text-red-500';
  };

  const getCSAT = (estrelas: number) => estrelas >= 4 ? 'Satisfeito' : 'Insatisfeito';
  const getCSATStyle = (csat: string) => csat === 'Satisfeito' ? 'text-emerald-600' : 'text-red-500';

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return <ArrowUp className="w-3 h-3 opacity-40" />;
    return sortConfig.direction === 'ascending'
      ? <ArrowUp className="w-3 h-3" />
      : <ArrowDown className="w-3 h-3" />;
  };

  const StatusIcon = ({ status }: { status: string | undefined | null }) => {
    if (!status) return null;
    const s = status.toLowerCase();
    if (s.includes('vip')) return <Crown className="w-3 h-3" />;
    if (s.includes('novo')) return <Sparkles className="w-3 h-3" />;
    if (s.includes('inativo') || s.includes('perdido')) return <UserMinus className="w-3 h-3" />;
    if (s.includes('campeão') || s.includes('campeao')) return <Trophy className="w-3 h-3" />;
    if (s.includes('regular') || s.includes('recorrente') || s.includes('promissor') || s.includes('potencial')) return <Activity className="w-3 h-3" />;
    if (s.includes('fiel') || s.includes('leal')) return <Heart className="w-3 h-3" />;
    if (s.includes('risco')) return <AlertTriangle className="w-3 h-3" />;
    return <Sparkles className="w-3 h-3" />;
  };

  const tiposCliente = ['Todos', 'VIP', 'Campeão', 'Fiel', 'Regular', 'Novo', 'Inativo', 'Em Risco'];
  const categorias = ['Todos', 'Automotivo', 'Beleza', 'Brinquedos', 'Casa', 'Eletrônicos', 'Esportes', 'Móveis', 'Outros', 'Vestuário'];
  const ticketStatuses = ['Todos', 'Sem ticket', 'Aberto', 'Finalizado'];
  const npsOptions = ['Todos', 'Neutro', 'Promotores', 'Detratores'];
  const csatOptions = ['Todos', 'Satisfeito', 'Insatisfeito'];
  const regioes = ['Todos', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

  const hasActiveFilters =
    filterTipoCliente !== 'Todos' || filterCategoria !== 'Todos' ||
    filterTicketStatus !== 'Todos' || filterNPS !== 'Todos' ||
    filterCSAT !== 'Todos' || filterRegiao !== 'Todos' ||
    filterSKU !== '' || lvtMin > LTV_MIN || lvtMax < LTV_MAX || searchTerm !== '' ||
    filterNPS !== 'Todos' || filterCSAT !== 'Todos';

  const PillButton = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${active
          ? 'bg-[#1E5EFF] text-white'
          : 'bg-[#F1F5F9] dark:bg-background text-muted-foreground hover:bg-gray-200 dark:hover:bg-border'
        }`}
    >
      {label}
    </button>
  );

  return (
    <div className="p-8 bg-background min-h-screen">
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .range-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 16px; height: 16px; border-radius: 50%;
          background: white; border: 2px solid #1E5EFF;
          cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }
        .range-slider::-moz-range-thumb {
          width: 16px; height: 16px; border-radius: 50%;
          background: white; border: 2px solid #1E5EFF;
          cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }
        .range-slider::-webkit-slider-runnable-track { background: transparent; }
        .range-slider::-moz-range-track { background: transparent; }
      `}</style>

      <div className="flex items-center justify-between">
        <h1 className="text-5xl font-bold text-[#020854] dark:text-foreground mb-8">
          Clientes
        </h1>
        <ExportCsvButton<ClientFilters>
          type="client"
          filters={{
            rfmSegment: filterTipoCliente !== 'Todos' ? filterTipoCliente : undefined,
            ltvFloor: lvtMin > LTV_MIN ? lvtMin : undefined,
            ltvCeil: lvtMax < LTV_MAX ? lvtMax : undefined,
            region: filterRegiao !== 'Todos' ? filterRegiao : undefined,
          }}
          endpoint="http://localhost:8000/api/v1/clients/exportar"
          onSuccess={(msg) => toast.success(msg)}
          onError={(err) => toast.error(err)}
        />
        <Toaster position="top-right" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="bg-[#EEF3FF] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#020854]/70">Total de Pedidos</span>
            <div className="w-8 h-8 bg-[#1E5EFF]/10 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-[#1E5EFF]" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#020854]">
            {kpis ? kpis.totalPedidos.value.toLocaleString('pt-BR') : '—'}
          </p>
          {kpis && (
            <p className={`text-xs font-medium mt-1 ${kpis.totalPedidos.change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {kpis.totalPedidos.change >= 0 ? '+' : ''}{kpis.totalPedidos.change.toFixed(1)}% mês
            </p>
          )}
        </div>

        <div className="bg-[#020854] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-white/70">Total de Tickets</span>
            <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
              <TicketIcon className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">
            {kpis ? kpis.totalTickets.toLocaleString('pt-BR') : '—'}
          </p>
        </div>

        <div className="bg-white dark:bg-card border border-border rounded-2xl p-4">
          <div className="mb-2">
            <span className="text-xs font-semibold text-[#020854]/70 dark:text-foreground/70">NPS Destaque</span>
          </div>
          <p className="text-base font-bold text-[#020854] dark:text-foreground mb-2">Promotores</p>
          <div className="flex h-2 rounded-full overflow-hidden">
            <div
              className="bg-red-400 rounded-l-full"
              style={{ width: `${kpis?.npsDistribuicao.detratores ?? 12}%` }}
            />
            <div
              className="bg-amber-400 mx-0.5"
              style={{ width: `${kpis?.npsDistribuicao.neutros ?? 18}%` }}
            />
            <div className="bg-emerald-500 rounded-r-full flex-1" />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[9px] text-muted-foreground">
              Det. {kpis?.npsDistribuicao.detratores ?? 12}%
            </span>
            <span className="text-[9px] text-muted-foreground">
              Neu. {kpis?.npsDistribuicao.neutros ?? 18}%
            </span>
            <span className="text-[9px] text-muted-foreground">
              Pro. {kpis?.npsDistribuicao.promotores ?? 70}%
            </span>
          </div>
        </div>

        <div className="bg-[#ECFDF5] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#020854]/70">LTV Médio</span>
            <div className="w-8 h-8 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <span className="text-sm font-bold text-emerald-600">$</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-[#020854]">
            {kpis
              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis.ltvMedio.value)
              : '—'}
          </p>
          <p className="text-xs text-emerald-600 font-medium mt-1">média global</p>
        </div>

        <div className="bg-[#EFF6FF] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#020854]/70">CSAT Satisfeitos</span>
            <div className="w-8 h-8 bg-[#1E5EFF]/10 rounded-xl flex items-center justify-center">
              <Star className="w-4 h-4 text-[#1E5EFF]" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#020854]">
            {kpis ? `${kpis.csatPromotores.value.toFixed(0)}%` : '—'}
          </p>
          {kpis && (
            <p className={`text-xs font-medium mt-1 ${kpis.csatPromotores.change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {kpis.csatPromotores.change >= 0 ? '+' : ''}{kpis.csatPromotores.change.toFixed(1)}% mês
            </p>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <p className="text-sm font-bold text-[#020854] dark:text-foreground mb-2">Consultar Clientes</p>
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Busca por clientes"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="pl-9 pr-4 py-2.5 bg-card rounded-full border border-border w-full focus:ring-2 focus:ring-[#1E5EFF]/20 outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground ml-auto">
            <span>Total: <strong className="text-foreground">{totalItems.toLocaleString('pt-BR')}</strong></span>
            <span>Exibindo: <strong className="text-foreground">{sortedClientes.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-card rounded-3xl border border-border shadow-sm mb-6 overflow-hidden">
        <div
          className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-background transition-colors"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="flex items-center gap-2 font-bold text-foreground text-sm">
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span>{showFilters ? 'Esconder Filtros' : 'Mostrar Filtros'}</span>
          </div>
          {hasActiveFilters && (
            <span className="bg-[#1E5EFF]/10 text-[#1E5EFF] text-[10px] px-2 py-1 rounded-md font-medium">
              Filtros Ativos
            </span>
          )}
        </div>

        {showFilters && (
          <div className="px-6 pb-6 pt-4 border-t border-border space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Row 1: SKU | Categorias | Ticket */}
            <div className="grid grid-cols-3 gap-8">
              <div>
                <p className="text-xs font-bold text-foreground mb-3">SKU Produto</p>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar por SKU..."
                    value={filterSKU}
                    onChange={(e) => { setFilterSKU(e.target.value); setPage(1); }}
                    className="w-full py-2 pl-8 pr-8 bg-[#F1F5F9] dark:bg-background rounded-full outline-none text-sm text-foreground border-none focus:ring-1 focus:ring-[#1E5EFF]/50"
                  />
                  {filterSKU && (
                    <button
                      onClick={() => { setFilterSKU(''); setPage(1); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-foreground mb-3">Categorias de Interesse</p>
                <div className="flex flex-wrap gap-1.5">
                  {categorias.map(c => (
                    <PillButton key={c} label={c} active={filterCategoria === c} onClick={() => { setFilterCategoria(c); setPage(1); }} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-foreground mb-3">Ticket</p>
                <div className="flex flex-wrap gap-1.5">
                  {ticketStatuses.map(t => (
                    <PillButton key={t} label={t} active={filterTicketStatus === t} onClick={() => { setFilterTicketStatus(t); setPage(1); }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2: LTV Slider | NPS | CSAT */}
            <div className="grid grid-cols-3 gap-8">
              <div>
                <p className="text-xs font-bold text-foreground mb-3">LTV (Lifetime Value)</p>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>R$ {lvtMin.toLocaleString('pt-BR')}</span>
                  <span>R$ {lvtMax.toLocaleString('pt-BR')}</span>
                </div>
                <DualRangeSlider
                  min={LTV_MIN} max={LTV_MAX}
                  minVal={lvtMin} maxVal={lvtMax}
                  onMinChange={(v) => { setLvtMin(v); setPage(1); }}
                  onMaxChange={(v) => { setLvtMax(v); setPage(1); }}
                />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground mb-3">NPS (Net Promoter Score)</p>
                <div className="flex flex-wrap gap-1.5">
                  {npsOptions.map(n => (
                    <PillButton key={n} label={n} active={filterNPS === n} onClick={() => { setFilterNPS(n); setPage(1); }} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-foreground mb-3">CSAT (Customer Satisfaction Score)</p>
                <div className="flex flex-wrap gap-1.5">
                  {csatOptions.map(c => (
                    <PillButton key={c} label={c} active={filterCSAT === c} onClick={() => { setFilterCSAT(c); setPage(1); }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Row 3: Tipo de Cliente | Localização */}
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-xs font-bold text-foreground mb-3">Tipo de Cliente</p>
                <div className="flex flex-wrap gap-1.5">
                  {tiposCliente.map(t => (
                    <PillButton key={t} label={t} active={filterTipoCliente === t} onClick={() => { setFilterTipoCliente(t); setPage(1); }} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-foreground mb-3">Localização</p>
                <div className="flex flex-wrap gap-1.5">
                  {regioes.map(r => (
                    <PillButton key={r} label={r} active={filterRegiao === r} onClick={() => { setFilterRegiao(r); setPage(1); }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results count + View toggle */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-foreground">{totalItems} clientes encontrados</p>
        <div className="flex bg-card rounded-lg p-1 border border-border">
          <button
            onClick={() => setViewMode('tabela')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'tabela' ? 'bg-[#1E5EFF] text-white shadow-sm' : 'text-muted hover:bg-background'}`}
          >
            <Table className="w-3.5 h-3.5" /> Tabela
          </button>
          <button
            onClick={() => setViewMode('grade')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'grade' ? 'bg-[#1E5EFF] text-white shadow-sm' : 'text-muted hover:bg-background'}`}
          >
            <Grid className="w-3.5 h-3.5" /> Grade
          </button>
        </div>
      </div>

      {/* Selecionar tudo + Export */}
      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground font-medium select-none">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={handleSelectAll}
            className="w-4 h-4 rounded border-gray-300 accent-[#1E5EFF]"
          />
          Selecionar tudo
        </label>
      </div>

      {/* Main Content */}
      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden relative min-h-100">
        {isLoadingData && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm">
            <Loader2 className="w-8 h-8 text-[#1E5EFF] animate-spin mb-4" />
            <p className="text-muted-foreground font-medium">Buscando registros do banco de dados...</p>
          </div>
        )}

        {viewMode === 'tabela' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#020854]">
                  <th className="py-3 px-3 rounded-tl-2xl w-10">
                    <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} className="w-4 h-4 rounded accent-white" />
                  </th>
                  <th className="py-3 px-4 text-left text-white font-semibold text-xs cursor-pointer" onClick={() => handleSort('nome')}>
                    <div className="flex items-center gap-1">Cliente <SortIcon columnKey="nome" /></div>
                  </th>
                  <th className="py-3 px-4 text-left text-white font-semibold text-xs cursor-pointer" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-1">Segmento <SortIcon columnKey="status" /></div>
                  </th>
                  <th className="py-3 px-4 text-left text-white font-semibold text-xs">Categoria</th>
                  <th className="py-3 px-4 text-left text-white font-semibold text-xs cursor-pointer" onClick={() => handleSort('qtd_tickets_suporte')}>
                    <div className="flex items-center gap-1">Tickets <SortIcon columnKey="qtd_tickets_suporte" /></div>
                  </th>
                  <th className="py-3 px-4 text-left text-white font-semibold text-xs">Status Ticket</th>
                  <th className="py-3 px-4 text-left text-white font-semibold text-xs">LTV</th>
                  <th className="py-3 px-4 text-left text-white font-semibold text-xs">NPS</th>
                  <th className="py-3 px-4 text-left text-white font-semibold text-xs">CSAT</th>
                  <th className="py-3 px-4 text-left text-white font-semibold text-xs rounded-tr-2xl">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedClientes.map((cliente) => {
                  const nps = getNPS(cliente.estrelas);
                  const csat = getCSAT(cliente.estrelas);
                  return (
                    <tr
                      key={cliente.id}
                      className="border-b border-border hover:bg-[#1E5EFF]/5 dark:hover:bg-[#1E5EFF]/10 transition-colors cursor-pointer"
                      onClick={() => { setSelectedCliente(cliente); setShowModal(true); }}
                    >
                      <td className="py-3.5 px-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(cliente.id)}
                          onChange={() => handleSelectOne(cliente.id)}
                          className="w-4 h-4 rounded border-gray-300 accent-[#1E5EFF]"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#BAE6FD] rounded-full flex items-center justify-center text-[#020854] text-xs font-bold shrink-0">
                            {cliente.nome.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm leading-tight">{cliente.nome}</p>
                            <p className="text-[11px] text-muted-foreground">{cliente.cidade}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${getClienteStatusStyle(cliente.status)}`}>
                          <StatusIcon status={cliente.status} />
                          {cliente.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {cliente.categoriaInteresse ? (
                          <span className="px-2.5 py-1 bg-[#DBEAFE] text-[#1D4ED8] rounded-full text-xs font-medium">
                            {cliente.categoriaInteresse}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <TicketIcon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm font-semibold text-foreground">{cliente.qtd_tickets_suporte}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {cliente.qtd_tickets_suporte === 0 ? (
                          <span className="text-xs text-muted-foreground font-medium">Sem ticket</span>
                        ) : cliente.temTicketAberto ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Em aberto
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Resolvido
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-sm font-semibold text-foreground whitespace-nowrap">{cliente.lvtTotal}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-sm font-semibold ${getNPSStyle(nps)}`}>{nps}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-sm font-semibold ${getCSATStyle(csat)}`}>{csat}</span>
                      </td>
                      <td className="py-3.5 px-4" onClick={e => e.stopPropagation()}>
                        <button
                          className="text-xs font-semibold text-[#1E5EFF] hover:underline cursor-pointer px-3 py-1.5 rounded-lg hover:bg-[#1E5EFF]/10 transition-colors"
                          onClick={() => { setSelectedCliente(cliente); setShowModal(true); }}
                        >
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {sortedClientes.length === 0 && !isLoadingData && (
              <div className="w-full py-16 flex flex-col items-center justify-center text-slate-400">
                <Box className="w-12 h-12 mb-4 opacity-50" />
                <p className="font-bold text-lg text-slate-500">Nenhum cliente encontrado.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedClientes.map((cliente) => {
              const nps = getNPS(cliente.estrelas);
              const csat = getCSAT(cliente.estrelas);
              return (
                <div key={cliente.id} className="bg-card p-5 rounded-2xl border border-[#ADE9FF] flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-[#BAE6FD] rounded-full flex items-center justify-center text-[#020854] text-xl font-bold shrink-0">
                        {cliente.nome.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-[#020854] dark:text-foreground text-sm">{cliente.nome}</h3>
                        <p className="text-xs text-muted-foreground">{cliente.cidade}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase mb-3 ${getClienteStatusStyle(cliente.status)}`}>
                      <StatusIcon status={cliente.status} />
                      {cliente.status}
                    </span>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">LTV Total</span>
                        <span className="font-semibold text-foreground text-xs">{cliente.lvtTotal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Ticket Médio</span>
                        <span className="font-semibold text-foreground text-xs">{cliente.ticketMedio}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">NPS</span>
                        <span className={`text-xs font-semibold ${getNPSStyle(nps)}`}>{nps}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">CSAT</span>
                        <span className={`text-xs font-semibold ${getCSATStyle(csat)}`}>{csat}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex justify-end">
                    <button
                      onClick={() => { setSelectedCliente(cliente); setShowModal(true); }}
                      className="text-xs font-medium text-[#1E5EFF] hover:underline"
                    >
                      Ver detalhes
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        <div className="p-6 flex items-center justify-between border-t border-border bg-background">
          <p className="text-sm text-muted font-medium">
            Página {page} de {totalPages || 1} ({totalItems} registros)
          </p>
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

      {/* Client / ticket detail modal (single container, internal navigation) */}
      {showModal && selectedCliente && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onClick={(e) => { if (e.target === e.currentTarget) { setSelectedTicket(null); setShowModal(false); } }}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] bg-card rounded-[32px] shadow-2xl relative overflow-y-auto overscroll-contain scrollbar-hide animate-in fade-in zoom-in duration-300 mx-4 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedTicket ? (
              /* ── TICKET DETAIL VIEW ── */
              <>
                {/* Header */}
                <div className="flex justify-between items-center p-8 pb-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="p-2 hover:bg-background rounded-full transition-colors"
                    >
                      <ArrowLeft className="w-6 h-6 text-muted-foreground" />
                    </button>
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
                      <TicketIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-[#020854] dark:text-foreground">Detalhes do Ticket</h2>
                      <p className="text-muted-foreground font-medium">{selectedTicket.ticketDisplayId}</p>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedTicket(null); setShowModal(false); }} className="p-2 hover:bg-background rounded-full transition-colors">
                    <X className="w-8 h-8 text-muted-foreground" />
                  </button>
                </div>

                <div className="p-8 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left column */}
                    <div className="md:col-span-1 space-y-6">
                      <div className={`rounded-3xl p-6 border ${selectedTicket.status === 'resolvido'
                          ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]'
                          : 'bg-[#FEF9C3] text-[#A16207] border-[#FEF08A]'
                        }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {selectedTicket.status === 'resolvido'
                            ? <CheckCircle2 className="w-5 h-5" />
                            : <AlertCircle className="w-5 h-5" />}
                          <span className="text-[10px] font-black uppercase tracking-widest">Status Atual</span>
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-wider">{selectedTicket.status}</h3>
                        {selectedTicket.status === 'aberto' && (
                          <p className="text-xs font-bold mt-2 opacity-80">Aguardando resolução</p>
                        )}
                      </div>

                      <div className="bg-background border border-border rounded-3xl p-6">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 block">Cliente</span>
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-14 h-14 bg-sky-200 rounded-full flex items-center justify-center text-sky-700 font-black text-xl">
                            {selectedCliente.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-black text-[#020854] dark:text-foreground text-lg leading-tight">{selectedTicket.customerName}</h4>
                            <p className="text-muted-foreground text-xs font-bold">{selectedTicket.customerId}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedTicket(null)}
                          className="w-full bg-card text-foreground border border-border py-3 rounded-xl font-bold hover:bg-background transition-colors text-sm"
                        >
                          ← Voltar ao perfil
                        </button>
                      </div>

                      <div className="bg-card border border-border rounded-3xl p-6">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 block">Agente Responsável</span>
                        {selectedTicket.supportAgent ? (
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-black">
                              <Headphones className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-foreground">{selectedTicket.supportAgent}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 text-amber-500">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-bold text-sm">Não atribuído</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right column */}
                    <div className="md:col-span-2 space-y-6">
                      <div className="bg-card border border-[#ADE9FF] rounded-3xl p-6">
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2 block">Tipo de Problema</span>
                        <h3 className="text-2xl font-black text-[#020854] dark:text-foreground mb-6">{selectedTicket.problemType}</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-background p-4 rounded-2xl border border-border flex items-center gap-3">
                            <div className="w-10 h-10 bg-card rounded-xl flex items-center justify-center border border-border shadow-sm">
                              <Package className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Pedido Vinculado</p>
                              <p className="font-black text-foreground">{selectedTicket.orderId || 'Nenhum'}</p>
                            </div>
                          </div>
                          <div className="bg-background p-4 rounded-2xl border border-border flex items-center gap-3">
                            <div className="w-10 h-10 bg-card rounded-xl flex items-center justify-center border border-border shadow-sm">
                              <Box className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Produto Vinculado</p>
                              <p className="font-black text-foreground">{selectedTicket.productId || 'Nenhum'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="bg-card border border-border rounded-3xl p-6">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6 block">Timeline do Chamado</span>
                          <div className="relative border-l-2 border-border ml-3 space-y-6">
                            <div className="relative pl-6">
                              <div className="absolute w-4 h-4 bg-border rounded-full -left-[9px] top-1 border-4 border-card" />
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Abertura</p>
                              <p className="font-bold text-foreground text-sm">
                                {new Date(selectedTicket.openedAt).toLocaleString('pt-BR')}
                              </p>
                            </div>
                            <div className="relative pl-6">
                              <div className={`absolute w-4 h-4 rounded-full -left-[9px] top-1 border-4 border-card ${selectedTicket.resolvedAt ? 'bg-emerald-500' : 'bg-border'}`} />
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Resolução</p>
                              <p className={`font-bold text-sm ${selectedTicket.resolvedAt ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                                {selectedTicket.resolvedAt
                                  ? new Date(selectedTicket.resolvedAt).toLocaleString('pt-BR')
                                  : 'Aguardando...'}
                              </p>
                            </div>
                          </div>
                          {selectedTicket.resolutionTimeHours !== null && (
                            <div className="mt-6 pt-4 border-t border-border flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-bold text-foreground">
                                Resolvido em <span className="text-[#020854] dark:text-foreground font-black">{selectedTicket.resolutionTimeHours} horas</span>
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="bg-card border border-border rounded-3xl p-6 flex flex-col justify-between">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 block">Avaliação do Cliente</span>
                          {selectedTicket.rating ? (
                            <div className="flex flex-col items-center justify-center py-4">
                              <span className="text-5xl font-black text-[#020854] dark:text-foreground mb-2">
                                {selectedTicket.rating.toFixed(1)}
                              </span>
                              <div className="flex text-[#FFD700] text-2xl">
                                {'★'.repeat(Math.floor(selectedTicket.rating))}
                                {'☆'.repeat(5 - Math.floor(selectedTicket.rating))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-6 opacity-50">
                              <MessageSquare className="w-10 h-10 text-muted-foreground mb-2" />
                              <p className="text-sm font-bold text-muted-foreground text-center">Nenhuma avaliação<br />disponível ainda</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* ── CLIENT DETAIL VIEW ── */
              <div className="p-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-6 right-6 p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-7 h-7 text-black" />
                </button>

                <h2 className="text-3xl font-bold text-[#020854] mb-4">Detalhes do Cliente</h2>

                {/* Client info card */}
                <div className="border border-[#BAE6FD] rounded-3xl p-5 mb-4 bg-white">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-14 h-14 bg-[#BAE6FD] rounded-full flex items-center justify-center text-[#020854] text-xl font-bold shrink-0">
                      {selectedCliente.nome.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-bold text-[#020854]">{selectedCliente.nome}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${getClienteStatusStyle(selectedCliente.status)}`}>
                          <StatusIcon status={selectedCliente.status} />
                          {selectedCliente.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[#64748B] text-sm">
                        <span className="flex items-center gap-1.5"><ShoppingBag className="w-3.5 h-3.5" />{selectedCliente.totalPedidos} pedidos</span>
                        <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />{selectedCliente.estrelas?.toFixed(1) ?? '0.0'} estrelas</span>
                        <span className="flex items-center gap-1.5"><TicketIcon className="w-3.5 h-3.5 text-blue-500" />{selectedCliente.qtd_tickets_suporte ?? 0} tickets</span>
                        <span className="flex items-center gap-1.5"><Box className="w-3.5 h-3.5" />{selectedCliente.cidade}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPI grid */}
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {[
                    { label: 'LTV Total', value: selectedCliente.lvtTotal },
                    { label: 'Ticket Médio', value: selectedCliente.ticketMedio },
                    { label: 'NPS', value: getNPS(selectedCliente.estrelas), color: getNPSStyle(getNPS(selectedCliente.estrelas)) },
                    { label: 'CSAT', value: getCSAT(selectedCliente.estrelas), color: getCSATStyle(getCSAT(selectedCliente.estrelas)) },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-[#F8FAFC] rounded-2xl p-4">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                      <p className={`text-base font-bold ${color ?? 'text-[#020854]'}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Orders section */}
                <div className="mb-5">
                  <h4 className="text-sm font-bold text-[#020854] mb-3 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" /> Pedidos do Cliente
                  </h4>
                  {clientOrdersLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-[#1E5EFF]" /></div>
                  ) : clientOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum pedido encontrado.</p>
                  ) : (
                    <div className="space-y-2">
                      {clientOrders.map(order => (
                        <div key={order.idReal} className="flex items-center justify-between bg-[#F8FAFC] rounded-2xl px-4 py-3 gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-[#020854] text-sm">{order.id}</p>
                            <p className="text-xs text-muted-foreground truncate">{order.data} · {order.nomeProduto}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-bold text-[#020854] text-sm">{order.valor}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${order.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-700' :
                                order.status === 'Processando' ? 'bg-orange-100 text-orange-700' :
                                  order.status === 'Recusado' ? 'bg-red-100 text-red-700' :
                                    order.status === 'Reembolsado' ? 'bg-blue-100 text-blue-700' :
                                      'bg-slate-100 text-slate-600'
                              }`}>{order.status}</span>
                            <button
                              onClick={() => setOrderDetailModal(order)}
                              className="text-xs font-bold text-[#1E5EFF] hover:underline flex items-center gap-1"
                            >
                              Ver pedido <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tickets section */}
                <div>
                  <h4 className="text-sm font-bold text-[#020854] mb-3 flex items-center gap-2">
                    <TicketIcon className="w-4 h-4" /> Tickets de Suporte
                  </h4>
                  {clientTicketsLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-[#1E5EFF]" /></div>
                  ) : clientTickets.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum ticket encontrado.</p>
                  ) : (
                    <div className="space-y-2">
                      {clientTickets.map(ticket => (
                        <div key={ticket.ticketId} className="flex items-center justify-between bg-[#F8FAFC] rounded-2xl px-4 py-3 gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-[#020854] text-sm">{ticket.ticketDisplayId}</p>
                            <p className="text-xs text-muted-foreground truncate">{ticket.problemType}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {ticket.openedAt && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(ticket.openedAt).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ticket.status === 'aberto' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                              {ticket.status === 'aberto' ? 'Aberto' : 'Resolvido'}
                            </span>
                            <button
                              onClick={() => setSelectedTicket(ticket)}
                              className="text-xs font-bold text-[#1E5EFF] hover:underline flex items-center gap-1"
                            >
                              Ver ticket <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Clickstream section */}
                <div className="mt-5">
                  <h4 className="text-sm font-bold text-[#020854] mb-3 flex items-center gap-2">
                    <MousePointer className="w-4 h-4" /> Comportamento de Navegação
                  </h4>
                  {clickstreamLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-[#1E5EFF]" /></div>
                  ) : !clickstream ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado de navegação encontrado.</p>
                  ) : (
                    <>
                      {/* Métricas principais */}
                      <div className="grid grid-cols-4 gap-3 mb-3">
                        {[
                          { label: 'Sessões', value: clickstream.total_sessoes ?? '—', icon: <Activity className="w-3.5 h-3.5" /> },
                          { label: 'Eventos', value: clickstream.total_eventos ?? '—', icon: <Zap className="w-3.5 h-3.5" /> },
                          { label: 'Canal Principal', value: clickstream.canal_mais_usado ?? '—', icon: <Globe className="w-3.5 h-3.5" /> },
                          { label: 'Dispositivo', value: clickstream.dispositivo_mais_usado ?? '—', icon: <Monitor className="w-3.5 h-3.5" /> },
                        ].map(({ label, value, icon }) => (
                          <div key={label} className="bg-[#F8FAFC] rounded-2xl p-4">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                              {icon} {label}
                            </p>
                            <p className="text-base font-bold text-[#020854] truncate">{value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Funil de conversão */}
                      <div className="bg-[#F8FAFC] rounded-2xl p-4">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                          Funil de Conversão
                        </p>
                        <div className="flex items-end gap-2">
                          {[
                            { label: 'Visualizações', value: clickstream.qtd_visualizacao_produto ?? 0, color: 'bg-blue-200' },
                            { label: 'Adições', value: clickstream.qtd_adicoes_carrinho ?? 0, color: 'bg-indigo-300' },
                            { label: 'Abandonos', value: clickstream.qtd_abandonos_carrinho ?? 0, color: 'bg-orange-300' },
                            { label: 'Compras', value: clickstream.qtd_compras ?? 0, color: 'bg-emerald-400' },
                          ].map(({ label, value, color }) => {
                            const max = Math.max(clickstream.qtd_visualizacao_produto ?? 0, 1)
                            const pct = Math.max(8, Math.round((value / max) * 80))
                            return (
                              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-xs font-bold text-[#020854]">{value}</span>
                                <div className={`w-full rounded-t-lg ${color} transition-all`} style={{ height: `${pct}px` }} />
                                <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {clickstream.data_ultima_sessao && (
                        <p className="text-[11px] text-muted-foreground mt-2 text-right">
                          Última sessão: {new Date(clickstream.data_ultima_sessao).toLocaleString('pt-BR')}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order detail sub-modal */}
      <ModalDetalhesPedido
        isOpen={!!orderDetailModal}
        onClose={() => setOrderDetailModal(null)}
        pedido={orderDetailModal}
      />
    </div>
  )
}