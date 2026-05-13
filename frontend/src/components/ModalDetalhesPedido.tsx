import {
  X, Clock, Truck, Package,
  Check, Phone, Mail, MapPin, ArrowUpRight, Headphones
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { MouseEvent } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  pedido: any // Idealmente usar a interface Pedido definida anteriormente
}

export function ModalDetalhesPedido({ isOpen, onClose, pedido }: ModalProps) {
  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={handleOverlayClick}
        >
          {/* Adicionado o bloco de estilo para esconder o scrollbar */}
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
            className="bg-card w-full max-w-6xl rounded-[32px] overflow-hidden shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-8 pb-4">
              <h2 className="text-3xl font-black text-[#020854] dark:text-foreground">Detalhes do pedido</h2>
              <button onClick={onClose} className="p-2 hover:bg-background rounded-full transition-colors">
                <X className="w-8 h-8 text-muted-foreground" />
              </button>
            </div>

            <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-3">

              {/* Coluna Esquerda */}
              <div className="space-y-6">

                {/* Card Info Principal */}
                <div className="border border-border rounded-3xl p-6 relative">
                  <span className="bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-full absolute top-6 right-6">
                    ● ATRASADO
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pedido</span>
                  <h3 className="text-3xl font-black text-[#020854] dark:text-foreground mt-1">{pedido.id}</h3>
                  <p className="text-muted-foreground text-sm font-medium">Comprado em {pedido.data}, 14:32:00</p>

                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="bg-background p-4 rounded-2xl border border-border">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground mb-1">
                        <Clock className="w-3 h-3" /> Tempo aberto
                      </span>
                      <span className="text-lg font-bold text-foreground">{pedido.tempoAberto.split(' ')[0]} dias</span>
                    </div>
                    <div className="bg-red-50 text-red-500 p-4 rounded-2xl border border-red-100">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold mb-1">
                        <Truck className="w-3 h-3" /> Entrega
                      </span>
                      <span className="text-lg font-bold">Fora do prazo</span>
                    </div>
                    <div className="bg-background p-4 rounded-2xl border border-border">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground mb-1">
                        <Package className="w-3 h-3" /> Transportadora
                      </span>
                      <span className="text-sm font-bold text-foreground block">Loggi Express</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-medium">LE9982KX-BR</span>
                    </div>
                  </div>

                  {/* Pipeline Logístico */}
                  <div className="mt-8">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-4">Pipeline logístico</span>
                    <div className="flex justify-between items-center relative">
                      {[
                        { label: 'Compra', active: true },
                        { label: 'Processamento', active: true },
                        { label: 'Enviado', active: true },
                        { label: 'Atrasado', active: 'current' },
                        { label: 'Entregue', active: false }
                      ].map((step, i, arr) => (
                        <div key={i} className="flex flex-col items-center flex-1 relative">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10
                            ${step.active === true ? 'bg-[#020854] text-white' :
                              step.active === 'current' ? 'bg-red-500 text-white' : 'bg-background text-muted-foreground'}`}>
                            {step.active === true ? <Check className="w-5 h-5" /> : <span className="font-bold">{i + 1}</span>}
                          </div>
                          <span className={`text-[10px] font-bold mt-2 ${step.active === 'current' ? 'text-red-500' : 'text-slate-400'}`}>
                            {step.label}
                          </span>
                          {i < arr.length - 1 && (
                            <div className={`absolute h-[2px] w-full top-5 left-1/2 -z-0 ${step.active === true ? 'bg-[#020854]' : 'bg-border'}`} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Suporte e Resolução */}
                <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100">
                  <div className="flex items-center gap-2 text-blue-900 font-black text-xs uppercase tracking-wider mb-4">
                    <Headphones className="w-4 h-4" /> Suporte e Resolução
                  </div>
                  <h4 className="text-lg font-black text-[#020854] mb-4">Ticket vinculado</h4>
                  <div className="bg-amber-400 text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 mb-4">
                    Pedido atrasado com Ticket aberto — Ação recomendada
                  </div>
                  <div className="bg-background rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div>
                      <div className="flex gap-2 mb-1">
                        <span className="font-black text-foreground">TK-77821</span>
                        <span className="text-[9px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded font-bold">ALTA</span>
                        <span className="text-[9px] bg-amber-400 text-white px-2 py-0.5 rounded font-bold">ABERTA</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">Cliente solicita previsão atualizada da entrega</p>
                    </div>
                    <button className="bg-[#020854] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                      Abrir ticket <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Coluna Direita */}
              <div className="space-y-6">
                {/* Contexto do Cliente */}
                <div className="border border-[#ADE9FF] rounded-3xl p-6 bg-card">
                  <div className="flex justify-between items-start mb-4 ">
                    <div>
                      <span className="text-[10px] font-bold text-blue-500 uppercase">Contexto do cliente</span>
                      <h4 className="text-lg font-black text-[#020854] dark:text-foreground">Quem comprou</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-sky-200 rounded-4xl mb-17 flex items-center justify-center text-sky-700 font-black text-xl">
                      AA
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-[#020854] dark:text-foreground text-xl">{pedido.cliente}</span>
                        <span className="bg-[#020854] text-white text-[9px] px-2 py-0.5 rounded-md font-bold">Alta</span>
                      </div>
                      <div className="flex gap-6 mt-2">

                        {/* Lista vertical de informações */}
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-muted-foreground text-xs font-bold">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">marina.alb@email.com</span>
                          </span>

                          <span className="flex items-center gap-1.5 text-muted-foreground text-xs font-bold">
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            <span>(11) 98821-4477</span>
                          </span>
                          <span className="flex items-center gap-1.5 text-muted-foreground text-xs font-bold">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span>São Paulo, SP</span>
                          </span>
                          <span className="text-muted-foreground text-xs font-bold">38 pedidos no total</span>
                        </div>

                        {/* Segunda coluna */}
                        <div className="flex-1 ml-20">
                          <button className="bg-[#ADE9FF] text-[#020854] ml-10 mb-2 px-3 py-1.5 rounded-xl text-[14px] font-black flex items-center gap-1">
                            Visão 360 <ArrowUpRight className="w-4 h-4" />
                          </button>

                          <button className="bg-[#ADE9FF] text-[#020854] px-3 py-1.5 rounded-xl text-[14px] font-black flex items-center gap-1">
                            Contatar cliente <ArrowUpRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Itens do Pedido */}
                <div className="border border-border rounded-3xl p-6 flex-1">
                  <span className="text-[10px] font-bold text-blue-500 uppercase">Itens do pedido</span>
                  <h4 className="text-lg font-black text-[#020854] dark:text-foreground mb-6">Produtos & Performance</h4>

                  <div className="space-y-4">
                    {[
                      { name: 'Smart TV 55" QLED 4K Vivara', sku: 'ELE-9921', price: '3.499,00', tags: ['Mais vendido', 'Alta devolução'] },
                      { name: 'Soundbar Bluetooth 2.1 Atmos', sku: 'LAR-2210', price: '790,90', tags: ['Novo'] }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-4 group">
                        <div className="w-12 h-12 bg-background border border-border rounded-xl flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-bold text-[#020854] dark:text-foreground text-sm">{item.name}</span>
                            <span className="font-black text-[#020854] dark:text-foreground text-sm">R$ {item.price}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">SKU {item.sku} - Qtd 1</span>
                            <span className="text-[9px] text-slate-400 font-medium italic text-right">R$ {item.price} un</span>
                          </div>
                          <div className="flex gap-2 mt-1">
                            {item.tags.map(tag => (
                              <span key={tag} className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${tag.includes('Alta') ? 'bg-red-50 text-red-500 border-red-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'}`}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 pt-6 border-t border-dashed border-border flex justify-between items-end">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total do pedido</span>
                    <span className="text-3xl font-black text-[#020854] dark:text-foreground">{pedido.valor}</span>
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