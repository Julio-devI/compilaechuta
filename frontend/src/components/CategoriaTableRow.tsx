import { Layers, AlertCircle, Pencil } from "lucide-react";
import { Categoria, formatBRL } from "../services/categoryService";

interface CategoriaTableRowProps {
  cat: Categoria;
  selecionadas: Set<string>;
  onToggleSelecionar: (id: string, checked: boolean) => void;
  onEditar: (cat: Categoria) => void;
  onRevisar: (cat: Categoria) => void;
}

export function CategoriaTableRow({
  cat,
  selecionadas,
  onToggleSelecionar,
  onEditar,
  onRevisar,
}: CategoriaTableRowProps) {
  return (
    <tr className="bg-card group hover:bg-background transition-colors border-b border-border">
      {/* Coluna: Checkbox */}
      <td className="py-4 pl-4 pr-2 rounded-l-2xl border-0">
        <input
          type="checkbox"
          checked={selecionadas.has(cat.id_categoria)}
          onChange={(e) => onToggleSelecionar(cat.id_categoria, e.target.checked)}
          className="w-4 h-4 rounded accent-[#020854] cursor-pointer"
        />
      </td>

      {/* Coluna: Categoria (ID) */}
      <td className="py-4 px-6 border-0">
        <span className="font-black text-[#020854] dark:text-foreground text-lg">
          {cat.id_categoria.replace(/^#/, "")}
        </span>
      </td>

      {/* Coluna: Nome da Categoria */}
      <td className="py-4 px-6 border-0">
        <div className="flex items-center gap-3">
          {cat.imagem_url ? (
            <img
              src={cat.imagem_url}
              alt={cat.nome_categoria}
              className="w-9 h-9 rounded-lg object-cover border border-border flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-background border border-border flex items-center justify-center flex-shrink-0">
              <Layers className="w-4 h-4 text-muted-foreground opacity-40" />
            </div>
          )}
          <span className="font-bold text-foreground text-base">
            {cat.nome_categoria}
          </span>
        </div>
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
              onRevisar(cat);
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
            onEditar(cat);
          }}
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition-colors group/edit hover:text-blue-900"
        >
          <Pencil className="w-4 h-4 text-orange-500 group-hover/edit:text-orange-700 transition-colors" />
          Editar
        </button>
      </td>
    </tr>
  );
}