import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  AlertCircle,
  DollarSign,
  ArrowUpDown,
} from "lucide-react";

interface CategoriaFiltrosProps {
  isFiltrosOpen: boolean;
  onToggleFiltros: () => void;
  filtroRevisao: "todas" | "com_revisao" | "regularizadas";
  onFiltroRevisaoChange: (value: "todas" | "com_revisao" | "regularizadas") => void;
  precoMin: string;
  onPrecoMinChange: (value: string) => void;
  precoMax: string;
  onPrecoMaxChange: (value: string) => void;
  onLimparPreco: () => void;
  ordenacao: "nome" | "mais_revisoes" | "maior_estoque" | "maior_preco";
  onOrdenacaoChange: (value: "nome" | "mais_revisoes" | "maior_estoque" | "maior_preco") => void;
}

export function CategoriaFiltros({
  isFiltrosOpen,
  onToggleFiltros,
  filtroRevisao,
  onFiltroRevisaoChange,
  precoMin,
  onPrecoMinChange,
  precoMax,
  onPrecoMaxChange,
  onLimparPreco,
  ordenacao,
  onOrdenacaoChange,
}: CategoriaFiltrosProps) {
  return (
    <div className="bg-card rounded-3xl shadow-sm border-0 mb-8 overflow-hidden transition-all duration-300">
      <div className="p-6 flex justify-between items-center">
        <button
          onClick={onToggleFiltros}
          className="flex items-center gap-2 font-bold text-foreground border-none outline-none cursor-pointer hover:opacity-70 transition-opacity"
        >
          {isFiltrosOpen ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
          {isFiltrosOpen ? "Esconder Filtros" : "Mostrar Filtros"}
        </button>
        {isFiltrosOpen ? (
          <Minimize2 className="w-5 h-5 text-slate-400" />
        ) : (
          <Maximize2 className="w-5 h-5 text-slate-400" />
        )}
      </div>

      {isFiltrosOpen && (
        <div className="px-8 pb-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Revisão */}
          <div>
            <label className="flex items-center gap-2 font-black text-[#020854] dark:text-foreground mb-3 text-sm">
              <AlertCircle className="w-4 h-4" /> Revisão de Produtos
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  {
                    value: "todas",
                    label: "Todas",
                    active: "bg-[#020854] text-white shadow-md",
                    dot: null,
                  },
                  {
                    value: "com_revisao",
                    label: "Com pendências",
                    active: "bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]",
                    dot: "#B91C1C",
                  },
                  {
                    value: "regularizadas",
                    label: "Regularizadas",
                    active: "bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]",
                    dot: "#15803D",
                  },
                ] as {
                  value: "todas" | "com_revisao" | "regularizadas";
                  label: string;
                  active: string;
                  dot: string | null;
                }[]
              ).map(({ value, label, active, dot }) => (
                <button
                  key={value}
                  onClick={() => onFiltroRevisaoChange(value)}
                  className={`px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 transition-all ${
                    filtroRevisao === value
                      ? active
                      : "bg-background text-muted-foreground hover:bg-slate-200 dark:hover:bg-border"
                  }`}
                >
                  {dot && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: dot }}
                    />
                  )}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Faixa de Preço Médio */}
          <div>
            <label className="flex items-center gap-2 font-black text-[#020854] dark:text-foreground mb-3 text-sm">
              <DollarSign className="w-4 h-4" /> Faixa de Preço Médio
            </label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">
                  R$
                </span>
                <input
                  type="number"
                  placeholder="Mín"
                  value={precoMin}
                  onChange={(e) => onPrecoMinChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background rounded-2xl border border-border text-foreground font-medium outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <span className="text-muted-foreground font-bold text-sm">—</span>
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">
                  R$
                </span>
                <input
                  type="number"
                  placeholder="Máx"
                  value={precoMax}
                  onChange={(e) => onPrecoMaxChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background rounded-2xl border border-border text-foreground font-medium outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              {(precoMin || precoMax) && (
                <button
                  onClick={onLimparPreco}
                  className="text-muted-foreground hover:text-foreground text-xs font-black px-3 py-2 rounded-xl bg-background border border-border transition-colors"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Ordenação */}
          <div>
            <label className="flex items-center gap-2 font-black text-[#020854] dark:text-foreground mb-3 text-sm">
              <ArrowUpDown className="w-4 h-4" /> Ordenar por
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: "nome", label: "Nome A–Z" },
                  { value: "mais_revisoes", label: "Mais revisões" },
                  { value: "maior_estoque", label: "Maior estoque" },
                  { value: "maior_preco", label: "Maior preço médio" },
                ] as const
              ).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => onOrdenacaoChange(value)}
                  className={`px-4 py-2 rounded-full text-xs font-black transition-all ${
                    ordenacao === value
                      ? "bg-[#020854] text-white shadow-md"
                      : "bg-background text-muted-foreground hover:bg-slate-200 dark:hover:bg-border"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}