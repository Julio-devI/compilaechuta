import { ChevronLeft, ChevronRight } from "lucide-react";

interface CategoriaPaginacaoProps {
  currentPage: number;
  totalPages: number;
  firstVisible: number;
  lastVisible: number;
  totalFiltradas: number;
  onPageChange: (page: number) => void;
}

export function CategoriaPaginacao({
  currentPage,
  totalPages,
  firstVisible,
  lastVisible,
  totalFiltradas,
  onPageChange,
}: CategoriaPaginacaoProps) {
  const paginationPages = Array.from(
    { length: totalPages },
    (_, i) => i + 1,
  ).filter(
    (page) =>
      page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1,
  );

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-2 py-4 border-t border-border">
      <p className="text-sm font-bold text-muted-foreground">
        Mostrando {firstVisible}–{lastVisible} de {totalFiltradas}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="w-10 h-10 rounded-full bg-background text-muted-foreground border border-border flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-border transition-colors"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {paginationPages.map((page, index) => {
          const prev = paginationPages[index - 1];
          const showGap = prev !== undefined && page - prev > 1;
          return (
            <div key={page} className="flex items-center gap-2">
              {showGap && (
                <span className="text-muted-foreground font-bold px-1">...</span>
              )}
              <button
                onClick={() => onPageChange(page)}
                className={`min-w-10 h-10 rounded-full px-3 text-sm font-black transition-colors ${
                  currentPage === page
                    ? "bg-[#020854] text-white shadow-md"
                    : "bg-background text-muted-foreground border border-border hover:bg-slate-100 dark:hover:bg-border"
                }`}
              >
                {page}
              </button>
            </div>
          );
        })}

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="w-10 h-10 rounded-full bg-background text-muted-foreground border border-border flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-border transition-colors"
          aria-label="Próxima página"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}