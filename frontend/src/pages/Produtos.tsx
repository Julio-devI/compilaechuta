import { useState, useEffect } from 'react'
import {
  Search, Maximize2, Minimize2, ChevronDown, ChevronUp, Box, Calendar,
  Filter, Table, Grid, Plus, Download, Trash2, Database, ShoppingCart, DollarSign, Smile, Medal
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ModalDetalhesProduto } from '../components/ModalDetalhesProduto'
import { getProdutos, getTotalProdutos, getTopSellingProduct, Produto, exportarProdutosCSV, deleteProduto } from '../services/productService'
import { getCategorias, getBestSellingCategory, getWorstSellingCategory } from '../services/categoryService'

export function Produtos() {
  const navigate = useNavigate()
  const [isFiltrosOpen, setIsFiltrosOpen] = useState(true)
  const [viewMode, setViewMode] = useState<'tabela' | 'grade'>('tabela')
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [totalProdutos, setTotalProdutos] = useState<number>(0)
  const [topSellingProduct, setTopSellingProduct] = useState<string>('')
  const [bestSellingCategory, setBestSellingCategory] = useState<string>('')
  const [worstSellingCategory, setWorstSellingCategory] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)

  const [filtroCategoria, setFiltroCategoria] = useState('Todas as Categorias')
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null)
  const [filtroPreco, setFiltroPreco] = useState<string | null>(null)

  const [categoriasLista, setCategoriasLista] = useState<string[]>([])

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteSelecionados = async () => {
    setIsDeleting(true)
    try {
      const idsParaDeletar = Array.from(selecionados)
      await Promise.all(idsParaDeletar.map(id => deleteProduto(id)))

      setIsConfirmingDelete(false)
      setSelecionados(new Set())
      window.location.reload()
    } catch (error) {
      console.error("Erro na exclusão em massa:", error)
      alert("Erro ao excluir os produtos selecionados.")
    } finally {
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    getCategorias().then(data => {
      setCategoriasLista(data.map((c: any) => c.nome_categoria))
    })
    getTotalProdutos().then(total => {
        setTotalProdutos(total)
    })
    getTopSellingProduct().then(top => {
        setTopSellingProduct(top)
    })
    getBestSellingCategory().then(best => {
        setBestSellingCategory(best)
    })
    getWorstSellingCategory().then(worst => {
        setWorstSellingCategory(worst)
    })
  }, [])

  useEffect(() => {
    async function carregarDados() {
      setIsLoading(true)
      try {
        let precoMin, precoMax;
        if (filtroPreco === 'Até R$ 100') precoMax = 100;
        if (filtroPreco === 'R$ 100 - R$ 500') { precoMin = 100; precoMax = 500; }
        if (filtroPreco === 'Acima de R$ 500') precoMin = 500;

        const dadosReais = await getProdutos(0, 1000, {
          categoria: filtroCategoria,
          status: filtroStatus || undefined,
          precoMin,
          precoMax
        })

        setProdutos(dadosReais)

      } catch (error) {
        console.error("Falha ao carregar produtos", error)
      } finally {
        setIsLoading(false)
      }
    }

    carregarDados()
  }, [filtroCategoria, filtroStatus, filtroPreco])

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-[#DCFCE7] text-[#15803D]'
      case 'baixo_estoque': return 'bg-[#FEF9C3] text-[#A16207]'
      case 'inativo': return 'bg-[#FEE2E2] text-[#B91C1C]'
      default: return 'bg-slate-100 text-slate-600'
    }
  }

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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-background p-8 font-sans text-foreground">

      {/* 🚀 FILEIRA DE CARDS DE MÉTRICAS COMPATÍVEL COM A IMAGEM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1 */}
        <div className="bg-white dark:bg-card border border-[#E2E8F0] dark:border-border p-5 rounded-3xl flex flex-col justify-between relative shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E0F2FE] flex items-center justify-center text-[#0284C7]">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-muted-foreground leading-tight">Total de</span>
                <span className="text-xs font-semibold text-muted-foreground leading-tight">produtos</span>
              </div>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-[#0F172A] dark:text-foreground mt-3 pl-1">{totalProdutos.toLocaleString('pt-BR')}</h3>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-card border border-[#E2E8F0] dark:border-border p-5 rounded-3xl flex flex-col justify-between relative shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FEF08A] flex items-center justify-center text-[#B45309]">
                <Medal className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-muted-foreground leading-tight">Produto mais</span>
                <span className="text-xs font-semibold text-muted-foreground leading-tight">vendido</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full flex items-center gap-0.5">
              ↑ 12.6% mês
            </span>
          </div>
          <h3 className="text-xl font-bold text-[#0F172A] dark:text-foreground mt-3 pl-1 truncate max-w-full" title={topSellingProduct}>{topSellingProduct || "..."}</h3>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-card border border-[#E2E8F0] dark:border-border p-5 rounded-3xl flex flex-col justify-between relative shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2563EB] flex items-center justify-center text-white">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-muted-foreground leading-tight">Categoria mais</span>
                <span className="text-xs font-semibold text-muted-foreground leading-tight">vendida</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full flex items-center gap-0.5">
              ↑ 12.6% mês
            </span>
          </div>
          <h3 className="text-xl font-bold text-[#0F172A] dark:text-foreground mt-3 pl-1 truncate max-w-full" title={bestSellingCategory}>{bestSellingCategory || "..."}</h3>
        </div>

        {/* Card 4 */}
        <div className="bg-white dark:bg-card border border-[#E2E8F0] dark:border-border p-5 rounded-3xl flex flex-col justify-between relative shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#06B6D4] flex items-center justify-center text-white">
                <Smile className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-muted-foreground leading-tight">Categoria menos</span>
                <span className="text-xs font-semibold text-muted-foreground leading-tight">vendida</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-[#B91C1C] bg-[#FEE2E2] px-2 py-0.5 rounded-full flex items-center gap-0.5">
              ↓ 22.0% mês
            </span>
          </div>
          <h3 className="text-xl font-bold text-[#0F172A] dark:text-foreground mt-3 pl-1 truncate max-w-full" title={worstSellingCategory}>{worstSellingCategory || "..."}</h3>
        </div>
      </div>

      {/* 🔍 BLOCO CENTRAL: CONSULTAR NO BANCO DE DADOS + BUSCA + BOTÕES COMPACTOS */}
      <div className="bg-white dark:bg-card rounded-3xl p-6 shadow-sm border border-[#E2E8F0] dark:border-none mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-[#0F172A] dark:text-foreground font-bold text-base">
            <Database className="w-5 h-5" />
            <span>Consultar no Banco de Dados</span>
          </div>
          <div className="text-sm font-medium text-muted-foreground">
            Total <span className="bg-[#EFF6FF] text-[#1E5EFF] font-bold px-3 py-1 rounded-xl ml-1">{totalProdutos.toLocaleString('pt-BR')}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full max-w-2xl">
            <Search className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por produto, categoria, valor, etc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-[#F1F5F9] dark:bg-background rounded-full border-none text-sm text-foreground focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {/* Botão Novo Produto Ajustado */}
            <button
              onClick={() => navigate('/produtos/novo')}
              className="flex items-center gap-2 text-[#1E5EFF] hover:text-[#1E5EFF]/80 font-bold text-sm transition-colors"
            >
              Novo Produto
              <span className="w-8 h-8 bg-[#1E5EFF] hover:bg-[#1E5EFF]/90 text-white rounded-lg flex items-center justify-center transition-colors shadow-sm">
                <Plus className="w-4 h-4" />
              </span>
            </button>

            {/* Botão Exportar CSV Ajustado */}
            <button
              onClick={exportarProdutosCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E2E8F0] dark:bg-border rounded-xl text-slate-700 dark:text-muted-foreground font-bold text-xs hover:opacity-90 transition-opacity border border-slate-300 dark:border-none"
            >
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
          </div>
        </div>
      </div>

      {/* 🧭 SEÇÃO DE FILTROS INTEGRAIS (PRESERVADA) */}
      <div className="bg-white dark:bg-card rounded-3xl shadow-sm border border-[#E2E8F0] dark:border-none mb-8 overflow-hidden transition-all duration-300">
        <div className="p-6 flex justify-between items-center">
          <button
            onClick={() => setIsFiltrosOpen(!isFiltrosOpen)}
            className="flex items-center gap-2 font-bold text-foreground border-none outline-none cursor-pointer hover:opacity-70 transition-opacity"
          >
            {isFiltrosOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            {isFiltrosOpen ? 'Esconder Filtros' : 'Mostrar Filtros'}
          </button>

          <button
            onClick={() => setIsFiltrosOpen(!isFiltrosOpen)}
            className="border-none bg-transparent cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors flex items-center justify-center"
            title={isFiltrosOpen ? "Minimizar Filtros" : "Maximizar Filtros"}
          >
            {isFiltrosOpen ? <Minimize2 className="w-5 h-5 text-muted-foreground" /> : <Maximize2 className="w-5 h-5 text-muted-foreground" />}
          </button>
        </div>

        {isFiltrosOpen && (
          <div className="px-8 pb-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 font-black text-[#020854] dark:text-foreground mb-3 text-sm">
                  <Box className="w-4 h-4" /> Categoria
                </label>
                <div className="relative">
                  <select
                    value={filtroCategoria}
                    onChange={(e) => setFiltroCategoria(e.target.value)}
                    className="w-full p-4 bg-[#F1F5F9] dark:bg-background rounded-2xl border-none text-muted-foreground outline-none appearance-none cursor-pointer"
                  >
                    <option value="Todas as Categorias">Todas as Categorias</option>
                    {categoriasLista.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 font-black text-[#020854] dark:text-foreground mb-3 text-sm">
                  <Filter className="w-4 h-4" /> Status
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFiltroStatus(filtroStatus === 'ativo' ? null : 'ativo')}
                    className={`bg-[#DCFCE7] text-[#15803D] px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 border-none transition-opacity ${filtroStatus && filtroStatus !== 'ativo' ? 'opacity-40' : 'hover:opacity-80'}`}
                  >
                    Ativo
                  </button>
                  <button
                    onClick={() => setFiltroStatus(filtroStatus === 'baixo_estoque' ? null : 'baixo_estoque')}
                    className={`bg-[#FEF9C3] text-[#A16207] px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 border-none transition-opacity ${filtroStatus && filtroStatus !== 'baixo_estoque' ? 'opacity-40' : 'hover:opacity-80'}`}
                  >
                    Baixo Estoque
                  </button>
                  <button
                    onClick={() => setFiltroStatus(filtroStatus === 'inativo' ? null : 'inativo')}
                    className={`bg-[#FEE2E2] text-[#B91C1C] px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 border-none transition-opacity ${filtroStatus && filtroStatus !== 'inativo' ? 'opacity-40' : 'hover:opacity-80'}`}
                  >
                    Inativo
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 font-black text-[#020854] dark:text-foreground mb-3 text-sm">
                  <Calendar className="w-4 h-4" /> Faixa de Preço
                </label>
                <div className="flex gap-2">
                  {['Todos', 'Até R$ 100', 'R$ 100 - R$ 500', 'Acima de R$ 500'].map(faixa => (
                    <button
                      key={faixa}
                      onClick={() => setFiltroPreco(faixa === 'Todos' ? null : faixa)}
                      className={`px-5 py-2.5 rounded-full text-xs font-bold transition-colors ${(filtroPreco === faixa || (faixa === 'Todos' && !filtroPreco))
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#F1F5F9] dark:bg-background text-muted-foreground hover:bg-slate-200 dark:hover:bg-border'
                        }`}
                    >
                      {faixa}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 📊 ÁREA DE LISTAGEM DE PRODUTOS */}
      <div className="flex justify-between items-end mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-[#020854] dark:text-foreground">
            {produtosFiltrados.length} Produtos Encontrados
          </h2>

          {selecionados.size > 0 && (
            <button
              onClick={() => setIsConfirmingDelete(true)}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-bold transition-colors text-sm shadow-sm animate-in fade-in"
            >
              <Trash2 className="w-4 h-4" />
              Excluir Selecionados ({selecionados.size})
            </button>
          )}
        </div>
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
          <div className="w-full overflow-x-auto bg-white dark:bg-card rounded-3xl p-4 shadow-sm border border-[#E2E8F0] dark:border-none">
            <table className="w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="bg-[#020854] text-white">
                  <th className="py-4 px-6 text-left text-[11px] font-black uppercase tracking-widest border-none rounded-l-2xl">Produto</th>
                  <th className="py-4 px-6 text-left text-[11px] font-black uppercase tracking-widest border-none">SKU</th>
                  <th className="py-4 px-6 text-left text-[11px] font-black uppercase tracking-widest border-none">Categoria</th>
                  <th className="py-4 px-6 text-left text-[11px] font-black uppercase tracking-widest border-none">Performance</th>
                  <th className="py-4 px-6 text-left text-[11px] font-black uppercase tracking-widest border-none">Preço</th>
                  <th className="py-4 px-6 text-left text-[11px] font-black uppercase tracking-widest border-none">Estoque</th>
                  <th className="py-4 px-6 text-left text-[11px] font-black uppercase tracking-widest border-none">Vendidos</th>
                  <th className="py-4 px-6 text-left text-[11px] font-black uppercase tracking-widest border-none">Avaliação</th>
                  <th className="py-4 px-6 text-left text-[11px] font-black uppercase tracking-widest border-none rounded-r-2xl">Ações</th>
                </tr>
              </thead>
              <tbody>
      {produtosFiltrados.map((produto) => (
        <tr
          key={produto.id}
          className="bg-white dark:bg-card group cursor-pointer hover:bg-slate-50 dark:hover:bg-background/50 transition-colors border-b border-border shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
          onClick={() => setProdutoSelecionado(produto)}
        >
          {/* PRODUTO (Imagem + Nome em bloco cinza) */}
          <td className="py-4 px-6 rounded-l-2xl border-0">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl border border-slate-200 flex items-center justify-center text-2xl bg-[#F1F5F9] text-slate-400 shrink-0">
                {produto.imagem || "✕"}
              </div>
              <div className="bg-[#F1F5F9] dark:bg-slate-800 px-4 py-2 rounded-2xl min-w-[140px]">
                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm block leading-tight">
                  {produto.nome}
                </span>
              </div>
            </div>
          </td>

          {/* SKU */}
          <td className="py-4 px-6 border-0">
            <span className="text-slate-600 dark:text-slate-400 font-bold text-sm">
              {produto.sku}
            </span>
          </td>

          {/* CATEGORIA */}
          <td className="py-4 px-6 border-0">
            <span className="bg-[#E0F2FE] text-[#0284C7] px-3 py-1 rounded-full text-xs font-bold tracking-wide">
              {produto.categoria}
            </span>
          </td>

          {/* PERFORMANCE (Equivalente ao antigo Status na imagem) */}
          <td className="py-4 px-6 border-0">
            <span className="bg-[#E2E8F0] dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 w-fit">
              <Medal className="w-3.5 h-3.5" /> Mais vendido
            </span>
          </td>

          {/* PREÇO */}
          <td className="py-4 px-6 border-0">
            <span className="text-[#020854] dark:text-blue-400 font-black text-base whitespace-nowrap">
              {produto.preco}
            </span>
          </td>

          {/* ESTOQUE */}
          <td className="py-4 px-6 border-0">
            <span className="font-medium text-slate-400 dark:text-slate-500 text-sm">
              {produto.estoque} produtos
            </span>
          </td>

          {/* VENDIDOS */}
          <td className="py-4 px-6 border-0">
            <span className="font-medium text-slate-400 dark:text-slate-500 text-sm">
              {produto.vendidos} produtos
            </span>
          </td>

          {/* AVALIAÇÃO */}
          <td className="py-4 px-6 border-0">
            <div className="flex items-center gap-1">
              <span className="text-amber-400 text-lg">★</span>
              <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                {/* Fallback caso não exista a propriedade no seu tipo Produto */}
                {(produto as any).avaliacao || "N/A"}
              </span>
            </div>
          </td>

          {/* AÇÕES (Botão Editar) */}
          <td className="py-4 px-6 rounded-r-2xl border-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/produtos/editar/${produto.id}`);
              }}
              className="flex items-center gap-1.5 text-[#1E5EFF] hover:text-[#1E5EFF]/80 font-bold text-sm bg-transparent border-none cursor-pointer transition-colors"
            >
              {/* Note: Importe o 'Pencil' do lucide-react no topo caso queira o ícone exato de edição */}
              <span className="text-base">✏️</span> Editar
            </button>
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
                className="bg-white dark:bg-card p-6 rounded-3xl border border-[#ADE9FF] flex flex-col justify-between shadow-[0_4px_24px_-8px_rgba(0,110,219,0.12)] hover:shadow-lg transition-shadow cursor-pointer h-full"
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

      {/* ⚠️ MODAL DE DELEÇÃO */}
      {isConfirmingDelete && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-2xl border border-border w-full max-w-[320px] text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#020854] dark:text-white mb-2">Excluir produtos?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Tem certeza que deseja remover <strong>{selecionados.size}</strong> {selecionados.size === 1 ? 'produto selecionado' : 'produtos selecionados'} permanentemente?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Não
              </button>
              <button
                onClick={handleDeleteSelecionados}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? '...' : 'Sim'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalDetalhesProduto
        isOpen={!!produtoSelecionado}
        onClose={() => setProdutoSelecionado(null)}
        produto={produtoSelecionado}
      />
    </div>
  )
}