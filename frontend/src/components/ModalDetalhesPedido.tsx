import {
  X, Clock, Truck, Package, MapPin, ArrowUpRight, Headphones, Star, Ticket as TicketIcon, Loader2,
  CreditCard
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { MouseEvent, useEffect, useState } from 'react'
import { getTicketPorPedido, Ticket } from '../services/supportService'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  pedido: any // Idealmente usar a interface Pedido definida anteriormente
}

export function ModalDetalhesPedido({ isOpen, onClose, pedido }: ModalProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(false);

  useEffect(() => {
    async function fetchTicket() {
      // Usa idReal (ID interno do banco) estritamente para não falhar com o ID de exibição
      const idParaBusca = pedido?.idReal;
      
      if (idParaBusca) {
        setLoadingTicket(true);
        const data = await getTicketPorPedido(idParaBusca);
        setTicket(data);
        setLoadingTicket(false);
      } else {
        console.warn("Nenhum ID encontrado no pedido. Não é possível buscar o ticket.", pedido);
        setTicket(null);
      }
    }
    
    if (isOpen && pedido) {
      fetchTicket();
    } else {
      setTicket(null);
    }
  }, [pedido, isOpen]);

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const statusStyles: Record<string, string> = {
    Aprovado: "bg-emerald-50 text-emerald-600 border-emerald-100",
    Processando: "bg-orange-50 text-orange-600 border-orange-100",
    Recusado: "bg-red-50 text-red-600 border-red-100",
    Reembolsado: "bg-blue-50 text-blue-600 border-blue-100",
    default: "bg-slate-50 text-slate-600 border-slate-100",
  };

  const getTempoAberto = () => {
    if (!ticket || !ticket.dataAberturaRaw) {
      return pedido?.tempoAberto !== '----' ? `${pedido.tempoAberto.split(' ')[0]} dias` : '----';
    }

    const dataAbertura = new Date(ticket.dataAberturaRaw);
    const dataFim = ticket.dataResolucaoRaw ? new Date(ticket.dataResolucaoRaw) : new Date();

    const diffMs = Math.abs(dataFim.getTime() - dataAbertura.getTime());
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return '1 dia';
    if (diffDays < 30) return `${diffDays} dias`;
    
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return '1 mês';
    if (diffMonths < 12) return `${diffMonths} meses`;

    const diffYears = Math.floor(diffDays / 365);
    if (diffYears === 1) return '1 ano';
    return `${diffYears} anos`;
  }

  if (!pedido) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
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
              <h2 className="text-3xl font-black text-[#020854] dark:text-foreground">
                Detalhes do pedido
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-background rounded-full transition-colors"
              >
                <X className="w-8 h-8 text-muted-foreground" />
              </button>
            </div>

            <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Coluna Esquerda */}
              <div className="space-y-6">
                {/* Card Info Principal */}
                <div className="border border-border rounded-3xl p-6 relative">
                  {pedido.status === "Atrasado" && (
                    <span className="bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-full absolute top-6 right-6">
                      ● ATRASADO
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Pedido
                  </span>
                  <h3 className="text-3xl font-black text-[#020854] dark:text-foreground mt-1">
                    {pedido.id}
                  </h3>
                  <p className="text-muted-foreground text-sm font-medium">
                    Comprado em {pedido.data}
                  </p>

                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div
                      className={`p-4 rounded-2xl border ${
                        ticket?.status === "resolvido"
                          ? "bg-emerald-50 text-emerald-500 border-emerald-100"
                          : ticket?.status === "aberto"
                            ? "bg-amber-50 text-amber-600 border-amber-100" // Estilo para o estado Aberto
                            : "bg-background text-foreground border-border" // Estilo padrão
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground mb-1">
                        <Clock className="w-3 h-3" /> Tempo aberto
                      </span>

                      <span className="text-lg font-bold">
                        {getTempoAberto()}
                      </span>

                      {/* Tag para Resolvido */}
                      {ticket?.status === "resolvido" && (
                        <span className="text-[10px] font-bold text-emerald-600 block mt-1 uppercase">
                          Resolvido
                        </span>
                      )}

                      {/* Tag para Aberto */}
                      {ticket?.status === "aberto" && (
                        <span className="text-[10px] font-bold text-amber-600 block mt-1 uppercase">
                          Aberto
                        </span>
                      )}
                    </div>
                    <div className="p-4 rounded-2xl border bg-background text-foreground border-border">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground mb-1">
                        <CreditCard className="w-3 h-3" /> Forma de Pagamento
                      </span>

                      <span className="text-lg font-bold block">
                        {pedido?.metodo_pagamento || "Não informada"}
                      </span>

                      {pedido?.pagamentoDetalhes && (
                        <span className="text-[10px] font-bold text-blue-600 block mt-1 uppercase">
                          {pedido.pagamentoDetalhes}
                        </span>
                      )}
                    </div>
                    <div
                      className={`p-4 rounded-2xl border ${statusStyles[pedido.status] || statusStyles.default}`}
                    >
                      <span className="flex items-center gap-1.5 text-[10px] font-bold mb-1">
                        <Truck className="w-3 h-3" /> status
                      </span>
                      <span className="text-lg font-bold">{pedido.status}</span>
                    </div>
                    <div className="bg-background p-4 rounded-2xl border border-border">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground mb-1">
                        <Package className="w-3 h-3" /> Transportadora
                      </span>
                      <span className="text-sm font-bold text-foreground block">
                        Loggin Express
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase font-medium">
                        LE9982KX-BR
                      </span>
                    </div>
                  </div>

                  {/* Pipeline Logístico */}
                  <div className="mt-8">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-4">
                      Pipeline logístico
                    </span>
                    <div className="flex justify-between items-center relative">
                      {(() => {
                        // Definimos os passos lógicos do modal
                        const pipelineSteps = [
                          "Processando",
                          "Reembolsado",
                          "Aprovado",
                          "Recusado",
                        ];
                        const currentStepIndex = pipelineSteps.indexOf(
                          pedido.status,
                        );

                        return pipelineSteps.map((statusName, i, arr) => {
                          const isActive = statusName === pedido.status;
                          const isCompleted = i < currentStepIndex;

                          // Estilo dinâmico baseado no dicionário statusStyles
                          const stepStyle = isActive
                            ? statusStyles[statusName]
                            : isCompleted
                              ? "bg-slate-700 border-slate-700 text-white"
                              : "bg-background border-border text-muted-foreground";

                          return (
                            <div
                              key={statusName}
                              className="flex flex-col items-center flex-1 relative"
                            >
                              {/* Bolinha com Número Fixo */}
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center z-10 border-2 transition-all duration-300
              ${stepStyle} ${isActive ? "scale-110 shadow-sm" : ""}`}
                              >
                                <span className="font-black text-xs">
                                  {i + 1}
                                </span>
                              </div>

                              {/* Label do Status */}
                              <span
                                className={`text-[10px] font-bold mt-2 transition-colors duration-300
              ${isActive ? "text-foreground" : "text-slate-400"}`}
                              >
                                {statusName}
                              </span>

                              {/* Linha Conectora (posicionada absolutamente atrás das bolinhas) */}
                              {i < arr.length - 1 && (
                                <div
                                  className={`absolute h-[2px] w-full top-5 left-1/2 -z-0 transition-colors duration-500
                ${isCompleted ? "bg-slate-700" : "bg-border"}`}
                                />
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

                {/* Suporte e Resolução */}
                <div
                  className={`rounded-3xl p-6 border transition-colors ${
                    ticket?.status === "resolvido"
                      ? "bg-emerald-50 border-emerald-100"
                      : ticket
                        ? "bg-amber-50 border-amber-100"
                        : "bg-background border-border"
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 font-black text-xs uppercase tracking-wider mb-4 ${
                      ticket?.status === "resolvido"
                        ? "text-emerald-700"
                        : ticket
                          ? "text-blue-900"
                          : "text-muted-foreground"
                    }`}
                  >
                    <Headphones className="w-4 h-4" /> Suporte e Resolução
                  </div>
                  <h4
                    className={`text-lg font-black mb-4 ${
                      ticket?.status === "resolvido"
                        ? "text-emerald-900"
                        : ticket
                          ? "text-[#020854]"
                          : "text-foreground"
                    }`}
                  >
                    Ticket vinculado
                  </h4>

                  {loadingTicket ? (
                    <div className="flex justify-center items-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    </div>
                  ) : ticket ? (
                    <>
                      <div
                        className={`text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 mb-4 transition-colors ${
                          ticket.status === "resolvido"
                            ? "bg-emerald-500"
                            : "bg-amber-400"
                        }`}
                      >
                        {ticket.status === "resolvido"
                          ? "Problema resolvido com sucesso — Nenhuma ação necessária"
                          : `Pedido com Ticket ${ticket.status} — Ação recomendada`}
                      </div>
                      <div className="bg-background rounded-2xl p-4 flex items-center justify-between shadow-sm">
                        <div>
                          <div className="flex gap-2 mb-1">
                            <span className="font-black text-foreground">
                              TK - {ticket.id}
                            </span>
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                                ticket.prioridade === "alta" ||
                                ticket.prioridade === "urgente"
                                  ? "bg-amber-100 text-amber-600"
                                  : "bg-blue-100 text-blue-600"
                              }`}
                            >
                              {ticket.prioridade}
                            </span>
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                                ticket.status === "aberto" ||
                                ticket.status === "em_andamento"
                                  ? "bg-amber-400 text-white"
                                  : "bg-emerald-400 text-white"
                              }`}
                            >
                              {ticket.status.replace("_", " ")}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground font-medium">
                            {ticket.assunto}
                          </p>
                        </div>
                        <button className="bg-[#020854] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-blue-900 transition-colors">
                          Ver ticket <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-background rounded-2xl p-6 text-center border border-dashed border-border">
                      <p className="text-sm text-muted-foreground font-medium mb-2">
                        Nenhum ticket de suporte aberto para este pedido.
                      </p>
                      <button className="text-[#020854] font-bold text-xs hover:underline">
                        Abrir novo ticket
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Coluna Direita */}
              <div className="space-y-6">
                {/* Contexto do Cliente */}
                <div className="border border-[#ADE9FF] rounded-3xl p-6 bg-card">
                  <div className="flex justify-between items-start mb-4 ">
                    <div>
                      <span className="text-[10px] font-bold text-blue-500 uppercase">
                        Contexto do cliente
                      </span>
                      <h4 className="text-lg font-black text-[#020854] dark:text-foreground">
                        Quem comprou
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-sky-200 rounded-4xl mb-17 flex items-center justify-center text-sky-700 font-black text-xl">
                      {pedido.cliente?.substring(0, 2).toUpperCase() || "AA"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-[#020854] dark:text-foreground text-xl">
                          {pedido.cliente}
                        </span>
                        {pedido.recorrente && (
                          <span className="bg-[#020854] text-white text-[9px] px-2 py-0.5 rounded-md font-bold">
                            Alta
                          </span>
                        )}
                      </div>
                      <div className="flex gap-6 mt-2">
                        {/* Lista vertical de informações */}
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-muted-foreground text-xs font-bold">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />{" "}
                            Média de Estrelas dada:{" "}
                            {pedido.mediaEstrelas?.toFixed(1) || "0.0"}
                          </span>

                          <span className="flex items-center gap-1.5 text-muted-foreground text-xs font-bold">
                            <TicketIcon className="w-4 h-4 text-blue-500" />{" "}
                            Tickets de suporte: {pedido.ticket || "0"}
                          </span>
                          <span className="flex items-center gap-1.5 text-muted-foreground text-xs font-bold">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span>
                              {pedido.cidade}, {pedido.estado}
                            </span>
                          </span>
                          <span className="text-muted-foreground text-xs font-bold">
                            {pedido.totalPedidosCliente || "1"} pedidos no total
                          </span>
                        </div>

                        {/* Segunda coluna */}
                        <div className="flex-1 ml-20">
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Itens do Pedido */}
                <div className="border border-border rounded-3xl p-6 flex-1">
                  <span className="text-[10px] font-bold text-blue-500 uppercase">
                    Itens do pedido
                  </span>
                  <h4 className="text-lg font-black text-[#020854] dark:text-foreground mb-6">
                    Produtos & Performance
                  </h4>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4 group">
                      <div className="w-12 h-12 bg-background border border-border rounded-xl flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-bold text-[#020854] dark:text-foreground text-sm">
                            {pedido.nomeProduto || "Produto Principal"}
                          </span>
                          <span className="font-black text-[#020854] dark:text-foreground text-sm">
                            {pedido.valor}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">
                            SKU {pedido.skuProduto || "SKU-001"} - Qtd{" "}
                            {pedido.produtos}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium italic text-right">
                            {pedido.valorUnitario} un
                          </span>
                        </div>
                        <div className="flex gap-2 mt-1">
                          {/* Tags visuais - Se quiser torná-las dinâmicas depois, basta puxar da API também */}
                          <span className="text-[8px] font-black px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-500 border-emerald-100">
                            Mais vendido
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-dashed border-border flex justify-between items-end">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Total do pedido
                    </span>
                    <span className="text-3xl font-black text-[#020854] dark:text-foreground">
                      {pedido.valor}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}