import {
  X,
  Clock,
  Package,
  Ticket,
  Headphones,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Box,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MouseEvent } from "react";
import type { SupportTicket } from "../services/supportService";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: SupportTicket | null;
}

export function ModalDetalhesTicket({ isOpen, onClose, ticket }: ModalProps) {
  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "aberto":
        return "bg-[#FEF9C3] text-[#A16207] border-[#FEF08A]";
      case "resolvido":
        return "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

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
            className="bg-card w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
                  <Ticket className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-[#020854] dark:text-foreground">
                    Detalhes do Ticket
                  </h2>
                  <p className="text-muted-foreground font-medium">
                    {ticket.ticketDisplayId}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-background rounded-full transition-colors"
              >
                <X className="w-8 h-8 text-muted-foreground" />
              </button>
            </div>

            <div className="p-8 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Coluna Esquerda: Status e Cliente */}
                <div className="md:col-span-1 space-y-6">
                  {/* Status Principal */}
                  <div
                    className={`rounded-3xl p-6 border ${getStatusColor(ticket.status)}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {ticket.status === "resolvido" ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <AlertCircle className="w-5 h-5" />
                      )}
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Status Atual
                      </span>
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-wider">
                      {ticket.status}
                    </h3>
                    {ticket.status === "aberto" && (
                      <p className="text-xs font-bold mt-2 opacity-80">
                        Aguardando resolução
                      </p>
                    )}
                  </div>

                  {/* Info Cliente */}
                  <div className="bg-background border border-border rounded-3xl p-6">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 block">
                      Cliente
                    </span>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 bg-sky-200 rounded-full flex items-center justify-center text-sky-700 font-black text-xl">
                        {getInitials(ticket.customerName)}
                      </div>
                      <div>
                        <h4 className="font-black text-[#020854] dark:text-foreground text-lg leading-tight">
                          {ticket.customerName}
                        </h4>
                        <p className="text-muted-foreground text-xs font-bold">
                          {ticket.customerId}
                        </p>
                      </div>
                    </div>
                    <button className="w-full bg-card text-foreground border border-border py-3 rounded-xl font-bold hover:bg-background transition-colors text-sm">
                      Ver perfil completo
                    </button>
                  </div>

                  {/* Agente de Suporte */}
                  <div className="bg-card border border-border rounded-3xl p-6">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 block">
                      Agente Responsável
                    </span>
                    {ticket.supportAgent ? (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-black">
                          <Headphones className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-foreground">
                          {ticket.supportAgent}
                        </span>
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
                  <div className="bg-card border border-[#ADE9FF] rounded-3xl p-6">
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2 block">
                      Tipo de Problema
                    </span>
                    <h3 className="text-2xl font-black text-[#020854] dark:text-foreground mb-6">
                      {ticket.problemType}
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-background p-4 rounded-2xl border border-border flex items-center gap-3">
                        <div className="w-10 h-10 bg-card rounded-xl flex items-center justify-center border border-border shadow-sm">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">
                            Pedido Vinculado
                          </p>
                          <p className="font-black text-foreground">
                            {ticket.orderId || "Nenhum"}
                          </p>
                        </div>
                      </div>
                      <div className="bg-background p-4 rounded-2xl border border-border flex items-center gap-3">
                        <div className="w-10 h-10 bg-card rounded-xl flex items-center justify-center border border-border shadow-sm">
                          <Box className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">
                            Produto Vinculado
                          </p>
                          <p className="font-black text-foreground">
                            {ticket.productId || "Nenhum"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline & Avaliação */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Timeline */}
                    <div className="bg-card border border-border rounded-3xl p-6">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6 block">
                        Timeline do Chamado
                      </span>

                      <div className="relative border-l-2 border-border ml-3 space-y-6">
                        <div className="relative pl-6">
                          <div className="absolute w-4 h-4 bg-border rounded-full -left-[9px] top-1 border-4 border-card"></div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">
                            Abertura
                          </p>
                          <p className="font-bold text-foreground text-sm">
                            {new Date(ticket.openedAt).toLocaleString("pt-BR")}
                          </p>
                        </div>

                        <div className="relative pl-6">
                          <div
                            className={`absolute w-4 h-4 rounded-full -left-[9px] top-1 border-4 border-card ${ticket.resolvedAt ? "bg-emerald-500" : "bg-border"}`}
                          ></div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">
                            Resolução
                          </p>
                          <p
                            className={`font-bold text-sm ${ticket.resolvedAt ? "text-foreground" : "text-muted-foreground italic"}`}
                          >
                            {ticket.resolvedAt
                              ? new Date(ticket.resolvedAt).toLocaleString(
                                  "pt-BR",
                                )
                              : "Aguardando..."}
                          </p>
                        </div>
                      </div>

                      {ticket.resolutionTimeHours !== null && (
                        <div className="mt-6 pt-4 border-t border-border flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-bold text-foreground">
                            Resolvido em{" "}
                            <span className="text-[#020854] dark:text-foreground font-black">
                              {ticket.resolutionTimeHours} horas
                            </span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Avaliação */}
                    <div className="bg-card border border-border rounded-3xl p-6 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 block">
                          Avaliação do Cliente
                        </span>

                        {ticket.rating ? (
                          <div className="flex flex-col items-center justify-center py-4">
                            <span className="text-5xl font-black text-[#020854] dark:text-foreground mb-2">
                              {ticket.rating.toFixed(1)}
                            </span>
                            <div className="flex text-[#FFD700] text-2xl">
                              {"★".repeat(Math.floor(ticket.rating))}
                              {"☆".repeat(5 - Math.floor(ticket.rating))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-6 opacity-50">
                            <MessageSquare className="w-10 h-10 text-muted-foreground mb-2" />
                            <p className="text-sm font-bold text-muted-foreground text-center">
                              Nenhuma avaliação
                              <br />
                              disponível ainda
                            </p>
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
  );
}
