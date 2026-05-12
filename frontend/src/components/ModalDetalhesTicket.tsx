import {
  X, Clock, Package, Ticket, Headphones, CheckCircle2, AlertCircle, MessageSquare, Box
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { MouseEvent } from 'react'

interface SuporteTicket {
  id_ticket: string
  id_cliente: string
  nome_cliente: string
  id_pedido: string | null
  id_produto: string | null
  data_abertura: string
  data_resolucao: string | null
  tempo_resolucao_horas: number | null
  status: 'aberto' | 'resolvido'
  tipo_problema: string
  agente_suporte: string | null
  nota_avaliacao: number | null
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  ticket: SuporteTicket | null
}

export function ModalDetalhesTicket({ isOpen, onClose, ticket }: ModalProps) {
  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberto': return 'bg-[#FEF9C3] text-[#A16207] border-[#FEF08A]'
      case 'resolvido': return 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]'
      default: return 'bg-slate-100 text-slate-600 border-slate-200'
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  return (
    <AnimatePresence>
      {isOpen && ticket && (
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
            className="bg-white w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
                  <Ticket className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-[#020854]">Detalhes do Ticket</h2>
                  <p className="text-slate-500 font-medium">{ticket.id_ticket}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-8 h-8 text-slate-400" />
              </button>
            </div>

            <div className="p-8 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Coluna Esquerda: Status e Cliente */}
                <div className="md:col-span-1 space-y-6">
                  
                  {/* Status Principal */}
                  <div className={`rounded-3xl p-6 border ${getStatusColor(ticket.status)}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {ticket.status === 'resolvido' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                      <span className="text-[10px] font-black uppercase tracking-widest">Status Atual</span>
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-wider">{ticket.status}</h3>
                    {ticket.status === 'aberto' && (
                       <p className="text-xs font-bold mt-2 opacity-80">Aguardando resolução</p>
                    )}
                  </div>

                  {/* Info Cliente */}
                  <div className="bg-[#F8FAFC] border border-slate-100 rounded-3xl p-6">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 block">Cliente</span>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 bg-sky-200 rounded-2xl flex items-center justify-center text-sky-700 font-black text-xl">
                        {getInitials(ticket.nome_cliente)}
                      </div>
                      <div>
                        <h4 className="font-black text-[#020854] text-lg leading-tight">{ticket.nome_cliente}</h4>
                        <p className="text-slate-400 text-xs font-bold">{ticket.id_cliente}</p>
                      </div>
                    </div>
                    <button className="w-full bg-white text-slate-700 border border-slate-200 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors text-sm">
                      Ver perfil completo
                    </button>
                  </div>

                  {/* Agente de Suporte */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 block">Agente Responsável</span>
                     {ticket.agente_suporte ? (
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-black">
                           <Headphones className="w-5 h-5" />
                         </div>
                         <span className="font-bold text-slate-700">{ticket.agente_suporte}</span>
                       </div>
                     ) : (
                       <div className="flex items-center gap-3 text-amber-500">
                          <AlertCircle className="w-5 h-5" />
                          <span className="font-bold text-sm">Não atribuído</span>
                       </div>
                     )}
                  </div>

                </div>

                {/* Coluna Direita: Detalhes do Problema e Timeline */}
                <div className="md:col-span-2 space-y-6">
                  
                  {/* Problema */}
                  <div className="bg-white border border-[#ADE9FF] rounded-3xl p-6">
                     <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2 block">Tipo de Problema</span>
                     <h3 className="text-2xl font-black text-[#020854] mb-6">{ticket.tipo_problema}</h3>
                     
                     <div className="grid grid-cols-2 gap-4">
                       <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
                            <Package className="w-5 h-5 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Pedido Vinculado</p>
                            <p className="font-black text-slate-700">{ticket.id_pedido || 'Nenhum'}</p>
                          </div>
                       </div>
                       <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
                            <Box className="w-5 h-5 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Produto Vinculado</p>
                            <p className="font-black text-slate-700">{ticket.id_produto || 'Nenhum'}</p>
                          </div>
                       </div>
                     </div>
                  </div>

                  {/* Timeline & Avaliação */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    
                    {/* Timeline */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 block">Timeline do Chamado</span>
                      
                      <div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
                        
                        <div className="relative pl-6">
                          <div className="absolute w-4 h-4 bg-slate-200 rounded-full -left-[9px] top-1 border-4 border-white"></div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Abertura</p>
                          <p className="font-bold text-slate-700 text-sm">{new Date(ticket.data_abertura).toLocaleString('pt-BR')}</p>
                        </div>

                        <div className="relative pl-6">
                          <div className={`absolute w-4 h-4 rounded-full -left-[9px] top-1 border-4 border-white ${ticket.data_resolucao ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Resolução</p>
                          <p className={`font-bold text-sm ${ticket.data_resolucao ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                            {ticket.data_resolucao ? new Date(ticket.data_resolucao).toLocaleString('pt-BR') : 'Aguardando...'}
                          </p>
                        </div>

                      </div>

                      {ticket.tempo_resolucao_horas !== null && (
                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-bold text-slate-600">Resolvido em <span className="text-[#020854] font-black">{ticket.tempo_resolucao_horas} horas</span></span>
                        </div>
                      )}
                    </div>

                    {/* Avaliação */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 block">Avaliação do Cliente</span>
                        
                        {ticket.nota_avaliacao ? (
                          <div className="flex flex-col items-center justify-center py-4">
                            <span className="text-5xl font-black text-[#020854] mb-2">{ticket.nota_avaliacao.toFixed(1)}</span>
                            <div className="flex text-[#FFD700] text-2xl">
                              {'★'.repeat(Math.floor(ticket.nota_avaliacao))}
                              {'☆'.repeat(5 - Math.floor(ticket.nota_avaliacao))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-6 opacity-50">
                            <MessageSquare className="w-10 h-10 text-slate-300 mb-2" />
                            <p className="text-sm font-bold text-slate-400 text-center">Nenhuma avaliação<br/>disponível ainda</p>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
