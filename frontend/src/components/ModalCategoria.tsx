import { useState } from "react";
import { Layers, RefreshCw, Plus, Pencil, X } from "lucide-react";
import {
  createCategoria,
  updateCategoria,
  Categoria,
} from "../services/categoryService";

interface ModalCategoriaProps {
  modo: "criar" | "editar";
  categoria: Categoria | null;
  onClose: () => void;
  onSalvo: (cat: Categoria) => void;
}

export function ModalCategoria({
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
        className="bg-card rounded-3xl shadow-xl border border-border w-full max-w-2xl p-8 flex gap-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Painel Esquerdo: Preview da Imagem ───────────────────────────── */}
        <div className="flex flex-col gap-4 w-52 flex-shrink-0">
          {/* Quadrado de preview */}
          <div className="w-full aspect-square rounded-2xl border-2 border-dashed border-border bg-background flex items-center justify-center overflow-hidden relative">
            {imagemUrl ? (
              <>
                <img
                  src={imagemUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                {/* Botão remover imagem */}
                <button
                  onClick={() => setImagemUrl("")}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground text-center px-4">
                <Layers className="w-10 h-10 opacity-20" />
                <span className="text-xs font-bold">Sem imagem</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Painel Direito: Formulário ────────────────────────────────────── */}
        <div className="flex flex-col gap-6 flex-1 min-w-0">
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

          {/* Campo nome */}
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

          {/* Campo URL da imagem */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
              URL da Imagem
            </label>
            <input
              type="text"
              value={imagemUrl}
              onChange={(e) => setImagemUrl(e.target.value)}
              placeholder="https://exemplo.com/imagem.jpg"
              className="w-full p-4 bg-background rounded-2xl border border-border text-foreground font-medium outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Erro */}
          {erro && (
            <p className="text-sm font-bold text-[#B91C1C] bg-[#FEE2E2] px-4 py-3 rounded-2xl">
              {erro}
            </p>
          )}

          {/* Ações */}
          <div className="flex gap-3 justify-end mt-auto">
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
    </div>
  );
}