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

// Produto retornado no endpoint de revisões da categoria
export interface ProdutoRevisao {
  id_produto: string;
  nome_produto: string;
  preco: number | null;
  estoque: number;
  motivo_revisao: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const formatBRL = (value: number | null | undefined): string =>
  value != null
    ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";

/**
 * Normaliza o termo de busca do usuário para comparar com id_categoria.
 * Aceita variações como: "0001", "categ-0001", "CATEG - 0001", "categ  -  0001"
 * Todas resultam em "0001" para comparar com o número final do ID.
 */
export function normalizeCategoriaSearch(search: string): string {
  return (
    search
      .toLowerCase()
      .trim()

      // remove todos os espaços
      .replace(/\s+/g, "")

      // remove separadores
      .replace(/[-_]/g, "")

      // remove prefixos conhecidos apenas no início
      .replace(/^categ/, "")
      .replace(/^cat(?=\d)/, "")
      .replace(/^c(?=\d)/, "")
  );
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

// Produto retornado no endpoint de revisões da categoria
// Usa os campos reais do ProductResponse do backend
export interface ProdutoRevisao {
  id_produto: string;
  nome_produto: string;
  sku: string | null;
  preco: number | null;
  estoque_disponivel: number;
  ativo: string;
  precisa_revisao: string;
  total_pedidos: number;
  receita_total: number | null;
  media_nota_produto: number | null;
}

/**
 * Busca produtos de uma categoria que precisam de revisão.
 * Reutiliza GET /products/?categoria=...&precisa_revisao=Sim
 */
export async function getProdutosPorRevisao(
  nome_categoria: string,
): Promise<ProdutoRevisao[]> {
  try {
    const params = new URLSearchParams({
      categoria: nome_categoria,
      precisa_revisao: "Sim",
      skip: "0",
      limit: "100",
    });
    const response = await fetch(
      `http://localhost:8000/api/v1/products/?${params.toString()}`,
    );
    if (!response.ok) throw new Error(`Erro na API: ${response.status}`);

    // O endpoint pode retornar { total, skip, limit, data: [...] } (ProductListOut)
    // ou diretamente um array — tratamos os dois casos
    const json = await response.json();
    const data: ProdutoRevisao[] = Array.isArray(json)
      ? json
      : (json.data ?? []);
    return data;
  } catch (error) {
    console.error("Erro ao buscar produtos para revisão:", error);
    throw error;
  }
}
