import { useState } from 'react'
import { Search, Filter, Plus, MoreHorizontal, Package, TrendingUp, TrendingDown, Star, Grid3X3, List } from 'lucide-react'

interface Produto {
  id: number
  nome: string
  sku: string
  categoria: string
  preco: string
  estoque: number
  vendidos: number
  avaliacao: number
  status: 'ativo' | 'inativo' | 'baixo_estoque'
  imagem: string
  tendencia: 'up' | 'down' | 'stable'
}

const produtos: Produto[] = [
  { id: 1, nome: 'Smartphone Galaxy S24', sku: 'SKU-001234', categoria: 'Eletrônicos', preco: 'R$ 4.299,00', estoque: 145, vendidos: 892, avaliacao: 4.8, status: 'ativo', imagem: '📱', tendencia: 'up' },
  { id: 2, nome: 'Notebook Dell Inspiron', sku: 'SKU-001235', categoria: 'Informática', preco: 'R$ 3.599,00', estoque: 67, vendidos: 456, avaliacao: 4.6, status: 'ativo', imagem: '💻', tendencia: 'up' },
  { id: 3, nome: 'Fone Bluetooth JBL', sku: 'SKU-001236', categoria: 'Áudio', preco: 'R$ 299,00', estoque: 12, vendidos: 1234, avaliacao: 4.7, status: 'baixo_estoque', imagem: '🎧', tendencia: 'up' },
  { id: 4, nome: 'Smart TV 55" LG', sku: 'SKU-001237', categoria: 'Eletrônicos', preco: 'R$ 2.799,00', estoque: 89, vendidos: 234, avaliacao: 4.5, status: 'ativo', imagem: '📺', tendencia: 'stable' },
  { id: 5, nome: 'Câmera Canon EOS', sku: 'SKU-001238', categoria: 'Fotografia', preco: 'R$ 5.999,00', estoque: 23, vendidos: 78, avaliacao: 4.9, status: 'ativo', imagem: '📷', tendencia: 'down' },
  { id: 6, nome: 'Tablet iPad Pro', sku: 'SKU-001239', categoria: 'Informática', preco: 'R$ 7.499,00', estoque: 0, vendidos: 345, avaliacao: 4.8, status: 'inativo', imagem: '📲', tendencia: 'down' },
  { id: 7, nome: 'Console PS5', sku: 'SKU-001240', categoria: 'Games', preco: 'R$ 4.499,00', estoque: 34, vendidos: 567, avaliacao: 4.9, status: 'ativo', imagem: '🎮', tendencia: 'up' },
  { id: 8, nome: 'Smartwatch Apple', sku: 'SKU-001241', categoria: 'Wearables', preco: 'R$ 3.299,00', estoque: 56, vendidos: 289, avaliacao: 4.7, status: 'ativo', imagem: '⌚', tendencia: 'stable' },
]

const statusConfig = {
  ativo: { color: 'bg-[#00C48C]/10 text-[#00C48C]', label: 'Ativo' },
  inativo: { color: 'bg-[#FF4757]/10 text-[#FF4757]', label: 'Inativo' },
  baixo_estoque: { color: 'bg-[#FFD60A]/10 text-[#B8860B]', label: 'Baixo Estoque' },
}

export function Produtos() {
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [filterStatus, setFilterStatus] = useState<string>('todos')

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
          <h1 className="text-2xl font-bold text-[#1E293B]">Produtos</h1>
          <p className="text-[#64748B] mt-1">Gerencie seu catálogo de produtos</p>
        </div>
        <button className="flex items-center gap-2 bg-[#1E5EFF] text-white px-4 py-2.5 rounded-xl font-medium hover:bg-[#1E5EFF]/90 transition-colors">
          <Plus className="w-5 h-5" />
          Novo Produto
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#64748B] text-sm">Total Produtos</p>
              <p className="text-2xl font-bold text-[#1E293B] mt-1">2.456</p>
            </div>
            <div className="w-12 h-12 bg-[#1E5EFF]/10 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-[#1E5EFF]" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#64748B] text-sm">Em Estoque</p>
              <p className="text-2xl font-bold text-[#00C48C] mt-1">2.189</p>
            </div>
            <div className="w-12 h-12 bg-[#00C48C]/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-[#00C48C]" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#64748B] text-sm">Baixo Estoque</p>
              <p className="text-2xl font-bold text-[#B8860B] mt-1">156</p>
            </div>
            <div className="w-12 h-12 bg-[#FFD60A]/10 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-[#B8860B]" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#64748B] text-sm">Sem Estoque</p>
              <p className="text-2xl font-bold text-[#FF4757] mt-1">111</p>
            </div>
            <div className="w-12 h-12 bg-[#FF4757]/10 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-[#FF4757]" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0]">
        <div className="p-4 flex items-center justify-between border-b border-[#E2E8F0]">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-5 h-5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar produto ou SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#1E5EFF]/20 focus:border-[#1E5EFF] w-80"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterStatus('todos')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'todos' ? 'bg-[#1E5EFF] text-white' : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#E2E8F0]'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterStatus('ativo')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'ativo' ? 'bg-[#1E5EFF] text-white' : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#E2E8F0]'}`}
              >
                Ativos
              </button>
              <button
                onClick={() => setFilterStatus('baixo_estoque')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'baixo_estoque' ? 'bg-[#1E5EFF] text-white' : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#E2E8F0]'}`}
              >
                Baixo Estoque
              </button>
              <button
                onClick={() => setFilterStatus('inativo')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'inativo' ? 'bg-[#1E5EFF] text-white' : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#E2E8F0]'}`}
              >
                Inativos
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2.5 border border-[#E2E8F0] rounded-xl text-[#64748B] hover:bg-[#F8FAFC] transition-colors">
              <Filter className="w-4 h-4" />
              Filtros
            </button>
            <div className="flex items-center border border-[#E2E8F0] rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-[#1E5EFF] text-white' : 'text-[#64748B] hover:bg-[#F8FAFC]'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-[#1E5EFF] text-white' : 'text-[#64748B] hover:bg-[#F8FAFC]'}`}
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
                  <tr className="border-b border-[#E2E8F0]">
                    <th className="text-left py-4 px-6 text-[#64748B] font-medium text-sm">Produto</th>
                    <th className="text-left py-4 px-6 text-[#64748B] font-medium text-sm">SKU</th>
                    <th className="text-left py-4 px-6 text-[#64748B] font-medium text-sm">Categoria</th>
                    <th className="text-left py-4 px-6 text-[#64748B] font-medium text-sm">Preço</th>
                    <th className="text-left py-4 px-6 text-[#64748B] font-medium text-sm">Estoque</th>
                    <th className="text-left py-4 px-6 text-[#64748B] font-medium text-sm">Vendidos</th>
                    <th className="text-left py-4 px-6 text-[#64748B] font-medium text-sm">Avaliação</th>
                    <th className="text-left py-4 px-6 text-[#64748B] font-medium text-sm">Status</th>
                    <th className="text-left py-4 px-6 text-[#64748B] font-medium text-sm"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProdutos.map((produto) => (
                    <tr key={produto.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-[#F8FAFC] flex items-center justify-center text-2xl">
                            {produto.imagem}
                          </div>
                          <span className="font-medium text-[#1E293B]">{produto.nome}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-[#64748B] font-mono text-sm">{produto.sku}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-[#64748B]">{produto.categoria}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-medium text-[#1E293B]">{produto.preco}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${produto.estoque === 0 ? 'text-[#FF4757]' : produto.estoque < 20 ? 'text-[#B8860B]' : 'text-[#1E293B]'}`}>
                            {produto.estoque}
                          </span>
                          {produto.tendencia === 'up' && <TrendingUp className="w-4 h-4 text-[#00C48C]" />}
                          {produto.tendencia === 'down' && <TrendingDown className="w-4 h-4 text-[#FF4757]" />}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-[#1E293B]">{produto.vendidos}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-[#FFD60A] text-[#FFD60A]" />
                          <span className="text-[#1E293B]">{produto.avaliacao}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[produto.status].color}`}>
                          {statusConfig[produto.status].label}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <button className="p-2 hover:bg-[#E2E8F0] rounded-lg transition-colors">
                          <MoreHorizontal className="w-5 h-5 text-[#64748B]" />
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
              <div key={produto.id} className="border border-[#E2E8F0] rounded-2xl p-4 hover:shadow-lg transition-shadow">
                <div className="w-full h-32 rounded-xl bg-[#F8FAFC] flex items-center justify-center text-5xl mb-4">
                  {produto.imagem}
                </div>
                <h3 className="font-medium text-[#1E293B] mb-1">{produto.nome}</h3>
                <p className="text-sm text-[#64748B] mb-2">{produto.categoria}</p>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-[#1E5EFF]">{produto.preco}</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-[#FFD60A] text-[#FFD60A]" />
                    <span className="text-sm text-[#64748B]">{produto.avaliacao}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">Estoque: {produto.estoque}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[produto.status].color}`}>
                    {statusConfig[produto.status].label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 flex items-center justify-between border-t border-[#E2E8F0]">
          <p className="text-sm text-[#64748B]">Mostrando {filteredProdutos.length} de {produtos.length} produtos</p>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#64748B] hover:bg-[#F8FAFC] transition-colors">
              Anterior
            </button>
            <button className="px-4 py-2 bg-[#1E5EFF] text-white rounded-lg text-sm font-medium">1</button>
            <button className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#64748B] hover:bg-[#F8FAFC] transition-colors">2</button>
            <button className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#64748B] hover:bg-[#F8FAFC] transition-colors">3</button>
            <button className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#64748B] hover:bg-[#F8FAFC] transition-colors">
              Próximo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
