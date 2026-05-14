import { useState, useEffect } from 'react'
import {
  Search, Maximize2, Minimize2, ChevronDown, ChevronUp, Box, Calendar,
  Filter, Table, Grid, Plus, Download
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ModalDetalhesProduto } from '../components/ModalDetalhesProduto'

// 1. IMPORTANDO O SEU NOVO SERVIÇO (Ajuste o caminho conforme o seu projeto)
import { getProdutos, Produto } from '../services/productService' 

export function Produtos() {
  const navigate = useNavigate()
  const [isFiltrosOpen, setIsFiltrosOpen] = useState(true)
  const [viewMode, setViewMode] = useState<'tabela' | 'grade'>('tabela')
  
  // 2. ESTADOS NOVOS PARA A API
  const [produtos, setProdutos] = useState<Produto[]>([]) // Substitui o mock!
  const [isLoading, setIsLoading] = useState(true) // Já começa carregando
  
  const [searchTerm, setSearchTerm] = useState('')
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)

  // 3. CHAMADA PARA A API (Sempre que a tela abrir)
  useEffect(() => {
    async function carregarDados() {
      setIsLoading(true)
      try {
        // Trazendo os primeiros 100 produtos do seu banco!
        const dadosReais = await getProdutos(0, 100)
        setProdutos(dadosReais)
      } catch (error) {
        console.error("Falha ao carregar produtos", error)
      } finally {
        setIsLoading(false)
      }
    }

    carregarDados()
  }, []) // O array vazio significa que roda 1x ao montar a tela

  // 4. FUNÇÃO DE BUSCA LOCAL (Filtra a lista que veio da API pelo texto digitado)
  const produtosFiltrados = produtos.filter(produto => 
    produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    produto.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleViewChange = (mode: 'tabela' | 'grade') => {
    if (viewMode === mode) return;
    setIsLoading(true);
    setViewMode(mode);
    setTimeout(() => setIsLoading(false), 500);
  };

  // 5. AJUSTE DAS CORES DO STATUS PARA BATER COM O SEU SERVICE
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-[#DCFCE7] text-[#15803D]'
      case 'baixo_estoque': return 'bg-[#FEF9C3] text-[#A16207]'
      case 'inativo': return 'bg-[#FEE2E2] text-[#B91C1C]'
      default: return 'bg-slate-100 text-slate-600'
    }
  }

  // Formata o label do status para ficar bonito na tela (ex: baixo_estoque -> Baixo Estoque)
  const formatStatusLabel = (status: string) => {
    if (status === 'baixo_estoque') return 'BAIXO ESTOQUE'
    return status.toUpperCase()
  }

  const ProdutoCardSkeleton = () => (
    <div className="bg-card p-6 rounded-3xl border border-border animate-pulse flex flex-col justify-between h-full">
      <div>
        <div className="w-full h-40 bg-slate-200 rounded-2xl mb-4"></div>
        <div className="flex flex-col gap-2">
          <div className="h-6 bg-slate-200 rounded w-full"></div>
          <div className="h-3 bg-slate-200 rounded w-2/3"></div>
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <div className="h-4 w-16 bg-slate-200 rounded"></div>
            <div className="h-5 w-24 bg-slate-200 rounded"></div>
          </div>
          <div className="flex justify-between items-center">
             <div className="h-4 w-20 bg-slate-200 rounded"></div>
             <div className="h-5 w-20 bg-slate-200 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-8 font-sans text-foreground">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-[#020854] dark:text-foreground">Produtos</h1>
      </div>

      <div className="bg-card rounded-3xl p-6 shadow-sm border-0 mb-6 flex items-center justify-between">
         <div className="relative w-full max-w-2xl">
          <Search className="w-5 h-5 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome do produto ou SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-background rounded-full border-none text-foreground focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/produtos/novo')}
            className="flex items-center gap-2 bg-[#1E5EFF] text-white px-6 py-4 rounded-full font-bold hover:bg-[#1E5EFF]/90 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Novo Produto
          </button>
          <button className="flex items-center gap-2 px-6 py-4 bg-background rounded-full text-muted-foreground font-bold hover:bg-slate-200 dark:hover:bg-border transition-colors">
            <Download className="w-5 h-5" /> Exportar CSV
          </button>
        </div>
      </div>

      {/* ... [Seção de Filtros mantida exatamente igual] ... */}
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
            {/* ... Todo o conteúdo interno dos filtros fica igual ... */}
             <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 font-black text-[#020854] dark:text-foreground mb-3 text-sm">
                  <Box className="w-4 h-4" /> Categoria
                </label>
                <div className="relative">
                  <select className="w-full p-4 bg-background rounded-2xl border-none text-muted-foreground outline-none appearance-none cursor-pointer">
                    <option>Todas as Categorias</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 font-black text-[#020854] dark:text-foreground mb-3 text-sm">
                  <Filter className="w-4 h-4" /> Status
                </label>
                <div className="flex flex-wrap gap-2">
                  <button className="bg-[#DCFCE7] text-[#15803D] px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 border-none hover:opacity-80 transition-opacity">Ativo</button>
                  <button className="bg-[#FEF9C3] text-[#A16207] px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 border-none hover:opacity-80 transition-opacity">Baixo Estoque</button>
                  <button className="bg-[#FEE2E2] text-[#B91C1C] px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 border-none hover:opacity-80 transition-opacity">Inativo</button>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 font-black text-[#020854] dark:text-foreground mb-3 text-sm">
                  <Calendar className="w-4 h-4" /> Faixa de Preço
                </label>
                <div className="flex gap-2">
                  <button className="bg-blue-600 text-white px-5 py-2.5 rounded-full text-xs font-bold">Todos</button>
                  <button className="bg-background text-muted-foreground px-5 py-2.5 rounded-full text-xs font-bold">Até R$ 100</button>
                  <button className="bg-background text-muted-foreground px-5 py-2.5 rounded-full text-xs font-bold">R$ 100 - R$ 500</button>
                  <button className="bg-background text-muted-foreground px-5 py-2.5 rounded-full text-xs font-bold">Acima de R$ 500</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-end mb-6">
        <h2 className="text-2xl font-bold text-[#020854] dark:text-foreground">
          {/* Mostra a quantidade real baseada na busca! */}
          {produtosFiltrados.length} Produtos Encontrados
        </h2>
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

      <div className="w-full overflow-hidden">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <ProdutoCardSkeleton key={index} />
            ))}
          </div>
        ) : viewMode === 'tabela' ? (
          <div className="w-full overflow-x-auto bg-card rounded-3xl p-4 shadow-sm">
            <table className="w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="bg-[#020854] text-white">
                  <th className="py-4 px-4 text-left rounded-l-xl">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 accent-[#1E5EFF]" />
                  </th>
                  <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-none">Produto</th>
                  <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-none">Categoria</th>
                  <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-none">Estoque</th>
                  <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-none">Vendidos</th>
                  <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-none">Preço</th>
                  <th className="py-4 px-6 text-left rounded-r-xl text-[10px] font-black uppercase tracking-widest border-none">Status</th>
                </tr>
              </thead>
              <tbody>
                {/* 6. SUBSTITUIÇÃO: produtosMock virou produtosFiltrados */}
                {produtosFiltrados.map((produto) => (
                  <tr
                    key={produto.id}
                    className="bg-card group cursor-pointer hover:bg-background transition-colors border-b border-border"
                    onClick={() => setProdutoSelecionado(produto)}
                  >
                     <td className="py-4 px-4 rounded-l-2xl border-0">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-300 accent-[#1E5EFF]" />
                    </td>
                    <td className="py-4 px-6 border-0">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-xl border border-border flex items-center justify-center text-2xl bg-slate-50">
                            {produto.imagem} 
                         </div>
                        <div className="flex flex-col gap-1">
                          <span className="font-black text-[#020854] dark:text-foreground text-base">{produto.nome}</span>
                          <span className="text-muted-foreground text-[10px] font-bold uppercase">{produto.sku}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6 border-0">
                       <span className="bg-sky-100 text-sky-700 border border-sky-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                         {produto.categoria}
                       </span>
                    </td>

                    <td className="py-4 px-6 border-0">
                       <span className="font-bold text-muted-foreground">{produto.estoque} un</span>
                    </td>

                    <td className="py-4 px-6 border-0">
                       <span className="font-bold text-muted-foreground">{produto.vendidos}</span>
                    </td>

                    <td className="py-4 px-6 border-0">
                      <span className="text-blue-900 dark:text-blue-300 font-black text-lg whitespace-nowrap">{produto.preco}</span>
                    </td>

                    <td className="py-4 px-6 rounded-r-2xl border-0">
                       <span className={`px-3 py-1 rounded-full text-[10px] font-black whitespace-nowrap ${getStatusColor(produto.status)}`}>
                        {formatStatusLabel(produto.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {produtosFiltrados.map((produto) => (
              <div 
                key={produto.id} 
                className="bg-card p-6 rounded-3xl border border-[#ADE9FF] flex flex-col justify-between shadow-[0_4px_24px_-8px_rgba(0,110,219,0.12)] hover:shadow-lg transition-shadow cursor-pointer h-full"
                onClick={() => setProdutoSelecionado(produto)}
              >
                <div>
                  <div className="w-full h-48 rounded-2xl overflow-hidden mb-4 border border-border relative bg-slate-50 flex items-center justify-center text-6xl">
                     {produto.imagem}
                     <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-black shadow-sm ${getStatusColor(produto.status)}`}>
                        {formatStatusLabel(produto.status)}
                      </span>
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="font-black text-[#020854] dark:text-foreground text-lg leading-tight mb-2">{produto.nome}</h3>
                    <div className="flex items-center gap-2">
                       <p className="text-muted-foreground text-[10px] font-bold uppercase">{produto.sku}</p>
                       <span className="bg-sky-100 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider">
                         {produto.categoria}
                       </span>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-bold">Estoque</span>
                      <span className="font-bold text-foreground">{produto.estoque} un</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-bold">Preço</span>
                      <span className="font-black text-blue-900 dark:text-blue-300 text-lg">{produto.preco}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ModalDetalhesProduto 
        isOpen={!!produtoSelecionado} 
        onClose={() => setProdutoSelecionado(null)} 
        produto={produtoSelecionado} 
      />
    </div>
  )
}