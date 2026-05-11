import { useState, useEffect } from 'react'
import { Search, Filter, Plus, MoreHorizontal, Package, TrendingUp, TrendingDown, Star, Grid3X3, List } from 'lucide-react'
import type { Produto } from '../services/productService'
import { getProdutos, produtoStatusConfig as statusConfig } from '../services/productService'

export function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [filterStatus, setFilterStatus] = useState<string>('todos')

  useEffect(() => {
    getProdutos().then(setProdutos)
  }, [])

  const filteredProdutos = produtos.filter(produto => {
    const matchesSearch = produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         produto.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'todos' || produto.status === filterStatus
    return matchesSearch && matchesFilter
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
          <p className="text-muted mt-1">Gerencie seu catálogo de produtos</p>
        </div>
        <button className="flex items-center gap-2 bg-[#1E5EFF] text-white px-4 py-2.5 rounded-xl font-medium hover:bg-[#1E5EFF]/90 transition-colors">
          <Plus className="w-5 h-5" />
          Novo Produto
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-sm">Total Produtos</p>
              <p className="text-2xl font-bold text-foreground mt-1">2.456</p>
            </div>
            <div className="w-12 h-12 bg-[#1E5EFF]/10 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-[#1E5EFF]" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-sm">Em Estoque</p>
              <p className="text-2xl font-bold text-[#00C48C] mt-1">2.189</p>
            </div>
            <div className="w-12 h-12 bg-[#00C48C]/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-[#00C48C]" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-sm">Baixo Estoque</p>
              <p className="text-2xl font-bold text-[#B8860B] mt-1">156</p>
            </div>
            <div className="w-12 h-12 bg-[#FFD60A]/10 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-[#B8860B]" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-sm">Sem Estoque</p>
              <p className="text-2xl font-bold text-[#FF4757] mt-1">111</p>
            </div>
            <div className="w-12 h-12 bg-[#FF4757]/10 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-[#FF4757]" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border">
        <div className="p-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-5 h-5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar produto ou SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-[#1E5EFF]/20 focus:border-[#1E5EFF] w-80"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterStatus('todos')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'todos' ? 'bg-[#1E5EFF] text-white' : 'bg-background text-muted hover:bg-[#E2E8F0]'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterStatus('ativo')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'ativo' ? 'bg-[#1E5EFF] text-white' : 'bg-background text-muted hover:bg-[#E2E8F0]'}`}
              >
                Ativos
              </button>
              <button
                onClick={() => setFilterStatus('baixo_estoque')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'baixo_estoque' ? 'bg-[#1E5EFF] text-white' : 'bg-background text-muted hover:bg-[#E2E8F0]'}`}
              >
                Baixo Estoque
              </button>
              <button
                onClick={() => setFilterStatus('inativo')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'inativo' ? 'bg-[#1E5EFF] text-white' : 'bg-background text-muted hover:bg-[#E2E8F0]'}`}
              >
                Inativos
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-muted hover:bg-background transition-colors">
              <Filter className="w-4 h-4" />
              Filtros
            </button>
            <div className="flex items-center border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-[#1E5EFF] text-white' : 'text-muted hover:bg-background'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-[#1E5EFF] text-white' : 'text-muted hover:bg-background'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'list' ? (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-6 text-muted font-medium text-sm">Produto</th>
                    <th className="text-left py-4 px-6 text-muted font-medium text-sm">SKU</th>
                    <th className="text-left py-4 px-6 text-muted font-medium text-sm">Categoria</th>
                    <th className="text-left py-4 px-6 text-muted font-medium text-sm">Preço</th>
                    <th className="text-left py-4 px-6 text-muted font-medium text-sm">Estoque</th>
                    <th className="text-left py-4 px-6 text-muted font-medium text-sm">Vendidos</th>
                    <th className="text-left py-4 px-6 text-muted font-medium text-sm">Avaliação</th>
                    <th className="text-left py-4 px-6 text-muted font-medium text-sm">Status</th>
                    <th className="text-left py-4 px-6 text-muted font-medium text-sm"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProdutos.map((produto) => (
                    <tr key={produto.id} className="border-b border-border hover:bg-background transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center text-2xl">
                            {produto.imagem}
                          </div>
                          <span className="font-medium text-foreground">{produto.nome}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-muted font-mono text-sm">{produto.sku}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-muted">{produto.categoria}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-medium text-foreground">{produto.preco}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${produto.estoque === 0 ? 'text-[#FF4757]' : produto.estoque < 20 ? 'text-[#B8860B]' : 'text-foreground'}`}>
                            {produto.estoque}
                          </span>
                          {produto.tendencia === 'up' && <TrendingUp className="w-4 h-4 text-[#00C48C]" />}
                          {produto.tendencia === 'down' && <TrendingDown className="w-4 h-4 text-[#FF4757]" />}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-foreground">{produto.vendidos}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-[#FFD60A] text-[#FFD60A]" />
                          <span className="text-foreground">{produto.avaliacao}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[produto.status].color}`}>
                          {statusConfig[produto.status].label}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <button className="p-2 hover:bg-[#E2E8F0] rounded-lg transition-colors">
                          <MoreHorizontal className="w-5 h-5 text-muted" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-6 grid grid-cols-4 gap-6">
            {filteredProdutos.map((produto) => (
              <div key={produto.id} className="border border-border rounded-2xl p-4 hover:shadow-lg transition-shadow">
                <div className="w-full h-32 rounded-xl bg-background flex items-center justify-center text-5xl mb-4">
                  {produto.imagem}
                </div>
                <h3 className="font-medium text-foreground mb-1">{produto.nome}</h3>
                <p className="text-sm text-muted mb-2">{produto.categoria}</p>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-[#1E5EFF]">{produto.preco}</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-[#FFD60A] text-[#FFD60A]" />
                    <span className="text-sm text-muted">{produto.avaliacao}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Estoque: {produto.estoque}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[produto.status].color}`}>
                    {statusConfig[produto.status].label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 flex items-center justify-between border-t border-border">
          <p className="text-sm text-muted">Mostrando {filteredProdutos.length} de {produtos.length} produtos</p>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 border border-border rounded-lg text-sm text-muted hover:bg-background transition-colors">
              Anterior
            </button>
            <button className="px-4 py-2 bg-[#1E5EFF] text-white rounded-lg text-sm font-medium">1</button>
            <button className="px-4 py-2 border border-border rounded-lg text-sm text-muted hover:bg-background transition-colors">2</button>
            <button className="px-4 py-2 border border-border rounded-lg text-sm text-muted hover:bg-background transition-colors">3</button>
            <button className="px-4 py-2 border border-border rounded-lg text-sm text-muted hover:bg-background transition-colors">
              Próximo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
