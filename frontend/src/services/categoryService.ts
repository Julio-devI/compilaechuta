const API_URL = "http://localhost:8000/api/v1/categories";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Categoria {
  id_categoria: string;
  nome_categoria: string;
  imagem_url: string | null;
  total_produtos: number;
  total_produtos_ativos: number;
  total_com_estoque: number;
  preco_medio: number | null;
  preco_minimo: number | null;
  preco_maximo: number | null;
  peso_medio_kg: number | null;
  total_precisa_revisao: number;
}

export interface CategoryCreate {
  nome_categoria: string;
  imagem_url?: string | null;
}

export interface CategoryUpdate {
  nome_categoria?: string | null;
  imagem_url?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const formatBRL = (value: number | null | undefined): string =>
  value != null
    ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";

export function normalizeCategoriaSearch(search: string): string {
  return search
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[-_]/g, "")
    .replace(/^categ/, "")
    .replace(/^cat(?=\d)/, "")
    .replace(/^c(?=\d)/, "");
}

// ─── Funções de serviço ───────────────────────────────────────────────────────

export async function getCategorias(
  skip = 0,
  limit = 100,
): Promise<Categoria[]> {
  try {
    const response = await fetch(`${API_URL}/?skip=${skip}&limit=${limit}`);
    if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    return [];
  }
}

export async function getCategoria(id: string): Promise<Categoria | null> {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Erro ao buscar categoria:", error);
    return null;
  }
}

export async function createCategoria(
  payload: CategoryCreate,
): Promise<Categoria | null> {
  try {
    const response = await fetch(`${API_URL}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Erro ao criar categoria:", error);
    return null;
  }
}

export async function updateCategoria(
  id: string,
  payload: CategoryUpdate,
): Promise<Categoria | null> {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Erro ao atualizar categoria:", error);
    return null;
  }
}

export async function deleteCategoria(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
    return true;
  } catch (error) {
    console.error("Erro ao deletar categoria:", error);
    return false;
  }
}
