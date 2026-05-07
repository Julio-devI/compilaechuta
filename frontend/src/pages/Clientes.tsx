import { useState } from 'react'
import {
  Search, Download, Table, Grid, ArrowUp,
  ArrowDown, Box, Calendar, ChevronDown, ChevronUp, Maximize2,
  ShoppingCart, Crown, RotateCcw, Sparkles, X, Mail, Phone, Flame
} from 'lucide-react'

// --- Interfaces e Tipagens ---

interface Cliente {
  id: number
  nome: string
  email: string
  telefone: string
  cidade: string
  totalPedidos: number
  lvtTotal: string
  ultimoPedido: string
  ticketMedio: string
  segmento: 'Moda' | 'Eletrônicos'
  status: 'VIP' | 'Recorrente' | '1ª Compra' | 'Inativo'
  avatar: string
  tendencia: 'up' | 'down' | 'stable'
}

type SortConfig = {
  key: string | null;
  direction: 'ascending' | 'descending';
};

// --- Dados de Exemplo ---

const clientes: Cliente[] = [
  { id: 1, nome: 'Marina Albuquerque', email: 'marina@email.com', telefone: '(11) 99999-0000', cidade: 'São Paulo, SP', totalPedidos: 45, lvtTotal: 'R$ 10.540', ultimoPedido: 'R$ 10.540', ticketMedio: 'R$ 250', segmento: 'Moda', status: 'VIP', avatar: 'https://i.pravatar.cc/150?u=1', tendencia: 'up' },
  { id: 2, nome: 'Marina Albuquerque', email: 'marina@email.com', telefone: '(11) 99999-0000', cidade: 'Rio de Janeiro, RJ', totalPedidos: 32, lvtTotal: 'R$ 10.540', ultimoPedido: 'R$ 10.540', ticketMedio: 'R$ 250', segmento: 'Eletrônicos', status: 'Recorrente', avatar: 'https://i.pravatar.cc/150?u=2', tendencia: 'up' },
  { id: 3, nome: 'Marina Albuquerque', email: 'marina@email.com', telefone: '(11) 99999-0000', cidade: 'Belo Horizonte, MG', totalPedidos: 28, lvtTotal: 'R$ 10.540', ultimoPedido: 'R$ 10.540', ticketMedio: 'R$ 250', segmento: 'Moda', status: 'VIP', avatar: 'https://i.pravatar.cc/150?u=3', tendencia: 'stable' },
  { id: 4, nome: 'Marina Albuquerque', email: 'marina@email.com', telefone: '(11) 99999-0000', cidade: 'Curitiba, PR', totalPedidos: 18, lvtTotal: 'R$ 10.540', ultimoPedido: 'R$ 10.540', ticketMedio: 'R$ 250', segmento: 'Moda', status: '1ª Compra', avatar: 'https://i.pravatar.cc/150?u=4', tendencia: 'down' },
  { id: 5, nome: 'Marina Albuquerque', email: 'marina@email.com', telefone: '(11) 99999-0000', cidade: 'Porto Alegre, RS', totalPedidos: 12, lvtTotal: 'R$ 10.540', ultimoPedido: 'R$ 10.540', ticketMedio: 'R$ 250', segmento: 'Eletrônicos', status: 'VIP', avatar: 'https://i.pravatar.cc/150?u=5', tendencia: 'down' },
  { id: 6, nome: 'Marina Albuquerque', email: 'marina@email.com', telefone: '(11) 99999-0000', cidade: 'Salvador, BA', totalPedidos: 56, lvtTotal: 'R$ 10.540', ultimoPedido: 'R$ 10.540', ticketMedio: 'R$ 250', segmento: 'Eletrônicos', status: '1ª Compra', avatar: 'https://i.pravatar.cc/150?u=6', tendencia: 'up' },
  { id: 7, nome: 'Marina Albuquerque', email: 'marina@email.com', telefone: '(11) 99999-0000', cidade: 'Brasília, DF', totalPedidos: 8, lvtTotal: 'R$ 10.540', ultimoPedido: 'R$ 10.540', ticketMedio: 'R$ 250', segmento: 'Moda', status: 'Inativo', avatar: 'https://i.pravatar.cc/150?u=7', tendencia: 'stable' },
];

const statusStyles = {
  'VIP': 'bg-[#020854] text-white',
  'Recorrente': 'bg-[#BAE6FD] text-[#0369A1]',
  '1ª Compra': 'bg-[#1E5EFF] text-white',
  'Inativo': 'bg-[#FF4757] text-white'
}

// --- Componente Principal ---

export function Clientes() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus] = useState<string>('todos')
  const [viewMode, setViewMode] = useState<string>('tabela')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'ascending' });
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // --- Lógica de Ordenação e Filtro ---

  const handleSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleViewChange = (mode: string) => {
    if (viewMode === mode) return;

    setIsLoading(true);
    setViewMode(mode);

    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

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

  const filteredClientes = sortedClientes.filter(cliente => {
    const matchesSearch = cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cliente.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'todos' || cliente.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return <ArrowUp className="w-6 h-6 text-white ml-auto" />;
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
      <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
        <div className="h-8 w-24 bg-gray-200 rounded-full"></div>
      </div>
    </div>
  );

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
              placeholder="Buscar por nome, email, CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-cardrounded-4xl border border-border w-[500px] focus:ring-2 focus:ring-[#1E5EFF]/20 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#020854] dark:text-foreground">Visualizar por:</span>
            <div className="flex bg-cardrounded-lg p-1 border border-border">
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

        <button className="flex items-center gap-2 px-4 py-2.5 bg-background border border-border rounded-4xl text-[#6B7588] font-medium hover:bg-background shadow-sm transition-all">
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* PAINEL DE FILTROS EXPANSÍVEL */}
      <div className="bg-card rounded-3xl border border-border shadow-sm mb-8 overflow-hidden transition-all">
        <div
          className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-background"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="flex items-center gap-2 font-bold text-foreground">
            {showFilters ? <ChevronUp className="w-5 h-5 text-foreground" /> : <ChevronDown className="w-5 h-5 text-foreground" />}
            <span>{showFilters ? 'Esconder Filtros' : 'Mostrar Filtros'}</span>
          </div>
          <Maximize2 className="w-4 h-4 text-muted-foreground" />
        </div>

        {showFilters && (
          <div className="px-8 pb-8 pt-4 grid grid-cols-12 gap-y-8 gap-x-12 border-t border-[#F1F5F9] animate-in fade-in slide-in-from-top-2 duration-300">
            {/* SKU Produto */}
            <div className="col-span-4">
              <div className="flex items-center gap-2 mb-3 font-bold text-foreground">
                <Box className="w-5 h-5" /> <span>SKU Produto</span>
              </div>
              <div className="relative">
                <select className="w-full p-3 bg-background rounded-full border-none text-muted-foreground appearance-none px-6 outline-none">
                  <option>Todos os Produtos</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            {/* Período de Abertura */}
            <div className="col-span-4">
              <div className="flex items-center gap-2 mb-3 font-bold text-foreground">
                <Calendar className="w-5 h-5" /> <span>Período de Abertura</span>
              </div>
              <div className="flex gap-2">
                <button className="px-5 py-1 bg-[#1E5EFF] text-white rounded-full text-sm font-medium">Todos</button>
                <button className="px-5 py-1 bg-background text-muted rounded-full text-sm font-medium hover:bg-[#E2E8F0]">Hoje</button>
                <button className="px-5 py-1 bg-background text-muted rounded-full text-sm font-medium hover:bg-[#E2E8F0]">Últimos 7 dias</button>
                <button className="px-5 py-1 bg-background text-muted rounded-full text-sm font-medium hover:bg-[#E2E8F0]">Personalizado</button>
              </div>
            </div>

            {/* Tipo de Cliente */}
            <div className="col-span-4">
              <div className="flex items-center gap-2 mb-3 font-bold text-foreground">
                <Calendar className="w-5 h-5" /> <span>Tipo de Cliente</span>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-[#020854] text-white rounded-full text-sm font-medium flex items-center gap-2 shadow-md">
                  <Crown className="w-4 h-4 text-yellow-400" /> VIP
                </button>
                <button className="px-4 py-2 bg-[#BAE6FD] text-[#0369A1] rounded-full text-sm font-medium flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Recorrente
                </button>
                <button className="px-4 py-2 bg-[#1E5EFF] text-white rounded-full text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> 1ª Compra
                </button>
              </div>
            </div>

            {/* Status Flow */}
            <div className="col-span-8">
              <div className="flex items-center gap-2 mb-3 font-bold text-foreground">
                <ShoppingCart className="w-5 h-5" /> <span>Status</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Compra', color: 'text-[#A855F7]', bg: 'bg-background', dot: 'bg-[#A855F7]' },
                  { label: 'Processamento', color: 'text-[#F97316]', bg: 'bg-background', dot: 'bg-[#F97316]' },
                  { label: 'Enviado', color: 'text-[#EAB308]', bg: 'bg-background', dot: 'bg-[#EAB308]' },
                  { label: 'Em Trânsito', color: 'text-[#1E5EFF]', bg: 'bg-background', dot: 'bg-[#1E5EFF]' },
                  { label: 'Atrasado', color: 'text-[#EF4444]', bg: 'bg-background', dot: 'bg-[#EF4444]' },
                  { label: 'Entregue', color: 'text-[#22C55E]', bg: 'bg-background', dot: 'bg-[#22C55E]' },
                  { label: 'Cancelado', color: 'text-[#020854] dark:text-foreground', bg: 'bg-background', dot: 'bg-[#020854]' },
                ].map((s) => (
                  <button key={s.label} className={`flex items-center gap-2 px-4 py-2 ${s.bg} ${s.color} rounded-full text-xs font-bold transition-all hover:opacity-80`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} /> {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ticket Segment */}
            <div className="col-span-4">
              <div className="flex items-center gap-2 mb-3 font-bold text-foreground">
                <Calendar className="w-5 h-5" /> <span>Ticket</span>
              </div>
              <div className="flex gap-2">
                <button className="px-5 py-2 bg-[#1E5EFF] text-white rounded-full text-sm font-medium">Não tem</button>
                <button className="px-5 py-2 bg-background text-muted rounded-full text-sm font-medium hover:bg-[#E2E8F0]">Aberto</button>
                <button className="px-5 py-2 bg-background text-muted rounded-full text-sm font-medium hover:bg-[#E2E8F0]">Finalizado</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
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
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 accent-[#1E5EFF]" />
                  </th>
                  <th className="py-4 px-2 text-white font-medium text-sm cursor-pointer" onClick={() => handleSort('nome')}>
                    <div className="flex items-center gap-2">Cliente <SortIcon columnKey="nome" /></div>
                  </th>
                  <th className="py-4 px-2 text-white font-medium text-sm text-center cursor-pointer" onClick={() => handleSort('status')}>
                    <div className="flex items-center justify-center gap-2">Tipo de Cliente <SortIcon columnKey="status" /></div>
                  </th>
                  <th className="py-4 px-2 text-white font-medium text-sm text-center cursor-pointer" onClick={() => handleSort('lvtTotal')}>
                    <div className="flex items-center justify-center gap-2">LVT Total <SortIcon columnKey="lvtTotal" /></div>
                  </th>
                  <th className="py-4 px-2 text-white font-medium text-sm text-center cursor-pointer" onClick={() => handleSort('ultimoPedido')}>
                    <div className="flex items-center justify-center gap-2">Último Pedido <SortIcon columnKey="ultimoPedido" /></div>
                  </th>
                  <th className="py-4 px-2 text-white font-medium text-sm text-center cursor-pointer" onClick={() => handleSort('ticketMedio')}>
                    <div className="flex items-center justify-center gap-2">Ticket médio <SortIcon columnKey="ticketMedio" /></div>
                  </th>
                  <th className="py-4 px-2 text-white font-medium text-sm text-center cursor-pointer" onClick={() => handleSort('segmento')}>
                    <div className="flex items-center justify-center gap-2">Segmento <SortIcon columnKey="segmento" /></div>
                  </th>
                  <th className="py-4 px-4 text-white font-medium text-sm text-right rounded-r-xl">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientes.map((cliente) => (
                  <tr key={cliente.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-300 accent-[#1E5EFF]" />
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3">
                        <img src={cliente.avatar} alt={cliente.nome} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                        <span className="font-medium text-foreground text-sm">{cliente.nome}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles[cliente.status]}`}>
                        {cliente.status === 'VIP' && <Crown className="w-3 h-3" />}
                        {cliente.status === 'Recorrente' && <RotateCcw className="w-3 h-3" />}
                        {cliente.status === '1ª Compra' && <Sparkles className="w-3 h-3" />}
                        {cliente.status}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-center text-sm font-medium text-foreground">{cliente.lvtTotal}</td>
                    <td className="py-4 px-2 text-center text-sm font-medium text-foreground">{cliente.ultimoPedido}</td>
                    <td className="py-4 px-2 text-center text-sm font-medium text-foreground">{cliente.ticketMedio}</td>
                    <td className="py-4 px-2 text-center">
                      <span className={`px-4 py-1 rounded-full text-xs font-bold border ${cliente.segmento === 'Moda' ? 'border-[#38BDF8] text-[#0369A1]' : 'border-[#3B82F6] text-[#1E40AF]'}`}>{cliente.segmento}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button 
                        className="text-sm font-medium text-foreground hover:underline cursor-pointer"
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
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClientes.map((cliente) => (
              <div key={cliente.id} className="bg-card p-6 rounded-2xl border border-[#ADE9FF] flex flex-col justify-between shadow-[0_4px_24px_-8px_rgba(0,110,219,0.12)] hover:shadow-lg transition-shadow">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <img src={cliente.avatar} alt={cliente.nome} className="w-16 h-16 rounded-full object-cover" />
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-[#020854] dark:text-foreground">{cliente.nome}</h3>
                      <p className="text-sm text-gray-500">{cliente.cidade}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">LVT Total</span>
                      <span className="font-medium text-foreground">{cliente.lvtTotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ticket Médio</span>
                      <span className="font-medium text-foreground">{cliente.ticketMedio}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusStyles[cliente.status]}`}>
                        {cliente.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                  <button 
                    className="text-sm font-medium text-foreground hover:underline"
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
          <p className="text-sm text-muted font-medium">Mostrando {filteredClientes.length} de {clientes.length} clientes</p>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 border border-border rounded-xl text-sm text-muted bg-cardhover:bg-gray-50 font-medium">Anterior</button>
            <button className="px-4 py-2 bg-[#1E5EFF] text-white rounded-xl text-sm font-bold shadow-sm">1</button>
            <button className="px-4 py-2 border border-border rounded-xl text-sm text-muted bg-cardhover:bg-gray-50 font-medium">2</button>
            <button className="px-4 py-2 border border-border rounded-xl text-sm text-muted bg-cardhover:bg-gray-50 font-medium">Próximo</button>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes do Cliente */}
      {showModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
    {/* Container Principal com Scroll e Altura Máxima */}
    <div className="w-[800px] max-h-[95vh] bg-cardrounded-[40px] shadow-2xl relative overflow-y-auto scrollbar-hide animate-in fade-in zoom-in duration-300 my-auto">

      {/* O conteúdo interno precisa de um wrapper para o padding não bugar com o scroll */}
      <div className="p-5">

        {/* Botão Fechar e Stack de Avatares (Topo Direito) */}
        <div className="absolute top-6 right-8 flex flex-col items-end gap-4">
          <button
            onClick={() => setShowModal(false)}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-8 h-8 text-black" />
          </button>
        </div>

        <h2 className="text-[40px] font-bold text-[#020854] dark:text-foreground mb-2">Detalhes do Cliente</h2>

        {/* Card de Perfil Azul Claro */}
        <div className="border border-[#BAE6FD] rounded-[35px] p-5 mb-2 relative bg-card">
          <div className="w-20 h-20 bg-[#BAE6FD] rounded-full flex items-center justify-center text-[#020854] dark:text-foreground text-3xl font-medium mb-1">
            {selectedCliente ? selectedCliente.nome.substring(0, 2).toUpperCase() : 'AA'}
          </div>

          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-bold text-[#020854] dark:text-foreground">
              {selectedCliente?.nome || 'Marina Albuquerque'}
            </h3>
            <span className="bg-[#020854] text-[#BAE6FD] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <Crown className="w-3 h-3" /> VIP
            </span>
          </div>

          <div className="space-y-1 text-muted text-base">
            <p>{selectedCliente ? `${selectedCliente.totalPedidos} pedidos no total` : '38 pedidos no total'}</p>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" /> {selectedCliente?.email || 'marina.alb@email.com'}
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" /> {selectedCliente?.telefone || '(11) 98821-4477'}
            </div>
            <p>{selectedCliente?.cidade || 'São Paulo, SP'}</p>
          </div>
        </div>

        {/* Seção Produtos & Performance */}
        <div className="border border-gray-100 rounded-[35px] p-5 shadow-sm bg-card">
          <span className="text-[#1E5EFF] text-xs font-bold tracking-widest uppercase mb-2 block">
            Informações Gerais
          </span>
          <h4 className="text-2xl font-bold text-[#020854] dark:text-foreground mb-6">Produtos & Performance</h4>

          <div className="space-y-4">
            {/* Produto 1 */}
            <div className="bg-background rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-cardrounded-xl flex items-center justify-center border border-gray-100">
                <Box className="w-6 h-6 text-black" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-[#020854] dark:text-foreground text-sm">Smart TV 55" QLED 4K Vivara</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase">SKU ELE-9921 · qtd 1</p>
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
                <p className="font-bold text-[#020854] dark:text-foreground text-sm">R$ 3.499,00</p>
                <p className="text-[10px] text-muted-foreground">R$ 3.499,00 un</p>
              </div>
            </div>

            {/* Produto 2 */}
            <div className="bg-background rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-cardrounded-xl flex items-center justify-center border border-gray-100">
                <Box className="w-6 h-6 text-black" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-[#020854] dark:text-foreground text-sm">Soundbar Bluetooth 2.1 Atmos</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase">SKU LAR-2210 · qtd 1</p>
                <div className="flex gap-2 mt-2">
                  <span className="bg-[#E0F2FE] text-[#0369A1] px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Novo
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#020854] dark:text-foreground text-sm">R$ 790,90</p>
                <p className="text-[10px] text-muted-foreground">R$ 790,90 un</p>
              </div>
            </div>
          </div>

          {/* Botão Ver Perfil Completo */}
          <div className="flex justify-end mt-2">
            <button className="bg-[#BAE6FD] text-[#020854] dark:text-foreground px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-[#7DD3FC] transition-colors text-sm">
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
