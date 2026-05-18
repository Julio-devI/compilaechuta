import { useState, useEffect } from "react";
import { AlertCircle, Layers, ChevronRight } from "lucide-react";
import {
  Produto,
  getProdutoStatus,
  produtoStatusConfig,
  ProdutoDaAPI,
} from "../services/productService";
import { ModalDetalhesProduto } from "./ModalDetalhesProduto";
import { Categoria } from "../services/categoryService";

// Mesma URL base do productService
const PRODUCTS_API_URL = "http://localhost:8000/api/v1/products/";

function mapear(p: ProdutoDaAPI): Produto {
  return {
    id: p.id_produto,
    nome: p.nome_produto,
    sku: p.sku || "Sem SKU",
    categoria: p.categoria || "Outros",
    preco: new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(p.preco || 0),
    estoque: p.estoque_disponivel,
    vendidos: p.total_unidades_vendidas || 0,
    avaliacao: p.media_nota_produto || 0,
    status: getProdutoStatus(p.ativo, p.estoque_disponivel),
    imagem: "📦",
    tendencia: "stable",
    ticketMedio: new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(p.ticket_medio || 0),
    total_tickets: p.total_tickets || 0,
    descricao: p.descricao || "",
  };
}

interface Props {
  categoria: Categoria;
  onClose: () => void;
}

export function ModalRevisoesCategoria({ categoria, onClose }: Props) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<Produto | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setErro(null);

    const params = new URLSearchParams({
      categoria: categoria.nome_categoria,
      precisa_revisao: "Sim",
      skip: "0",
      limit: "100",
    });

    fetch(`${PRODUCTS_API_URL}?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((json) => {
        const raw: ProdutoDaAPI[] = Array.isArray(json)
          ? json
          : (json.data ?? []);
        setProdutos(raw.map(mapear));
      })
      .catch(() => setErro("Não foi possível carregar os produtos."))
      .finally(() => setIsLoading(false));
  }, [categoria.nome_categoria]);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="bg-card rounded-3xl shadow-xl border border-border w-full max-w-md flex flex-col max-h-[75vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-3 shrink-0">
            <div>
              <h2 className="text-lg font-black text-[#020854] dark:text-foreground">
                Produtos para Revisão
              </h2>
              <p className="text-sm text-muted-foreground font-medium mt-0.5">
                {categoria.nome_categoria} ·{" "}
                <span className="text-[#B91C1C] font-black">
                  {categoria.total_precisa_revisao} itens
                </span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Lista */}
          <div className="overflow-y-auto px-6 pb-6 flex flex-col gap-2 mt-2">
            {isLoading ? (
              Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-2xl bg-slate-100 animate-pulse"
                />
              ))
            ) : erro ? (
              <div className="flex flex-col items-center py-10 text-red-500 gap-2">
                <AlertCircle className="w-8 h-8 opacity-50" />
                <p className="font-bold text-sm">{erro}</p>
              </div>
            ) : produtos.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-muted-foreground gap-2">
                <Layers className="w-8 h-8 opacity-30" />
                <p className="font-bold text-sm">Nenhum produto encontrado.</p>
              </div>
            ) : (
              produtos.map((prod) => {
                const { color, label } = produtoStatusConfig[prod.status];
                return (
                  <button
                    key={prod.id}
                    onClick={() => setSelecionado(prod)}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl bg-background border border-border hover:border-[#020854] transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-lg shrink-0">
                      {prod.imagem}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[#020854] dark:text-foreground text-sm truncate">
                        {prod.nome}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {prod.sku} · {prod.preco}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${color}`}
                      >
                        {label}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-bold">
                        {prod.estoque} un
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-[#020854] transition-colors" />
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal de detalhes ao clicar no produto */}
      <ModalDetalhesProduto
        isOpen={!!selecionado}
        onClose={() => setSelecionado(null)}
        produto={selecionado}
      />
    </>
  );
}
