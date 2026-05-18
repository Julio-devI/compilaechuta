import { useState, useEffect, useCallback } from 'react'
import {
  Search, Table, Grid, ArrowUp, ArrowDown,
  Box, ChevronDown, ChevronUp, Crown, Sparkles, X,
  Loader2, Star, Ticket as TicketIcon, UserMinus, Trophy, Activity, Heart, AlertTriangle,
  ShoppingBag
} from 'lucide-react'

import type { Cliente, FiltrosClientes, ClientesKPIs } from '../services/customerService'
import { getClientes, getClienteStatusStyle, getClientesKPIs } from '../services/customerService'
import { ExportCsvButton, type ClientFilters } from '../components/ExportCsvButton'
import { Toaster, toast } from 'react-hot-toast'
import { apiUrl } from '../services/apiConfig'

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

  const fetchClientes = useCallback(async () => {
    setIsLoadingData(true)
    try {
      const filtros: FiltrosClientes = {
        search: searchTerm,
        status: filterTipoCliente !== 'Todos' ? filterTipoCliente : undefined,
        lvtMin: lvtMin > LTV_MIN ? lvtMin : undefined,
        lvtMax: lvtMax < LTV_MAX ? lvtMax : undefined,
        regiao: filterRegiao !== 'Todos' && filterRegiao !== 'Personalizar' ? filterRegiao : undefined,
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

  const tiposCliente = ['Todos', 'VIP', 'Recorrente', '1ª Compra', 'Inativo', 'Em Risco'];
  const categorias = ['Todos', 'Móveis', 'Eletrônicos', 'Lar'];
  const ticketStatuses = ['Todos', 'Sem ticket', 'Aberto', 'Finalizado'];
  const npsOptions = ['Todos', 'Neutro', 'Promotores', 'Detratores'];
  const csatOptions = ['Todos', 'Satisfeito', 'Insatisfeito'];
  const regioes = ['Todos', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul', 'Personalizar'];

  const hasActiveFilters =
    filterTipoCliente !== 'Todos' || filterCategoria !== 'Todos' ||
    filterTicketStatus !== 'Todos' || filterNPS !== 'Todos' ||
    filterCSAT !== 'Todos' || filterRegiao !== 'Todos' ||
    filterSKU !== '' || lvtMin > LTV_MIN || lvtMax < LTV_MAX || searchTerm !== '' ||
    filterNPS !== 'Todos' || filterCSAT !== 'Todos';

  const PillButton = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
        active
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

      <h1 className="text-5xl font-bold text-[#020854] dark:text-foreground mb-8">Clientes</h1>

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
              placeholder="Busca por pedidos, cliente, produto, etc..."
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
                  <select
                    value={filterSKU}
                    onChange={(e) => { setFilterSKU(e.target.value); setPage(1); }}
                    className="w-full py-2 bg-[#F1F5F9] dark:bg-background rounded-full px-4 outline-none text-sm text-muted-foreground border-none appearance-none focus:ring-1 focus:ring-[#1E5EFF]/50"
                  >
                    <option value="">Todos os Produtos</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
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
        <ExportCsvButton<ClientFilters>
          type="client"
          filters={{
            rfmSegment: filterTipoCliente !== 'Todos' ? filterTipoCliente : undefined,
            ltvFloor: lvtMin > LTV_MIN ? lvtMin : undefined,
            ltvCeil: lvtMax < LTV_MAX ? lvtMax : undefined,
            region: filterRegiao !== 'Todos' ? filterRegiao : undefined,
          }}
          endpoint={apiUrl('/clients/exportar')}
          onSuccess={(msg) => toast.success(msg)}
          onError={(err) => toast.error(err)}
        />
        <Toaster position="top-right" />
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
                  <th className="py-3.5 px-4 rounded-tl-2xl w-10">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded accent-white"
                    />
                  </th>
                  <th className="py-3.5 px-4 text-left text-white font-medium text-xs cursor-pointer" onClick={() => handleSort('nome')}>
                    <div className="flex items-center gap-1">Nome / Localização <SortIcon columnKey="nome" /></div>
                  </th>
                  <th className="py-3.5 px-4 text-left text-white font-medium text-xs">Interesse</th>
                  <th className="py-3.5 px-4 text-left text-white font-medium text-xs cursor-pointer" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-1">Tipo <SortIcon columnKey="status" /></div>
                  </th>
                  <th className="py-3.5 px-4 text-left text-white font-medium text-xs cursor-pointer" onClick={() => handleSort('qtd_tickets_suporte')}>
                    <div className="flex items-center gap-1">Tickets <SortIcon columnKey="qtd_tickets_suporte" /></div>
                  </th>
                  <th className="py-3.5 px-4 text-left text-white font-medium text-xs">Histórico</th>
                  <th className="py-3.5 px-4 text-left text-white font-medium text-xs rounded-tr-2xl">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedClientes.map((cliente) => {
                  const nps = getNPS(cliente.estrelas);
                  const csat = getCSAT(cliente.estrelas);
                  return (
                    <tr
                      key={cliente.id}
                      className="border-b border-border hover:bg-[#1E5EFF]/5 dark:hover:bg-[#1E5EFF]/10 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(cliente.id)}
                          onChange={() => handleSelectOne(cliente.id)}
                          className="w-4 h-4 rounded border-gray-300 accent-[#1E5EFF]"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-[#BAE6FD] rounded-full flex items-center justify-center text-[#020854] text-sm font-bold shrink-0">
                            {cliente.nome.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm leading-tight">{cliente.nome}</p>
                            <p className="text-xs text-muted-foreground">{cliente.cidade}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 bg-[#DBEAFE] text-[#1D4ED8] rounded-full text-xs font-medium">
                          {cliente.categoriaInteresse ?? 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${getClienteStatusStyle(cliente.status)}`}>
                          <StatusIcon status={cliente.status} />
                          {cliente.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-foreground">
                        {cliente.qtd_tickets_suporte}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-5">
                          <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">PEDIDOS</p>
                            <p className="text-sm font-semibold text-foreground">{cliente.totalPedidos}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">NPS</p>
                            <p className={`text-sm font-semibold ${getNPSStyle(nps)}`}>{nps}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">LTV</p>
                            <p className="text-sm font-semibold text-foreground">{cliente.lvtTotal}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">CSAT</p>
                            <p className={`text-sm font-semibold ${getCSATStyle(csat)}`}>{csat}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          className="text-sm font-medium text-[#1E5EFF] hover:underline cursor-pointer"
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

      {/* Modal */}
      {showModal && selectedCliente && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            className="w-175 max-h-[90vh] bg-white rounded-[40px] shadow-2xl relative overflow-y-auto scrollbar-hide animate-in fade-in zoom-in duration-300 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-6 right-6 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-7 h-7 text-black" />
              </button>

              <h2 className="text-3xl font-bold text-[#020854] mb-4">Detalhes do Cliente</h2>

              <div className="border border-[#BAE6FD] rounded-3xl p-5 mb-4 bg-white">
                <div className="w-16 h-16 bg-[#BAE6FD] rounded-full flex items-center justify-center text-[#020854] text-2xl font-bold mb-2">
                  {selectedCliente.nome.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-[#020854]">{selectedCliente.nome}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${getClienteStatusStyle(selectedCliente.status)}`}>
                    <StatusIcon status={selectedCliente.status} />
                    {selectedCliente.status}
                  </span>
                </div>
                <div className="space-y-1 text-[#64748B] text-sm">
                  <p>{selectedCliente.totalPedidos} pedidos no total</p>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    Média de Estrelas: {selectedCliente.estrelas ?? '0.0'}
                  </div>
                  <div className="flex items-center gap-2">
                    <TicketIcon className="w-4 h-4 text-blue-500" />
                    Tickets de suporte: {selectedCliente.qtd_tickets_suporte ?? '0'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4" />
                    {selectedCliente.cidade}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#F8FAFC] rounded-2xl p-4">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">LTV Total</p>
                  <p className="text-lg font-bold text-[#020854]">{selectedCliente.lvtTotal}</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-2xl p-4">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Ticket Médio</p>
                  <p className="text-lg font-bold text-[#020854]">{selectedCliente.ticketMedio}</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-2xl p-4">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">NPS</p>
                  <p className={`text-lg font-bold ${getNPSStyle(getNPS(selectedCliente.estrelas))}`}>
                    {getNPS(selectedCliente.estrelas)}
                  </p>
                </div>
                <div className="bg-[#F8FAFC] rounded-2xl p-4">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">CSAT</p>
                  <p className={`text-lg font-bold ${getCSATStyle(getCSAT(selectedCliente.estrelas))}`}>
                    {getCSAT(selectedCliente.estrelas)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
