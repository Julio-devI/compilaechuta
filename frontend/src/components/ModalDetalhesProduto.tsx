import { X, Package, DollarSign, BarChart2, Hash, Trash2 } from 'lucide-react'
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

  // 1. Estados da confirmação de exclusão
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (!isOpen || !produto) return null

  // 2. Fechar modal e resetar exclusão
  const handleClose = () => {
    setIsConfirmingDelete(false)
    onClose()
  }

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  const handleEditClick = () => {
    navigate(`/produtos/editar/${produto.id}`)
  }

  // 3. Função que deleta de verdade
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo': return 'bg-[#DCFCE7] text-[#15803D]'
      case 'Baixo Estoque': return 'bg-[#FEF9C3] text-[#A16207]'
      case 'Inativo': return 'bg-[#FEE2E2] text-[#B91C1C]'
      default: return 'bg-slate-100 text-slate-600'
    }
  }

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={handleOverlayClick}
      >
        <style>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-hide"
          onClick={(e) => e.stopPropagation()}
        >
          {/* MINI POPUP DE CONFIRMAÇÃO INJETADO AQUI (Sem quebrar o layout) */}
          {isConfirmingDelete && (
            <div className="absolute inset-0 z-[60] bg-black/20 backdrop-blur-[1px] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-2xl border border-border w-full max-w-[320px] text-center"
              >
                <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#020854] dark:text-white mb-2">Excluir item?</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Tem certeza que deseja remover este produto permanentemente?
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
                    onClick={confirmarExclusaoReal}
                    disabled={isDeleting}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? '...' : 'Sim'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* O SEU HEADER ORIGINAL */}
          <div className="flex justify-between items-center p-8 pb-4">
            <h2 className="text-3xl font-black text-[#020854] dark:text-foreground">Detalhes do Produto</h2>
            <button onClick={handleClose} className="p-2 hover:bg-background rounded-full transition-colors">
              <X className="w-8 h-8 text-muted-foreground" />
            </button>
          </div>

          {/* O SEU CORPO ORIGINAL */}
          <div className="p-8 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Coluna Esquerda Original */}
              <div className="md:col-span-1 space-y-3">
                <div className="w-full aspect-square rounded-3xl overflow-hidden border border-border relative group">
                  <img src={produto.imagem} alt={produto.nome} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <span className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-black shadow-md ${getStatusColor(produto.status)}`}>
                    {produto.status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={handleEditClick}
                    className="w-full bg-[#1E5EFF] text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Editar Produto
                  </button>
                  
                  {/* BOTÃO DE EXCLUIR ORIGINAL CHAMANDO O ESTADO */}
                  <button 
                    onClick={() => setIsConfirmingDelete(true)}
                    className="w-full bg-red-500 text-white py-3.5 rounded-xl font-bold hover:bg-red-600 transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" /> Excluir Produto
                  </button>
                </div>
              </div>

              {/* Coluna Direita Original */}
              <div className="md:col-span-2 space-y-6">
                
                {/* Info Principal */}
                <div className="bg-background border border-border rounded-3xl p-6 relative">
                   <div className="mb-2 flex items-center gap-2">
                     <span className="bg-sky-100 text-sky-700 border border-sky-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                       {produto.categoria}
                     </span>
                   </div>
                   <h3 className="text-3xl font-black text-[#020854] dark:text-foreground mb-2">{produto.nome}</h3>
                   <div className="flex items-center gap-2 text-muted-foreground text-sm font-bold">
                     <Hash className="w-4 h-4" /> SKU: {produto.sku}
                   </div>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card border border-border rounded-3xl p-6 flex flex-col justify-center">
                    <div className="flex items-center gap-2 text-muted-foreground font-bold mb-2">
                      <DollarSign className="w-5 h-5 text-emerald-500" /> Preço Atual
                    </div>
                    <span className="text-4xl font-black text-blue-900 dark:text-blue-300">{produto.preco}</span>
                  </div>

                  <div className="bg-card border border-border rounded-3xl p-6 flex flex-col justify-center">
                    <div className="flex items-center gap-2 text-muted-foreground font-bold mb-2">
                      <Package className="w-5 h-5 text-orange-500" /> Estoque Disponível
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-foreground">{produto.estoque}</span>
                      <span className="text-muted-foreground font-medium text-sm">unidades</span>
                    </div>
                  </div>
                </div>

                {/* Performance */}
                <div className="bg-card border border-[#ADE9FF] rounded-3xl p-6">
                  <h4 className="flex items-center gap-2 font-black text-[#020854] dark:text-foreground mb-6">
                    <BarChart2 className="w-5 h-5 text-[#1E5EFF]" /> Performance de Vendas
                  </h4>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-muted-foreground text-sm font-bold mb-1">Total Vendido</p>
                      <p className="text-2xl font-black text-foreground">{produto.vendidos} <span className="text-sm text-muted-foreground font-medium">unidades</span></p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm font-bold mb-1">Avaliação Média</p>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-black text-foreground">{produto.avaliacao}</p>
                        <div className="flex text-[#FFD700]">
                          {'★'.repeat(Math.floor(produto.avaliacao))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}