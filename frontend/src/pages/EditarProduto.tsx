import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Tag, DollarSign, BarChart2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

// Importando as funções do serviço
import { getProduto, atualizarProduto, ProdutoPayload } from '../services/productService'
import { getCategorias } from '../services/categoryService'

export function EditarProduto() {
  const navigate = useNavigate()
  const { id } = useParams() // Captura o ID da URL

  const [isLoading, setIsLoading] = useState(true)
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

  // 1. CARREGAR DADOS DO PRODUTO AO ABRIR A PÁGINA
  useEffect(() => {
    async function carregarProduto() {
      if (!id) return

      try {
        const produtoData = await getProduto(id)

        if (produtoData) {
          // Limpando o preço (de "R$ 4.299,00" para "4299,00") para o input
          const precoLimpo = produtoData.preco
            .replace('R$', '')
            .replace(/\./g, '')
            .trim()

          setFormData({
            nome: produtoData.nome,
            sku: produtoData.sku,
            categoria: produtoData.categoria,
            preco: precoLimpo,
            estoque: produtoData.estoque.toString(),
            status: produtoData.status === 'inativo' ? 'Inativo' : 'Ativo',
            descricao: 'Produto carregado da base de dados real.'
          })
        } else {
          alert('Produto não encontrado!')
          navigate('/produtos')
        }
      } catch (error) {
        console.error('Erro ao carregar produto:', error)
      } finally {
        setIsLoading(false)
      }
    }

    carregarProduto()
  }, [id, navigate])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // 2. ENVIAR ATUALIZAÇÃO PARA A API
  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    if (!id) return

    setIsSubmitting(true)

    // Tratamento do preço: "4.299,00" -> 4299.00
    const precoNumerico = parseFloat(
      formData.preco.replace(/\./g, '').replace(',', '.')
    ) || 0

    const payload: Partial<ProdutoPayload> = {
      nome_produto: formData.nome,
      sku: formData.sku,
      categoria: formData.categoria,
      preco: precoNumerico,
      estoque_disponivel: parseInt(formData.estoque) || 0,
      ativo: formData.status === 'Ativo' ? 'Sim' : 'Não'
    }

    const sucesso = await atualizarProduto(id, payload)

    if (sucesso) {
      navigate('/produtos')
    } else {
      console.error('Erro ao atualizar produto.')
      setIsSubmitting(false) // Libera o botão
    }

    setIsSubmitting(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <p className="text-[#020854] font-black animate-pulse">A carregar dados do produto...</p>
      </div>
    )
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
            <h1 className="text-3xl font-black text-[#020854]">Editar Produto</h1>
            <p className="text-slate-500 text-sm mt-1">ID: {id}</p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 bg-[#1E5EFF] text-white px-8 py-3.5 rounded-full font-black hover:bg-[#1E5EFF]/90 transition-colors shadow-sm disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {isSubmitting ? 'A Guardar...' : 'Guardar Alterações'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Esquerda: Form */}
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
                <label className="block text-sm font-bold text-slate-700 mb-2">Descrição</label>
                <textarea
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleChange}
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
                <input
                  type="text"
                  name="preco"
                  value={formData.preco}
                  onChange={handleChange}
                  className="w-full p-4 bg-[#F8FAFC] rounded-2xl border border-slate-200 focus:outline-none focus:border-emerald-500 transition-all font-black text-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Quantidade *</label>
                <input
                  type="number"
                  name="estoque"
                  value={formData.estoque}
                  onChange={handleChange}
                  className="w-full p-4 bg-[#F8FAFC] rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 transition-all font-bold text-slate-700"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <h2 className="text-xl font-black text-[#020854] mb-6 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-orange-500" /> Status
            </h2>

            <div className="space-y-3">
              {['Ativo', 'Inativo'].map((status) => (
                <label key={status} className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="status"
                    value={status}
                    checked={formData.status === status}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600"
                  />
                  <span className="font-bold text-slate-700">{status}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}