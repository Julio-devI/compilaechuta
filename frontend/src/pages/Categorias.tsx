import { useState, useEffect } from "react";
import { Search, Layers, RefreshCw, Plus, Trash2 } from "lucide-react";
import {
  getCategorias,
  deleteCategoria,
  normalizeCategoriaSearch,
  Categoria,
} from "../services/categoryService";
import { ModalRevisoesCategoria } from "../components/ModalRevisoesCategoria";
import { ModalCategoria } from "../components/ModalCategoria";
import { CategoriaTableRow } from "../components/CategoriaTableRow";
import { CategoriaTableSkeleton } from "../components/CategoriaTableSkeleton";
import { CategoriaFiltros } from "../components/CategoriaFiltros";
import { CategoriaPaginacao } from "../components/CategoriaPaginacao";

const ITEMS_PER_PAGE = 20;

export function Categorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltrosOpen, setIsFiltrosOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);
  const [modalAberto, setModalAberto] = useState<"criar" | "editar" | null>(null);
  const [categoriaRevisando, setCategoriaRevisando] = useState<Categoria | null>(null);

  const [filtroRevisao, setFiltroRevisao] = useState<"todas" | "com_revisao" | "regularizadas">("todas");
  const [precoMin, setPrecoMin] = useState("");
  const [precoMax, setPrecoMax] = useState("");
  const [ordenacao, setOrdenacao] = useState<"nome" | "mais_revisoes" | "maior_estoque" | "maior_preco">("nome");

  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [isDeletando, setIsDeletando] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset página ao mudar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroRevisao, precoMin, precoMax, ordenacao]);

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
        cat.nome_categoria.toLowerCase().includes(searchTerm.toLowerCase().trim());

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

  const totalPages = Math.max(1, Math.ceil(categoriasFiltradas.length / ITEMS_PER_PAGE));
  const firstVisible = categoriasFiltradas.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const lastVisible = Math.min(currentPage * ITEMS_PER_PAGE, categoriasFiltradas.length);
  const categoriasPagina = categoriasFiltradas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  function handleToggleSelecionar(id: string, checked: boolean) {
    setSelecionadas((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }

  async function handleDeletarSelecionadas() {
    if (selecionadas.size === 0) return;
    setIsDeletando(true);
    try {
      await Promise.all(Array.from(selecionadas).map((id) => deleteCategoria(id)));
      setCategorias((prev) => prev.filter((c) => !selecionadas.has(c.id_categoria)));
      setSelecionadas(new Set());
    } catch (error) {
      console.error("Erro ao deletar categorias:", error);
    } finally {
      setIsDeletando(false);
    }
  }

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
      <CategoriaFiltros
        isFiltrosOpen={isFiltrosOpen}
        onToggleFiltros={() => setIsFiltrosOpen(!isFiltrosOpen)}
        filtroRevisao={filtroRevisao}
        onFiltroRevisaoChange={setFiltroRevisao}
        precoMin={precoMin}
        onPrecoMinChange={setPrecoMin}
        precoMax={precoMax}
        onPrecoMaxChange={setPrecoMax}
        onLimparPreco={() => { setPrecoMin(""); setPrecoMax(""); }}
        ordenacao={ordenacao}
        onOrdenacaoChange={setOrdenacao}
      />

      {/* Contador + Excluir Selecionadas */}
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-[#020854] dark:text-foreground">
          {categoriasFiltradas.length} Categorias Encontradas
        </h2>
        {selecionadas.size > 0 && (
          <button
            onClick={handleDeletarSelecionadas}
            disabled={isDeletando}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-white text-sm font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeletando ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Excluir Selecionadas ({selecionadas.size})
              </>
            )}
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="w-full overflow-x-auto bg-card rounded-3xl p-4 shadow-sm border border-border">
        {isLoading ? (
          <div className="w-full flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#0070DB]" />
            <span className="font-bold text-sm">A carregar categorias da API...</span>
          </div>
        ) : (
          <table className="w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="bg-[#020854] text-white">
                <th className="py-4 pl-4 pr-2 rounded-l-xl border-none">
                  <input
                    type="checkbox"
                    checked={
                      categoriasFiltradas.length > 0 &&
                      categoriasFiltradas.every((c) => selecionadas.has(c.id_categoria))
                    }
                    onChange={(e) => {
                      setSelecionadas(
                        e.target.checked
                          ? new Set(categoriasFiltradas.map((c) => c.id_categoria))
                          : new Set(),
                      );
                    }}
                    className="w-4 h-4 rounded accent-white cursor-pointer"
                  />
                </th>
                <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-none">Categoria</th>
                <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-none">Nome</th>
                <th className="py-4 px-6 text-center text-[10px] font-black uppercase tracking-widest border-none">Total Produtos</th>
                <th className="py-4 px-6 text-center text-[10px] font-black uppercase tracking-widest border-none">Estoque Consol.</th>
                <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-widest border-none">Preço Médio</th>
                <th className="py-4 px-6 text-center text-[10px] font-black uppercase tracking-widest border-none">Status Revisão</th>
                <th className="py-4 px-6 text-center rounded-r-xl text-[10px] font-black uppercase tracking-widest border-none">Ações</th>
              </tr>
            </thead>
            <tbody>
              {categoriasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 border-0">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Layers className="w-12 h-12 mb-4 opacity-30" />
                      <p className="font-bold text-lg">Nenhuma categoria encontrada.</p>
                      <p className="text-sm">Tente ajustar seus filtros de busca.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                categoriasPagina.map((cat) => (
                  <CategoriaTableRow
                    key={cat.id_categoria}
                    cat={cat}
                    selecionadas={selecionadas}
                    onToggleSelecionar={handleToggleSelecionar}
                    onEditar={(cat) => {
                      setCategoriaEditando(cat);
                      setModalAberto("editar");
                    }}
                    onRevisar={setCategoriaRevisando}
                  />
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Paginação */}
        {!isLoading && categoriasFiltradas.length > 0 && (
          <CategoriaPaginacao
            currentPage={currentPage}
            totalPages={totalPages}
            firstVisible={firstVisible}
            lastVisible={lastVisible}
            totalFiltradas={categoriasFiltradas.length}
            onPageChange={setCurrentPage}
          />
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
                prev.map((c) => (c.id_categoria === nova.id_categoria ? nova : c)),
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