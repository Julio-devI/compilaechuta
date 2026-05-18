const API_URL = 'http://localhost:8000/api/v1/categories'

export interface Categoria {
  id_categoria: string;
  nome_categoria: string;
  imagem_url: string | null;
  total_produtos: number;
  total_estoque_disponivel: number;
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
    console.error('Erro ao buscar categoria:', error)
    return false
  }
}

export async function getBestSellingCategory(): Promise<string> {
    try {
        const response = await fetch(`${API_URL}best-selling`)
        if (!response.ok) throw new Error(`Erro na API: ${response.status}`)
        const data = await response.json()
        return data.category || "Nenhuma"
    } catch (error) {
        console.error('Erro ao buscar categoria mais vendida:', error)
        return "Nenhuma"
    }
}

export async function getWorstSellingCategory(): Promise<string> {
    try {
        const response = await fetch(`${API_URL}worst-selling`)
        if (!response.ok) throw new Error(`Erro na API: ${response.status}`)
        const data = await response.json()
        return data.category || "Nenhuma"
    } catch (error) {
        console.error('Erro ao buscar categoria menos vendida:', error)
        return "Nenhuma"
    }
}
