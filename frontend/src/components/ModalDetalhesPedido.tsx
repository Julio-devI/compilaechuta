import {
  X,
  Clock,
  Truck,
  Package,
  MapPin,
  Headphones,
  Star,
  Ticket as TicketIcon,
  Loader2,
  CreditCard,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MouseEvent, useEffect, useState } from "react";
// Importamos SupportTicket (o retorno real da função) em vez de Ticket
import { getTicketPorPedido, SupportTicket } from "../services/supportService";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  pedido: any; // Idealmente usar a interface Pedido definida anteriormente
}

export function ModalDetalhesPedido({ isOpen, onClose, pedido }: ModalProps) {
  // Alterado o estado para usar a interface correta do serviço
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTicket, setLoadingTicket] = useState(false);

  // 1. Novo estado para controlar a exibição de registros inconsistentes
  const [verInconsistentes, setVerInconsistentes] = useState(false);

  useEffect(() => {
    async function fetchTickets() {
      const idParaBusca = pedido?.idReal;

      if (idParaBusca) {
        setLoadingTicket(true);
        try {
          // 2. Passa 'false' se a caixinha de inconsistentes estiver marcada,
          // disparando a rota sem o filtro restritivo de consistência do backend
          const registroConsistente = verInconsistentes ? false : true;
          const data = await getTicketPorPedido(
            idParaBusca,
            registroConsistente,
          );

          setTickets(Array.isArray(data) ? data : data ? [data] : []);
        } catch (error) {
          console.error("Erro ao carregar os tickets:", error);
          setTickets([]);
        } finally {
          setLoadingTicket(false);
        }
      } else {
        console.warn(
          "Nenhum ID encontrado no pedido. Não é possível buscar os tickets.",
          pedido,
        );
        setTickets([]);
      }
    }

    if (isOpen && pedido) {
      fetchTickets();
    } else {
      setTickets([]);
      setVerInconsistentes(false); // Reseta a caixinha ao fechar o modal
    }
    // 3. Adicionado 'verInconsistentes' como dependência para refazer a requisição ao clicar
  }, [pedido, isOpen, verInconsistentes]);

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

  const temTicketAberto = tickets.some((t) => t.status === "aberto");
  const todosResolvidos =
    tickets.length > 0 && tickets.every((t) => t.status === "resolvido");

  if (!pedido) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
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
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center z-10 border-2 transition-all duration-300
                                ${stepStyle} ${isActive ? "scale-110 shadow-sm" : ""}`}
                              >
                                <span className="font-black text-xs">
                                  {i + 1}
                                </span>
                              </div>

                              <span
                                className={`text-[10px] font-bold mt-2 transition-colors duration-300
                                ${isActive ? "text-foreground" : "text-slate-400"}`}
                              >
                                {statusName}
                              </span>

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
                    todosResolvidos
                      ? "bg-emerald-50 border-emerald-100"
                      : temTicketAberto
                        ? "bg-amber-50 border-amber-100"
                        : "bg-background border-border"
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 font-black text-xs uppercase tracking-wider mb-4 ${
                      todosResolvidos
                        ? "text-emerald-700"
                        : temTicketAberto
                          ? "text-blue-900"
                          : "text-muted-foreground"
                    }`}
                  >
                    <Headphones className="w-4 h-4" /> Suporte e Resolução
                  </div>

                  {/* Alteração na seção do Título: Alinhamento flex para acomodar o Checkbox */}
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <h4
                      className={`text-lg font-black ${
                        todosResolvidos
                          ? "text-emerald-900"
                          : temTicketAberto
                            ? "text-[#020854]"
                            : "text-foreground"
                      }`}
                    >
                      Tickets vinculados
                    </h4>

                    {/* Elemento de caixinha de seleção (Checkbox) */}
                    <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                      <input
                        type="checkbox"
                        checked={verInconsistentes}
                        onChange={(e) => setVerInconsistentes(e.target.checked)}
                        className="w-4 h-4 rounded border-border text-[#020854] focus:ring-[#020854] accent-[#020854]"
                      />
                      Ver registros inconsistentes
                    </label>
                  </div>

                  {loadingTicket ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : tickets.length > 0 ? (
                    <div className="space-y-3 max-h-[320px] overflow-y-auto scrollbar-hide">
                      {tickets.map((itemTicket) => (
                        <div
                          key={itemTicket.ticketId}
                          className="bg-background border border-border p-4 rounded-xl flex justify-between items-center"
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-[#020854] dark:text-foreground">
                              {itemTicket.ticketDisplayId}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Tipo: {itemTicket.problemType}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                              itemTicket.status === "resolvido"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {itemTicket.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-background rounded-2xl p-6 text-center border border-dashed border-border">
                      <p className="text-sm text-muted-foreground font-medium mb-2">
                        Nenhum ticket de suporte aberto para este pedido.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Coluna Direita */}
              <div className="space-y-6">
                {/* Contexto do Cliente */}
                <div className="border border-[#ADE9FF] rounded-3xl p-6 bg-card">
                  <div className="flex justify-between items-start mb-4">
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
                    <div className="w-14 h-14 bg-sky-200 rounded-4xl flex items-center justify-center text-sky-700 font-black text-xl">
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
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-muted-foreground text-xs font-bold">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            Média de Estrelas dada:{" "}
                            {pedido.mediaEstrelas?.toFixed(1) || "0.0"}
                          </span>

                          <span className="flex items-center gap-1.5 text-muted-foreground text-xs font-bold">
                            <TicketIcon className="w-4 h-4 text-blue-500" />
                            Tickets deste pedido: {tickets.length}
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
