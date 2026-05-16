import { X, DollarSign, Trash2, MessageSquare, Star, Flame, ArrowRight, ShoppingCart, Percent, Shield, Cpu } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { MouseEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteProduto } from '../services/productService'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  produto: any
}

export function ModalDetalhesProduto({ isOpen, onClose, produto }: ModalProps) {
  const navigate = useNavigate()
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (!isOpen || !produto) return null

  const handleClose = () => {
    setIsConfirmingDelete(false)
    onClose()
  }

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  const confirmarExclusaoReal = async () => {
    setIsDeleting(true)
    try {
      await deleteProduto(produto.id)
      handleClose()
      window.location.reload()
    } catch (error) {
      console.error("Erro ao excluir:", error)
      alert("Ocorreu um erro ao excluir o produto.")
    } finally {
      setIsDeleting(false)
    }
  }

  // Mapeamento de especificações (com fallbacks baseados na imagem caso seu objeto varie)
  const especificacoes = [
    { label: 'Processador', value: produto.especificacoes?.processador || 'Intel Core i7-1165G7' },
    { label: 'Memória', value: produto.especificacoes?.memoria || '16GB DDR4' },
    { label: 'Armazenamento', value: produto.especificacoes?.armazenamento || 'SSD 512GB NVMe' },
    { label: 'Tela', value: produto.especificacoes?.tela || '15.6" Full HD (1920x1080)' },
    { label: 'Placa de armazenamento', value: produto.especificacoes?.placaVideo || 'Intel Iris Xe Graphics' },
    { label: 'Peso', value: produto.especificacoes?.peso || '1.8kg' },
  ]

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={handleOverlayClick}
      >
        <style>{`
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="bg-[#F8F9FC] w-full max-w-[1200px] rounded-[32px] overflow-hidden shadow-2xl relative max-h-[92vh] overflow-y-auto scrollbar-hide p-8 md:p-10 border border-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* POPUP DE CONFIRMAÇÃO DE EXCLUSÃO */}
          {isConfirmingDelete && (
            <div className="absolute inset-0 z-[60] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-6 rounded-3xl shadow-2xl max-w-[340px] text-center border">
                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#020854] mb-2">Excluir item?</h3>
                <p className="text-sm text-slate-500 mb-6">Tem certeza que deseja remover este produto permanentemente?</p>
                <div className="flex gap-3">
                  <button onClick={() => setIsConfirmingDelete(false)} disabled={isDeleting} className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-slate-100 text-slate-600">Não</button>
                  <button onClick={confirmarExclusaoReal} disabled={isDeleting} className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-red-600 text-white">{isDeleting ? '...' : 'Sim'}</button>
                </div>
              </motion.div>
            </div>
          )}

          {/* HEADER */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[32px] font-black text-[#0A113F] tracking-tight">Detalhes do Produto</h2>
            <button onClick={handleClose} className="p-2 hover:bg-slate-200/60 rounded-full transition-colors text-slate-800">
              <X className="w-8 h-8 stroke-[2.5]" />
            </button>
          </div>

          {/* GRID PRINCIPAL */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* CARD ESQUERDO: Preview do Produto */}
            <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-[32px] p-6 shadow-sm">
              {/* Box da Imagem / Blueprint */}
              <div className="w-full aspect-[16/9] bg-[#E1E6EB] rounded-2xl relative border border-slate-300/60 flex items-center justify-center overflow-hidden mb-5">
                {/* Linhas cruzadas simulando o placeholder da imagem */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-slate-700 rotate-45 scale-y-[1.5]"></div>
                  <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-slate-700 -rotate-45 scale-y-[1.5]"></div>
                </div>
                {produto.imagem && (
                  <img src={produto.imagem} alt={produto.nome} className="absolute inset-0 w-full h-full object-cover hidden" />
                )}
              </div>

              {/* Badges de Categorias/Tags */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="bg-[#D3EFFF] text-[#0091FF] px-3 py-1 rounded-full text-xs font-bold">
                  {produto.categoria || 'Eletrônicos'}
                </span>
                <span className="bg-[#EBEBF5] text-[#1C1C1E] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-slate-700" /> Mais vendido
                </span>
                <span className="text-slate-400 text-xs font-medium ml-auto">
                  {produto.sku || 'NB-DELL-001'}
                </span>
              </div>

              {/* Título e Preço */}
              <h3 className="text-2xl font-black text-[#0A113F] mb-1">{produto.nome || 'Notebook Dell Inspiron 15'}</h3>
              <div className="text-[32px] font-black text-[#0061FF] mb-4">
                {produto.preco || 'R$3.200,00'}
              </div>

              {/* Sub-informações internas (Tickets e Estrelas) */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-700">
                  <div className="bg-[#0061FF] text-white p-1.5 rounded-lg">
                    <MessageSquare className="w-4 h-4 fill-white" />
                  </div>
                  <div className="leading-tight">
                    <p className="text-xs font-black">100 Tickets</p>
                    <p className="text-[11px] text-slate-400 font-medium">Totais</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-white px-1 py-0.5 rounded-md">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <span className="text-lg font-black text-slate-800">{produto.avaliacao || '4.8'}</span>
                </div>
              </div>

              {/* Footer do Card Esquerdo */}
              <div className="flex justify-between text-slate-400 text-xs font-bold mt-4 pt-2">
                <span>Estoque: {produto.estoque || 45}</span>
                <span>Vendidos: {produto.vendidos || 120}</span>
              </div>
            </div>

            {/* CARD DIREITO: Detalhes e Especificações */}
            <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-[32px] p-8 shadow-sm space-y-6 self-stretch flex flex-col justify-between">

              {/* Informações Gerais */}
              <div>
                <h4 className="text-[11px] font-black text-[#0061FF] tracking-wider uppercase mb-2">Informações Gerais</h4>
                <p className="text-[15px] font-bold text-slate-400 leading-relaxed">
                  {produto.descricao || 'Notebook Dell Inspiron 15 com processador Intel Core i7, 16GB RAM, SSD 512GB, tela Full HD de 15.6 polegadas. Ideal para trabalho e entretenimento.'}
                </p>
              </div>

              {/* Especificações Técnicas */}
              <div>
                <h4 className="text-[11px] font-black text-[#0061FF] tracking-wider uppercase mb-4">Especificações Técnicas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  {especificacoes.map((esp, idx) => (
                    <div key={idx} className="flex bg-[#F4F6F9] rounded-xl px-4 py-3 items-center justify-between text-sm">
                      <span className="text-slate-400 font-medium">{esp.label}</span>
                      <span className="text-[#0A113F] font-bold text-right max-w-[60%] truncate">{esp.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* GRID INFERIOR: Botão IA + Cards de Métricas */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-6">

            {/* CTA Inteligência Artificial */}
            <button className="lg:col-span-5 bg-[#0061FF] text-white p-6 rounded-[24px] flex items-center justify-between text-left group hover:bg-blue-700 transition-all shadow-md relative overflow-hidden">
              <div className="flex items-center gap-4 z-10">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white backdrop-blur-md">
                  <Cpu className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-lg leading-tight">Perguntar à IA sobre este produto</h4>
                  <p className="text-white/70 text-xs mt-0.5 font-medium max-w-[90%]">
                    "Qual o motivo do atraso?" — o agente lê o contexto desta tela
                  </p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 transform group-hover:translate-x-1 transition-transform z-10 shrink-0" />
            </button>

            {/* Métricas Dinâmicas */}
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-4">

              {/* Total Vendido */}
              <div className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#E6F4FE] text-[#0091FF]"><ShoppingCart className="w-4 h-4" /></div>
                  <div className="text-[11px] font-bold text-slate-400 leading-tight">Total<br/>Vendido</div>
                </div>
                <div className="text-lg font-black text-[#0A113F] mt-3">{produto.vendidos || '128'}</div>
              </div>

              {/* Receita Total */}
              <div className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#E6F4FE] text-[#0091FF]"><DollarSign className="w-4 h-4" /></div>
                  <div className="text-[11px] font-bold text-slate-400 leading-tight">Receita<br/>total</div>
                </div>
                <div className="text-lg font-black text-[#0A113F] mt-3">{produto.receitaTotal || 'R$100.000'}</div>
              </div>

              {/* Estoque Total */}
              <div className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#E6F4FE] text-[#0091FF]"><Percent className="w-4 h-4" /></div>
                  <div className="text-[11px] font-bold text-slate-400 leading-tight">Estoque<br/>total</div>
                </div>
                <div className="text-lg font-black text-[#0A113F] mt-3">{produto.estoque || '45'}</div>
              </div>

              {/* Avaliação Média */}
              <div className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#E6F4FE] text-[#0091FF]"><Shield className="w-4 h-4" /></div>
                  <div className="text-[11px] font-bold text-slate-400 leading-tight">Avaliação<br/>média</div>
                </div>
                <div className="text-lg font-black text-[#0A113F] mt-3">{produto.avaliacaoContagem || '128'}</div>
              </div>

            </div>
          </div>

          {/* BOTÃO DISCRETO DE EXCLUSÃO (Para manter a funcionalidade original acessível) */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setIsConfirmingDelete(true)}
              className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remover Registro
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  )
}