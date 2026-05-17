import { useState, useEffect } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Layers,
  AlertCircle,
  RefreshCw,
  Maximize2,
  Minimize2,
  Pencil,
  Plus,
  DollarSign,
  ArrowUpDown,
} from "lucide-react";
import {
  getCategorias,
  createCategoria,
  updateCategoria,
  normalizeCategoriaSearch,
  Categoria,
  formatBRL,
} from "../services/categoryService";
import { ModalRevisoesCategoria } from "../components/ModalRevisoesCategoria";

// ─── Modal Criar / Editar ─────────────────────────────────────────────────────

interface ModalCategoriaProps {
  modo: "criar" | "editar";
  categoria: Categoria | null;
  onClose: () => void;
  onSalvo: (cat: Categoria) => void;
}

function ModalCategoria({
  modo,
  categoria,
  onClose,
  onSalvo,
}: ModalCategoriaProps) {
  const [nome, setNome] = useState(categoria?.nome_categoria ?? "");
  const [imagemUrl, setImagemUrl] = useState(categoria?.imagem_url ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSalvar() {
    if (!nome.trim()) {
      setErro("O nome da categoria é obrigatório.");
      return;
    }
    setIsSaving(true);
    setErro(null);
    try {
      let resultado: Categoria | null;
      if (modo === "criar") {
        resultado = await createCategoria({
          nome_categoria: nome.trim(),
          imagem_url: imagemUrl.trim() || null,
        });
      } else {
        resultado = await updateCategoria(categoria!.id_categoria, {
          nome_categoria: nome.trim(),
          imagem_url: imagemUrl.trim() || null,
        });
      }
      if (resultado) {
        onSalvo(resultado);
      } else {
        setErro("Ocorreu um erro ao salvar. Tente novamente.");
      }
    } catch {
      setErro("Ocorreu um erro ao salvar. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-3xl shadow-xl border border-border w-full max-w-md p-8 flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-[#020854] dark:text-foreground">
            {modo === "criar" ? "Nova Categoria" : "Editar Categoria"}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-background flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors border border-border"
          >
            ✕
          </button>
        </div>

        {/* Campos */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
              Nome da Categoria *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Eletrônicos"
              className="w-full p-4 bg-background rounded-2xl border border-border text-foreground font-medium outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
              URL da Imagem
            </label>
            <input
              type="text"
              value={imagemUrl}
              onChange={(e) => setImagemUrl(e.target.value)}
              placeholder="https://..."
              className="w-full p-4 bg-background rounded-2xl border border-border text-foreground font-medium outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Erro */}
        {erro && (
          <p className="text-sm font-bold text-[#B91C1C] bg-[#FEE2E2] px-4 py-3 rounded-2xl">
            {erro}
          </p>
        )}

        {/* Ações */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-full text-sm font-black bg-background border border-border text-muted-foreground hover:bg-slate-100 dark:hover:bg-border transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={isSaving}
            className="px-5 py-3 rounded-full text-sm font-black bg-[#020854] text-white hover:bg-[#0a1a7a] transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : modo === "criar" ? (
              <>
                <Plus className="w-4 h-4" />
                Criar
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4" />
                Salvar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Categorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltrosOpen, setIsFiltrosOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(
    null,
  );
  const [modalAberto, setModalAberto] = useState<"criar" | "editar" | null>(
    null,
  );
  const [categoriaRevisando, setCategoriaRevisando] =
    useState<Categoria | null>(null);

  const [filtroRevisao, setFiltroRevisao] = useState<
    "todas" | "com_revisao" | "regularizadas"
  >("todas");
  const [precoMin, setPrecoMin] = useState("");
  const [precoMax, setPrecoMax] = useState("");
  const [ordenacao, setOrdenacao] = useState<
    "nome" | "mais_revisoes" | "maior_estoque" | "maior_preco"
  >("nome");

  useEffect(() => {
    async function carregarDados() {
      setIsLoading(true);
      try {
        const dadosReais = await getCategorias();
        setCategorias(dadosReais);
      } catch (error) {
        console.error("Falha ao carregar categorias", error);
      } finally {
        setIsLoading(false);
      }
    }
    carregarDados();
  }, []);

  const categoriasFiltradas = categorias
    .filter((cat) => {
      const termNormalizado = normalizeCategoriaSearch(searchTerm);
      const idNormalizado = normalizeCategoriaSearch(cat.id_categoria);

      const matchesSearch =
        !termNormalizado ||
        idNormalizado.includes(termNormalizado) ||
        cat.nome_categoria
          .toLowerCase()
          .includes(searchTerm.toLowerCase().trim());

      const matchesRevisao =
        filtroRevisao === "todas" ||
        (filtroRevisao === "com_revisao" && cat.total_precisa_revisao > 0) ||
        (filtroRevisao === "regularizadas" && cat.total_precisa_revisao === 0);

      const min = precoMin ? parseFloat(precoMin) : null;
      const max = precoMax ? parseFloat(precoMax) : null;
      const matchesPreco =
        (min === null || (cat.preco_medio ?? 0) >= min) &&
        (max === null || (cat.preco_medio ?? 0) <= max);

      return matchesSearch && matchesRevisao && matchesPreco;
    })
    .sort((a, b) => {
      switch (ordenacao) {
        case "mais_revisoes":
          return b.total_precisa_revisao - a.total_precisa_revisao;
        case "maior_estoque":
          return b.total_com_estoque - a.total_com_estoque;
        case "maior_preco":
          return (b.preco_medio ?? 0) - (a.preco_medio ?? 0);
        case "nome":
        default:
          return a.nome_categoria.localeCompare(b.nome_categoria, "pt-BR");
      }
    });

  const renderRows = () => {
    if (isLoading) {
      return Array.from({ length: 5 }, (_, index) => (
        <tr
          key={`skeleton-${index}`}
          className="bg-card animate-pulse border-b border-border"
        >
          {Array.from({ length: 7 }, (__, col) => (
            <td key={col} className="py-4 px-6 border-0">
              <div className="h-4 rounded-full bg-slate-200 w-full max-w-[120px]" />
            </td>
          ))}
        </tr>
      ));
    }

    if (categoriasFiltradas.length === 0) {
      return (
        <tr>
          <td colSpan={7} className="py-12 border-0">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Layers className="w-12 h-12 mb-4 opacity-30" />
              <p className="font-bold text-lg">Nenhuma categoria encontrada.</p>
              <p className="text-sm">Tente ajustar seus filtros de busca.</p>
            </div>
          </td>
        </tr>
      );
    }

    return categoriasFiltradas.map((cat) => (
      <tr
        key={cat.id_categoria}
        className="bg-card group hover:bg-background transition-colors border-b border-border"
      >
        {/* Coluna: Categoria (ID) */}
        <td className="py-4 px-6 rounded-l-2xl border-0">
          <span className="font-black text-[#020854] dark:text-foreground text-lg">
            {cat.id_categoria.replace(/^#/, "")}
          </span>
        </td>

        {/* Coluna: Nome da Categoria */}
        <td className="py-4 px-6 border-0">
          <span className="font-bold text-foreground text-base">
            {cat.nome_categoria}
          </span>
        </td>

        {/* Coluna: Total Produtos */}
        <td className="py-4 px-6 border-0 text-center">
          <div className="flex flex-col gap-1 items-center">
            <span className="font-bold text-foreground">
              {cat.total_produtos} un
            </span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              {cat.total_produtos_ativos} ativos
            </span>
          </div>
        </td>

        {/* Coluna: Estoque Consolidado */}
        <td className="py-4 px-6 border-0 text-center">
          {cat.total_com_estoque === 0 ? (
            <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap border border-[#FECACA] bg-[#FEE2E2] text-[#B91C1C]">
              Esgotado
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap border border-sky-200 bg-sky-100 text-sky-700">
              {cat.total_com_estoque} un
            </span>
          )}
        </td>

        {/* Coluna: Preço Médio + faixa */}
        <td className="py-4 px-6 border-0">
          <div className="flex flex-col gap-1">
            <span className="font-black text-[#020854] dark:text-foreground text-lg">
              {formatBRL(cat.preco_medio)}
            </span>
            {(cat.preco_minimo != null || cat.preco_maximo != null) && (
              <span className="text-[10px] font-bold text-muted-foreground bg-background px-2 py-0.5 rounded w-fit">
                {formatBRL(cat.preco_minimo)} – {formatBRL(cat.preco_maximo)}
              </span>
            )}
          </div>
        </td>

        {/* Coluna: Status Revisão */}
        <td className="py-4 px-6 border-0 text-center">
          {cat.total_precisa_revisao > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCategoriaRevisando(cat);
              }}
              className="inline-flex flex-col items-center gap-1 group/rev cursor-pointer"
            >
              <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap border border-[#FECACA] bg-[#FEE2E2] text-[#B91C1C] inline-flex items-center gap-1 group-hover/rev:bg-[#B91C1C] group-hover/rev:text-white group-hover/rev:border-[#B91C1C] transition-all">
                <AlertCircle className="w-3 h-3" />
                {cat.total_precisa_revisao} revisões
              </span>
              <span className="text-[10px] text-muted-foreground font-bold group-hover/rev:text-[#B91C1C] transition-colors">
                clique para ver
              </span>
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap border border-[#BBF7D0] bg-[#DCFCE7] text-[#15803D]">
              Regularizado
            </span>
          )}
        </td>

        {/* Coluna: Ações */}
        <td className="py-4 px-6 rounded-r-2xl border-0 text-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCategoriaEditando(cat);
              setModalAberto("editar");
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition-colors group/edit hover:text-blue-900"
          >
            <Pencil className="w-4 h-4 text-orange-500 group-hover/edit:text-orange-700 transition-colors" />
            Editar
          </button>
        </td>
      </tr>
    ));
  };

  return (
    <div className="min-h-screen bg-background p-8 font-sans text-foreground">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-[#020854] dark:text-foreground">
          Categorias
        </h1>
      </div>

      {/* Barra de Pesquisa */}
      <div className="bg-card rounded-3xl p-6 shadow-sm border-0 mb-6 flex items-center justify-between">
        <div className="relative w-full max-w-3xl">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome da categoria ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-background rounded-full border-none text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-sm font-bold">Exibindo</span>
          <span className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-sm font-black border border-sky-200">
            {categoriasFiltradas.length} de {categorias.length}
          </span>
          {/* Botão Nova Categoria — padrão do projeto */}
          <button
            onClick={() => {
              setCategoriaEditando(null);
              setModalAberto("criar");
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            Nova Categoria
            <span className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-800 flex items-center justify-center transition-colors">
              <Plus className="w-4 h-4 text-white" />
            </span>
          </button>
        </div>
      </div>

      {/* Painel de Filtros */}
      <div className="bg-card rounded-3xl shadow-sm border-0 mb-8 overflow-hidden transition-all duration-300">
        <div className="p-6 flex justify-between items-center">
          <button
            onClick={() => setIsFiltrosOpen(!isFiltrosOpen)}
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
                      active:
                        "bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]",
                      dot: "#B91C1C",
                    },
                    {
                      value: "regularizadas",
                      label: "Regularizadas",
                      active:
                        "bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]",
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
                    onClick={() => setFiltroRevisao(value)}
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
                    onChange={(e) => setPrecoMin(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-background rounded-2xl border border-border text-foreground font-medium outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <span className="text-muted-foreground font-bold text-sm">
                  —
                </span>
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">
                    R$
                  </span>
                  <input
                    type="number"
                    placeholder="Máx"
                    value={precoMax}
                    onChange={(e) => setPrecoMax(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-background rounded-2xl border border-border text-foreground font-medium outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                {(precoMin || precoMax) && (
                  <button
                    onClick={() => {
                      setPrecoMin("");
                      setPrecoMax("");
                    }}
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
                    onClick={() => setOrdenacao(value)}
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

      {/* Tabela */}
      <div className="w-full overflow-x-auto bg-card rounded-3xl p-4 shadow-sm border border-border">
        {isLoading ? (
          <div className="w-full flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#0070DB]" />
            <span className="font-bold text-sm">
              A carregar categorias da API...
            </span>
          </div>
        ) : (
          <table className="w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="bg-[#020854] text-white">
                <th className="py-4 px-6 text-left rounded-l-xl text-[10px] font-black uppercase tracking-widest border-none">
                  Categoria
                </th>
                <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-none">
                  Nome
                </th>
                <th className="py-4 px-6 text-center text-[10px] font-black uppercase tracking-widest border-none">
                  Total Produtos
                </th>
                <th className="py-4 px-6 text-center text-[10px] font-black uppercase tracking-widest border-none">
                  Estoque Consol.
                </th>
                <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-none">
                  Preço Médio
                </th>
                <th className="py-4 px-6 text-center text-[10px] font-black uppercase tracking-widest border-none">
                  Status Revisão
                </th>
                <th className="py-4 px-6 text-center rounded-r-xl text-[10px] font-black uppercase tracking-widest border-none">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>{renderRows()}</tbody>
          </table>
        )}
      </div>

      {/* Modal Revisões */}
      {categoriaRevisando && (
        <ModalRevisoesCategoria
          categoria={categoriaRevisando}
          onClose={() => setCategoriaRevisando(null)}
        />
      )}

      {/* Modal Criar / Editar Categoria */}
      {modalAberto && (
        <ModalCategoria
          modo={modalAberto}
          categoria={categoriaEditando}
          onClose={() => {
            setModalAberto(null);
            setCategoriaEditando(null);
          }}
          onSalvo={(nova) => {
            if (modalAberto === "criar") {
              setCategorias((prev) => [...prev, nova]);
            } else {
              setCategorias((prev) =>
                prev.map((c) =>
                  c.id_categoria === nova.id_categoria ? nova : c,
                ),
              );
            }
            setModalAberto(null);
            setCategoriaEditando(null);
          }}
        />
      )}
    </div>
  );
}
