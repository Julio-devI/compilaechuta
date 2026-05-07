import { useState } from 'react'
import {
  Search, Maximize2, Minimize2, ChevronDown, ChevronUp, History,
  AlertCircle, CheckCircle2, Database, Box, Calendar,
  Filter, Ticket, Table, Grid
} from 'lucide-react'
import { ModalDetalhesPedido } from '../components/ModalDetalhesPedido'

// --- Interfaces ---
interface Pedido {
  id: string
  cliente: string
  cidade: string
  estado: string
  produtos: number
  valor: string
  data: string
  status: 'Atrasado' | 'No prazo'
  recorrente: boolean
  ticket: number
  tempoAberto: string
  progresso: number
}

// --- Mock de Dados ---
const pedidosMock: Pedido[] = Array(5).fill({
  id: 'VC-308422',
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
  progresso: 4
}).map((pedido, index) => ({ ...pedido, id: `VC-30842${index}` }));

export function Pedidos() {
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null)
  const [isFiltrosOpen, setIsFiltrosOpen] = useState(true)
  const [viewMode, setViewMode] = useState<'tabela' | 'grade'>('tabela')
  const [isLoading, setIsLoading] = useState(false)

  const handleViewChange = (mode: 'tabela' | 'grade') => {
    if (viewMode === mode) return;

    setIsLoading(true);
    setViewMode(mode);

    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  const PedidoCardSkeleton = () => (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 animate-pulse flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col gap-2 w-1/2">
            <div className="h-6 bg-slate-200 rounded w-full"></div>
            <div className="h-3 bg-slate-200 rounded w-2/3"></div>
          </div>
          <div className="h-5 w-16 bg-slate-200 rounded-full"></div>
        </div>
        
        <div className="bg-[#F1F5F9] rounded-2xl p-4 mb-4 space-y-2">
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
      
      <div className="mt-6 pt-4 border-t border-slate-100">
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
    <div className="min-h-screen bg-[#F8FAFC] p-8 font-sans text-slate-900">
      <h1 className="text-4xl font-bold text-[#020854] mb-8">Pedidos</h1>

      {/* 1. Database Search Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border-0 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-slate-700 font-bold">
            <span className="p-1.5 bg-slate-100 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-slate-600" />
            </span>
            Consultar Database
          </div>
          <div className="text-sm font-semibold text-slate-500">
            Total <span className="text-blue-700 ml-2 font-black">300.000</span>
          </div>
        </div>

        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por ID do pedido, cliente ou SKU..."
            className="w-full pl-12 pr-4 py-4 bg-[#F1F5F9] rounded-2xl border-none text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className="text-slate-400 text-sm">Exibindo</span>
            <span className="bg-sky-400 text-white px-2 py-0.5 rounded-full text-xs font-bold">6</span>
          </div>
        </div>
      </div>

      {/* 2. Seção de Filtros (Conforme Imagem) */}
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
                  <Box className="w-4 h-4" /> SKU Produto
                </label>
                <div className="relative">
                  <select className="w-full p-4 bg-[#F1F5F9] rounded-2xl border-none text-slate-400 outline-none appearance-none cursor-pointer">
                    <option>Todos os Produtos</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 font-black text-[#020854] mb-3 text-sm">
                  <Filter className="w-4 h-4" /> Status
                </label>
                <div className="flex flex-wrap gap-2">
                  <StatusChip label="Compra" color="bg-[#F2F2F5] text-purple-600" dot="bg-purple-500" />
                  <StatusChip label="Processamento" color="bg-[#F2F2F5] text-orange-600" dot="bg-orange-500" />
                  <StatusChip label="Enviado" color="bg-[#F2F2F5] text-yellow-500" dot="bg-yellow-400" />
                  <StatusChip label="Em Trânsito" color="bg-[#F2F2F5] text-blue-600" dot="bg-blue-500" />
                  <StatusChip label="Atrasado" color="bg-[#F2F2F5] text-red-600" dot="bg-red-500" />
                  <StatusChip label="Entregue" color="bg-[#F2F2F5] text-green-600" dot="bg-green-500" />
                  <StatusChip label="Cancelado" color="bg-[#F2F2F5] text-slate-800" dot="bg-[#020854]" />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 font-black text-[#020854] mb-3 text-sm">
                  <Calendar className="w-4 h-4" /> Tipo de Cliente
                </label>
                <div className="flex flex-wrap gap-2">
                  <button className="bg-[#020854] text-white px-4 py-2 rounded-full text-xs font-black flex items-center gap-2">
                    <span>👑</span> VIP
                  </button>
                  <button className="bg-[#BDEBFF] text-[#0070E0] px-4 py-2 rounded-full text-xs font-black flex items-center gap-2">
                    <History className="w-3.5 h-3.5 rotate-180" /> Recorrente
                  </button>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-full text-xs font-black flex items-center gap-2">
                    <span className="text-sm">✦</span> 1ª Compra
                  </button>
                  <button className="bg-red-500 text-white px-4 py-2 rounded-full text-xs font-black flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[10px]">×</div> Inativo
                  </button>
                  <button className="bg-yellow-400 text-white px-4 py-2 rounded-full text-xs font-black flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5" /> Em risco
                  </button>
                </div>
              </div>
            </div>

            {/* Coluna Direita */}
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 font-black text-[#020854] mb-3 text-sm">
                  <Calendar className="w-4 h-4" /> Período de Abertura
                </label>
                <div className="flex gap-2">
                  <button className="bg-blue-600 text-white px-5 py-2.5 rounded-full text-xs font-bold">Todos</button>
                  <button className="bg-[#F1F5F9] text-[#6B7588] px-5 py-2.5 rounded-full text-xs font-bold">Hoje</button>
                  <button className="bg-[#F1F5F9] text-[#6B7588] px-5 py-2.5 rounded-full text-xs font-bold">Últimos 7 dias</button>
                  <button className="bg-[#F1F5F9] text-[#6B7588] px-5 py-2.5 rounded-full text-xs font-bold">Personalizado</button>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 font-black text-[#020854] mb-3 text-sm">
                  <Ticket className="w-4 h-4" /> Ticket
                </label>
                <div className="flex gap-2">
                  <button className="bg-blue-600 text-white px-5 py-2.5 rounded-full text-xs font-bold">Não tem</button>
                  <button className="bg-[#F1F5F9] text-[#6B7588] px-5 py-2.5 rounded-full text-xs font-bold">Aberto</button>
                  <button className="bg-[#F1F5F9] text-[#6B7588] px-5 py-2.5 rounded-full text-xs font-bold">Finalizado</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Tabela Header */}
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-2xl font-bold text-[#020854]">3 Pedidos Encontrados</h2>
        <div className="flex items-center gap-2 bg-slate-200 p-1 rounded-xl">
          <button 
            onClick={() => handleViewChange('tabela')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border-none outline-none transition-colors cursor-pointer ${viewMode === 'tabela' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-300'}`}
          >
            <Table className="w-4 h-4" />
            Tabela
          </button>
          <button 
            onClick={() => handleViewChange('grade')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border-none outline-none transition-colors cursor-pointer ${viewMode === 'grade' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-300'}`}
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
                {pedidosMock.map((pedido, idx) => (
                  <tr
                    key={idx}
                    className="bg-white group cursor-pointer hover:bg-[#F2F2F5] transition-colors"
                    onClick={() => setPedidoSelecionado(pedido)}
                  >
                    <td className="py-4 px-6 rounded-l-2xl border-0">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-blue-900 text-lg">{pedido.id}</span>
                          <span className="text-[#FFD700] text-[10px] font-black flex items-center gap-1">
                            # {pedido.ticket} TICKET
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold">
                          <span className="flex items-center gap-1 text-slate-400">
                            <History className="w-3 h-3" /> {pedido.tempoAberto}
                          </span>
                          <span className="flex items-center gap-1 text-red-500 uppercase italic">
                            <AlertCircle className="w-3 h-3" /> Fora do prazo
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6 border-0">
                      <div className="bg-[#F1F5F9] rounded-2xl p-4 flex items-center justify-between min-w-[240px]">
                        <div className="flex flex-col">
                          <span className="font-black text-[#020854] text-base leading-tight">
                            {pedido.cliente}
                          </span>
                          <span className="text-slate-500 text-sm font-medium">
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
                      <div className="text-slate-400 leading-tight font-medium">
                        Comprado em:<br />
                        <span className="text-slate-600 font-bold">{pedido.data}</span>
                      </div>
                    </td>

                    <td className="py-4 px-6 border-0">
                      <span className="text-slate-500 font-bold text-sm">{pedido.produtos} itens</span>
                    </td>

                    <td className="py-4 px-6 border-0">
                      <span className="text-blue-900 font-black text-lg">{pedido.valor}</span>
                    </td>

                    <td className="py-4 px-6 rounded-r-2xl border-0">
                      <div className="flex items-center gap-4">
                        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                          {pedido.status.toUpperCase()}
                        </span>

                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((step) => (
                            <div key={step} className="flex items-center">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 
                                ${step < pedido.progresso ? 'bg-blue-900 border-blue-900 text-white' : 
                                  step === pedido.progresso ? 'bg-red-400 border-red-400 text-white' : 
                                  'bg-slate-100 border-slate-200 text-slate-400'}`}>
                                {step < pedido.progresso ? <CheckCircle2 className="w-4 h-4" /> : step}
                              </div>
                              {step < 5 && (
                                <div className={`w-3 h-0.5 ${step < pedido.progresso ? 'bg-blue-900' : 'bg-slate-200'}`} />
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
            {pedidosMock.map((pedido) => (
              <div 
                key={pedido.id} 
                className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col justify-between hover:shadow-[0_4px_24px_-8px_rgba(0,110,219,0.12)] transition-shadow cursor-pointer h-full"
                onClick={() => setPedidoSelecionado(pedido)}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-black text-blue-900 text-xl">{pedido.id}</span>
                      <span className="text-slate-400 text-xs font-bold">{pedido.data}</span>
                    </div>
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-black">
                      {pedido.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="bg-[#F1F5F9] rounded-2xl p-4 mb-4">
                    <h3 className="font-black text-[#020854] text-lg">{pedido.cliente}</h3>
                    <p className="text-slate-500 text-sm font-medium">{pedido.cidade}, {pedido.estado}</p>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-bold">Produtos</span>
                      <span className="font-medium text-slate-700">{pedido.produtos} itens</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-bold">Valor Total</span>
                      <span className="font-black text-blue-900 text-lg">{pedido.valor}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1 justify-center">
                    {[1, 2, 3, 4, 5].map((step) => (
                      <div key={step} className="flex items-center">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold border-2 
                          ${step < pedido.progresso ? 'bg-blue-900 border-blue-900 text-white' : 
                            step === pedido.progresso ? 'bg-red-400 border-red-400 text-white' : 
                            'bg-slate-100 border-slate-200 text-slate-400'}`}>
                          {step < pedido.progresso ? <CheckCircle2 className="w-3 h-3" /> : step}
                        </div>
                        {step < 5 && <div className={`w-3 h-0.5 ${step < pedido.progresso ? 'bg-blue-900' : 'bg-slate-200'}`} />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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

function StatusChip({ label, color, dot }: { label: string, color: string, dot: string }) {
  return (
    <button className={`${color} px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 border-none hover:opacity-80 transition-opacity`}>
      <span className={`w-2 h-2 rounded-full ${dot}`}></span>
      {label}
    </button>
  )
}
