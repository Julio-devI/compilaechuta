import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Upload, Tag, Box, DollarSign, BarChart2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// Importando a função de criar do nosso service
import { criarProduto, ProdutoPayload } from '../services/productService'
import { getCategorias } from '../services/categoryService'

export function CadastroProduto() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categoriasLista, setCategoriasLista] = useState<string[]>([])
  const [formData, setFormData] = useState({
    nome: '',
    sku: '',
    categoria: '',
    preco: '',
    estoque: '',
    status: 'Ativo',
    descricao: ''
  })

  useEffect(() => {
    getCategorias().then(data => {
      setCategoriasLista(data.map((c: any) => c.nome_categoria))
    })
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Convertendo "4.299,00" para 4299.00 (formato que o banco aceita)
    const precoFormatado = parseFloat(formData.preco.replace(/\./g, '').replace(',', '.')) || 0

    // Montando o payload exatamente como a API espera
    const payload: ProdutoPayload = {
      id_produto: `PROD-${Date.now()}`, // Gerando um ID único temporário
      sku: formData.sku,
      nome_produto: formData.nome,
      categoria: formData.categoria || 'Outros',
      fornecedor: 'Não informado', // Campo não tem no form, mandando padrão
      preco: precoFormatado,
      peso_kg: 0, // Campo não tem no form, mandando padrão
      estoque_disponivel: parseInt(formData.estoque) || 0,
      ativo: formData.status === 'Ativo' ? 'Sim' : 'Não',
      precisa_revisao: 'Não'
    }

    const sucesso = await criarProduto(payload)

    if (sucesso) {
      navigate('/produtos')
    } else {
      console.error('Erro ao cadastrar produto. Verifique o payload e a API.')
      setIsSubmitting(false) // Libera o botão caso o usuário queira tentar de novo
    }

    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 font-sans text-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/produtos')}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-[#020854]">Novo Produto</h1>
            <p className="text-slate-500 text-sm mt-1">Preencha as informações para cadastrar um novo item no catálogo.</p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 bg-[#1E5EFF] text-white px-8 py-3.5 rounded-full font-black hover:bg-[#1E5EFF]/90 transition-colors shadow-sm disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {isSubmitting ? 'Salvando...' : 'Salvar Produto'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Esquerda: Informações Principais */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <h2 className="text-xl font-black text-[#020854] mb-6 flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-600" /> Informações Básicas
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nome do Produto *</label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  placeholder="Ex: Smart TV 55 QLED 4K"
                  className="w-full p-4 bg-[#F8FAFC] rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-slate-700"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">SKU *</label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    placeholder="Ex: SKU-12345"
                    className="w-full p-4 bg-[#F8FAFC] rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Categoria</label>
                  <select name="categoria" value={formData.categoria} onChange={handleChange} className="w-full p-4 bg-[#F8FAFC] rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-slate-700 appearance-none">
                    <option value="">Selecione uma categoria</option>
                    {categoriasLista.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Descrição do Produto</label>
                <textarea
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleChange}
                  placeholder="Descreva os detalhes, especificações e diferenciais do produto..."
                  rows={4}
                  className="w-full p-4 bg-[#F8FAFC] rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-slate-700 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <h2 className="text-xl font-black text-[#020854] mb-6 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" /> Preço e Estoque
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Preço (R$) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                  <input
                    type="text"
                    name="preco"
                    value={formData.preco}
                    onChange={handleChange}
                    placeholder="0,00"
                    className="w-full pl-12 pr-4 py-4 bg-[#F8FAFC] rounded-2xl border border-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-black text-slate-800"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Quantidade em Estoque *</label>
                <div className="relative">
                  <Box className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    name="estoque"
                    value={formData.estoque}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full pl-12 pr-4 py-4 bg-[#F8FAFC] rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-bold text-slate-700"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Imagem e Status */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <h2 className="text-xl font-black text-[#020854] mb-6 flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-600" /> Imagem do Produto
            </h2>

            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-[#F8FAFC] hover:bg-slate-50 transition-colors cursor-pointer group">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <p className="font-bold text-slate-700 mb-1">Clique para enviar ou arraste a imagem</p>
              <p className="text-xs text-slate-500 font-medium">SVG, PNG, JPG ou GIF (max. 800x400px)</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <h2 className="text-xl font-black text-[#020854] mb-6 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-orange-500" /> Status do Produto
            </h2>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="status"
                  value="Ativo"
                  checked={formData.status === 'Ativo'}
                  onChange={handleChange}
                  className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="font-bold text-slate-700">Ativo</p>
                  <p className="text-xs text-slate-500 font-medium">O produto será exibido na loja.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="status"
                  value="Inativo"
                  checked={formData.status === 'Inativo'}
                  onChange={handleChange}
                  className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="font-bold text-slate-700">Inativo</p>
                  <p className="text-xs text-slate-500 font-medium">Oculto do catálogo e da loja.</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}