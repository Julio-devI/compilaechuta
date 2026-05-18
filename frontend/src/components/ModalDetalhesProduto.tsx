import {
  X,
  Trash2,
  MessageSquare,
  Star,
  Flame,
  ShoppingCart,
  Percent,
  Shield,
  MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MouseEvent, useState, useEffect } from "react";
import { deleteProduto, getProductComments } from "../services/productService";
import { Categoria, getCategorias } from "../services/categoryService";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  produto: any;
}

export function ModalDetalhesProduto({ isOpen, onClose, produto }: ModalProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [comentarios, setComentarios] = useState<string[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [categoryImage, setCategoryImage] = useState("");

  useEffect(() => {
    if (isOpen && produto?.id) {
      setIsLoadingComments(true);
      getProductComments(produto.id)
        .then((data) => {
          setComentarios(data);
        })
        .finally(() => {
          setIsLoadingComments(false);
        });

      getCategorias().then((categorias: Categoria[]) => {
        const categoriaEncontrada = categorias.find(
          (c: Categoria) =>
            c.nome_categoria === produto.categoria ||
            c.id_categoria === produto.id_categoria,
        );

        if (categoriaEncontrada && categoriaEncontrada.imagem_url) {
          setCategoryImage(categoriaEncontrada.imagem_url);
        } else {
          setCategoryImage("");
        }
      });
    } else {
      setComentarios([]);
      setCategoryImage("");
    }
  }, [isOpen, produto]);

  if (!isOpen || !produto) return null;

  const handleClose = () => {
    setIsConfirmingDelete(false);
    onClose();
  };

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const confirmarExclusaoReal = async () => {
    setIsDeleting(true);
    try {
      await deleteProduto(produto.id);
      handleClose();
      window.location.reload();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Ocorreu um erro ao excluir o produto.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
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
          className="bg-[#F8F9FC] w-full max-w-[1200px] rounded-[32px] shadow-2xl relative max-h-[90vh] flex flex-col border border-slate-100 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* POPUP DE CONFIRMAÇÃO DE EXCLUSÃO */}
          {isConfirmingDelete && (
            <div className="absolute inset-0 z-[60] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-6 rounded-3xl shadow-2xl max-w-[340px] text-center border"
              >
                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#020854] mb-2">
                  Excluir item?
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  Tem certeza que deseja remover este produto permanentemente?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsConfirmingDelete(false)}
                    disabled={isDeleting}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-slate-100 text-slate-600"
                  >
                    Não
                  </button>
                  <button
                    onClick={confirmarExclusaoReal}
                    disabled={isDeleting}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-red-600 text-white"
                  >
                    {isDeleting ? "..." : "Sim"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* HEADER (Fixo no topo do modal) */}
          <div className="flex justify-between items-center p-6 md:p-8 pb-4 shrink-0 border-b border-slate-100 bg-[#F8F9FC]">
            <h2 className="text-2xl md:text-[32px] font-black text-[#0A113F] tracking-tight">
              Detalhes do Produto
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-slate-200/60 rounded-full transition-colors text-slate-800"
            >
              <X className="w-7 h-7 md:w-8 md:h-8 stroke-[2.5]" />
            </button>
          </div>

          {/* CORPO DO MODAL (Com Scroll interno inteligente) */}
          <div className="flex-1 overflow-y-auto scrollbar-hide p-6 md:p-8 pt-4">
            {/* GRID PRINCIPAL */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* CARD ESQUERDO: Preview do Produto */}
              <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-[32px] p-6 shadow-sm flex flex-col justify-between min-h-[450px]">
                <div>
                  {/* Box da Imagem - Exibindo a Imagem da Categoria no lugar da imagem do produto */}
                  <div className="w-full aspect-[16/9] bg-[#E1E6EB] rounded-2xl relative border border-slate-300/60 flex items-center justify-center overflow-hidden mb-5 shrink-0">
                    {!categoryImage && (
                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-slate-700 rotate-45 scale-y-[1.5]"></div>
                        <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-slate-700 -rotate-45 scale-y-[1.5]"></div>
                      </div>
                    )}
                    {categoryImage && (
                      <img
                        src={categoryImage}
                        alt={`Categoria ${produto.categoria}`}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Badges de Categorias/Tags */}
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span className="bg-[#D3EFFF] text-[#0091FF] px-3 py-1 rounded-full text-xs font-bold">
                      {produto.categoria || "Eletrônicos"}
                    </span>
                    <span className="bg-[#EBEBF5] text-[#1C1C1E] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-slate-700" /> Mais
                      vendido
                    </span>
                    <span className="text-slate-400 text-xs font-medium ml-auto">
                      {produto.sku || "NB-DELL-001"}
                    </span>
                  </div>

                  {/* Título e Preço */}
                  <h3 className="text-2xl font-black text-[#0A113F] mb-1">
                    {produto.nome || "Notebook Dell Inspiron 15"}
                  </h3>
                  <div className="text-[32px] font-black text-[#0061FF] mb-0.5 leading-tight">
                    {produto.preco || "R$ 3.200,00"}
                  </div>

                  {/* Receita Total movida para cá (Menor destaque) */}
                  <div className="text-xs font-bold text-slate-400 flex items-center gap-1 mb-4">
                    <span>Receita acumulada:</span>
                    <span className="text-slate-600 font-extrabold">
                      {produto.receitaTotal || "R$ 0,00"}
                    </span>
                  </div>
                </div>

                <div className="mt-2">
                  {/* Sub-informações internas (Tickets e Estrelas) */}
                  <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-slate-700">
                      <div className="bg-[#0061FF] text-white p-1.5 rounded-lg">
                        <MessageSquare className="w-4 h-4 fill-white" />
                      </div>
                      <div className="leading-tight">
                        <p className="text-xs font-black">
                          {produto.total_tickets || "0"} Tickets
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium">
                          Totais
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-white px-1 py-0.5 rounded-md">
                      <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                      <span className="text-lg font-black text-slate-800">
                        {produto.avaliacao || "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Footer do Card Esquerdo */}
                  <div className="flex justify-between text-slate-400 text-xs font-bold mt-4 pt-2">
                    <span>Estoque: {produto.estoque || 45}</span>
                    <span>Vendidos: {produto.vendidos || 120}</span>
                  </div>
                </div>
              </div>

              {/* CARD DIREITO: Detalhes e Especificações */}
              <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-[32px] p-6 md:p-8 shadow-sm flex flex-col min-h-[450px]">
                {/* Comentários Produto */}
                <div className="flex flex-col flex-1 min-h-[200px]">
                  <h4 className="text-[11px] font-black text-[#0061FF] tracking-wider uppercase mb-3 flex items-center gap-2 shrink-0">
                    <MessageCircle className="w-4 h-4" /> Comentários sobre o
                    Produto
                  </h4>

                  {/* Área Interna de Comentários */}
                  <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 overflow-y-auto max-h-[350px] scrollbar-hide flex flex-col gap-3 mb-6">
                    {isLoadingComments ? (
                      <div className="text-sm font-medium text-slate-400 flex-1 flex items-center justify-center">
                        Carregando comentários...
                      </div>
                    ) : comentarios.length > 0 ? (
                      <div className="flex flex-col gap-3 h-full">
                        {comentarios.map((comentario, index) => (
                          <div
                            key={index}
                            className="bg-white p-4 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 shadow-sm w-full shrink-0"
                          >
                            "{comentario}"
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm font-medium text-slate-400 italic flex-1 flex items-center justify-center text-center px-4 py-8">
                        Nenhum comentário registrado para este produto.
                      </div>
                    )}
                  </div>

                  {/* Métricas Dinâmicas Reajustadas (Grid com 3 colunas) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-auto shrink-0 w-full">
                    {/* Total Vendido */}
                    <div className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between shadow-sm min-h-[100px] w-full">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-xl bg-[#E6F4FE] text-[#0091FF] shrink-0">
                          <ShoppingCart className="w-4 h-4" />
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 leading-tight">
                          Total
                          <br />
                          Vendido
                        </div>
                      </div>
                      <div className="text-base font-black text-[#0A113F] break-words">
                        {produto.vendidos || "0"}
                      </div>
                    </div>

                    {/* Estoque Total */}
                    <div className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between shadow-sm min-h-[100px] w-full">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-xl bg-[#E6F4FE] text-[#0091FF] shrink-0">
                          <Percent className="w-4 h-4" />
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 leading-tight">
                          Estoque
                          <br />
                          total
                        </div>
                      </div>
                      <div className="text-base font-black text-[#0A113F] break-words">
                        {produto.estoque || "0"}
                      </div>
                    </div>

                    {/* Avaliação Média */}
                    <div className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between shadow-sm min-h-[100px] w-full">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-xl bg-[#E6F4FE] text-[#0091FF] shrink-0">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 leading-tight">
                          Avaliação
                          <br />
                          média
                        </div>
                      </div>
                      <div className="text-base font-black text-[#0A113F] break-words">
                        {produto.avaliacao || "0.0"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTÃO DISCRETO DE EXCLUSÃO */}
            <div className="mt-6 flex justify-end shrink-0">
              <button
                onClick={() => setIsConfirmingDelete(true)}
                className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remover Registro
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
