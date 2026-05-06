import { useState } from 'react'
import {
  Search, Download, Table, Grid, ArrowUp,
  ArrowDown, Box, Calendar, ChevronDown, ChevronUp, Maximize2,
  ShoppingCart, Crown, RotateCcw, Sparkles
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

  // --- Lógica de Ordenação e Filtro ---

  const handleSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
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
    if (sortConfig.key !== columnKey) return <ArrowUp className="w-6 h-6 text-white opacity-50 ml-auto" />;
    return sortConfig.direction === 'ascending'
      ? <ArrowUp className="w-6 h-6 text-white ml-auto" />
      : <ArrowDown className="w-6 h-6 text-white ml-auto" />;
  };

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-5xl font-bold text-[#020854]">Clientes</h1>
      </div>

      {/* Top Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-5 h-5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, email, CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white rounded-4xl border border-[#E2E8F0] w-[500px] focus:ring-2 focus:ring-[#1E5EFF]/20 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#020854]">Visualizar por:</span>
            <div className="flex bg-white rounded-lg p-1 border border-[#E2E8F0]">
              <button
                onClick={() => setViewMode('tabela')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'tabela' ? 'bg-[#1E5EFF] text-white shadow-sm' : 'text-[#64748B] hover:bg-[#F8FAFC]'}`}
              >
                <Table className="w-4 h-4" /> Tabela
              </button>
              <button
                onClick={() => setViewMode('grade')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'grade' ? 'bg-[#1E5EFF] text-white shadow-sm' : 'text-[#64748B] hover:bg-[#F8FAFC]'}`}
              >
                <Grid className="w-4 h-4" /> Grade
              </button>
            </div>
          </div>
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 bg-[#EBEBF0] border border-[#E2E8F0] rounded-4xl text-[#6B7588] font-medium hover:bg-[#F8FAFC] shadow-sm transition-all">
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* PAINEL DE FILTROS EXPANSÍVEL (Estilo image_84758e.png) */}
      <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm mb-8 overflow-hidden transition-all">
        <div
          className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-[#F8FAFC]"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="flex items-center gap-2 font-bold text-[#1E293B]">
            {showFilters ? <ChevronUp className="w-5 h-5 text-[#1E293B]" /> : <ChevronDown className="w-5 h-5 text-[#1E293B]" />}
            <span>{showFilters ? 'Esconder Filtros' : 'Mostrar Filtros'}</span>
          </div>
          <Maximize2 className="w-4 h-4 text-[#94A3B8]" />
        </div>

        {showFilters && (
          <div className="px-8 pb-8 pt-4 grid grid-cols-12 gap-y-8 gap-x-12 border-t border-[#F1F5F9] animate-in fade-in slide-in-from-top-2 duration-300">
            {/* SKU Produto */}
            <div className="col-span-4">
              <div className="flex items-center gap-2 mb-3 font-bold text-[#1E293B]">
                <Box className="w-5 h-5" /> <span>SKU Produto</span>
              </div>
              <div className="relative">
                <select className="w-full p-3 bg-[#F1F5F9] rounded-full border-none text-[#94A3B8] appearance-none px-6 outline-none">
                  <option>Todos os Produtos</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              </div>
            </div>

            {/* Período de Abertura */}
            <div className="col-span-4">
              <div className="flex items-center gap-2 mb-3 font-bold text-[#1E293B]">
                <Calendar className="w-5 h-5" /> <span>Período de Abertura</span>
              </div>
              <div className="flex gap-2">
                <button className="px-5 py-1 bg-[#1E5EFF] text-white rounded-full text-sm font-medium">Todos</button>
                <button className="px-5 py-1 bg-[#F1F5F9] text-[#64748B] rounded-full text-sm font-medium hover:bg-[#E2E8F0]">Hoje</button>
                <button className="px-5 py-1 bg-[#F1F5F9] text-[#64748B] rounded-full text-sm font-medium hover:bg-[#E2E8F0]">Últimos 7 dias</button>
                <button className="px-5 py-1 bg-[#F1F5F9] text-[#64748B] rounded-full text-sm font-medium hover:bg-[#E2E8F0]">Personalizado</button>
              </div>
            </div>

            {/* Tipo de Cliente */}
            <div className="col-span-4">
              <div className="flex items-center gap-2 mb-3 font-bold text-[#1E293B]">
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
              <div className="flex items-center gap-2 mb-3 font-bold text-[#1E293B]">
                <ShoppingCart className="w-5 h-5" /> <span>Status</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Compra', color: 'text-[#A855F7]', bg: 'bg-[#F2F2F5]', dot: 'bg-[#A855F7]' },
                  { label: 'Processamento', color: 'text-[#F97316]', bg: 'bg-[#F2F2F5]', dot: 'bg-[#F97316]' },
                  { label: 'Enviado', color: 'text-[#EAB308]', bg: 'bg-[#F2F2F5]', dot: 'bg-[#EAB308]' },
                  { label: 'Em Trânsito', color: 'text-[#1E5EFF]', bg: 'bg-[#F2F2F5]', dot: 'bg-[#1E5EFF]' },
                  { label: 'Atrasado', color: 'text-[#EF4444]', bg: 'bg-[#F2F2F5]', dot: 'bg-[#EF4444]' },
                  { label: 'Entregue', color: 'text-[#22C55E]', bg: 'bg-[#F2F2F5]', dot: 'bg-[#22C55E]' },
                  { label: 'Cancelado', color: 'text-[#020854]', bg: 'bg-[#F2F2F5]', dot: 'bg-[#020854]' },
                ].map((s) => (
                  <button key={s.label} className={`flex items-center gap-2 px-4 py-2 ${s.bg} ${s.color} rounded-full text-xs font-bold transition-all hover:opacity-80`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} /> {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ticket Segment */}
            <div className="col-span-4">
              <div className="flex items-center gap-2 mb-3 font-bold text-[#1E293B]">
                <Calendar className="w-5 h-5" /> <span>Ticket</span>
              </div>
              <div className="flex gap-2">
                <button className="px-5 py-2 bg-[#1E5EFF] text-white rounded-full text-sm font-medium">Não tem</button>
                <button className="px-5 py-2 bg-[#F1F5F9] text-[#64748B] rounded-full text-sm font-medium hover:bg-[#E2E8F0]">Aberto</button>
                <button className="px-5 py-2 bg-[#F1F5F9] text-[#64748B] rounded-full text-sm font-medium hover:bg-[#E2E8F0]">Finalizado</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden">
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
                    <span className="font-medium text-[#1E293B] text-sm">{cliente.nome}</span>
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
                <td className="py-4 px-2 text-center text-sm font-medium text-[#1E293B]">
                  {cliente.lvtTotal}
                </td>
                <td className="py-4 px-2 text-center text-sm font-medium text-[#1E293B]">
                  {cliente.ultimoPedido}
                </td>
                <td className="py-4 px-2 text-center text-sm font-medium text-[#1E293B]">
                  {cliente.ticketMedio}
                </td>
                <td className="py-4 px-2 text-center">
                  <span className={`px-4 py-1 rounded-full text-xs font-bold border ${cliente.segmento === 'Moda' ? 'border-[#38BDF8] text-[#0369A1]' : 'border-[#3B82F6] text-[#1E40AF]'}`}>
                    {cliente.segmento}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <button className="text-sm font-medium text-[#1E293B] hover:underline">
                    Ver detalhes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {/* Pagination */}
        <div className="p-6 flex items-center justify-between border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <p className="text-sm text-[#64748B] font-medium">Mostrando {filteredClientes.length} de {clientes.length} clientes</p>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 border border-[#E2E8F0] rounded-xl text-sm text-[#64748B] bg-white hover:bg-gray-50 font-medium">Anterior</button>
            <button className="px-4 py-2 bg-[#1E5EFF] text-white rounded-xl text-sm font-bold shadow-sm">1</button>
            <button className="px-4 py-2 border border-[#E2E8F0] rounded-xl text-sm text-[#64748B] bg-white hover:bg-gray-50 font-medium">2</button>
            <button className="px-4 py-2 border border-[#E2E8F0] rounded-xl text-sm text-[#64748B] bg-white hover:bg-gray-50 font-medium">Próximo</button>
          </div>
        </div>
      </div>
    </div>
  )
}