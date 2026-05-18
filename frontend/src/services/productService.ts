import { apiUrl } from './apiConfig'

const API_URL = apiUrl('/products/')
const EVAL_API_URL = apiUrl('/orders-evaluation/')

// 1. Interface de como o dado CHEGA da sua nova API (Backend)
export interface ProdutoDaAPI {
  id_produto: string
  nome_produto: string
  sku: string | null
  categoria: string | null
  fornecedor: string | null
  preco: number | null
  peso_kg: number | null
  estoque_disponivel: number
  ativo: string
  precisa_revisao: string
  data_cadastro_produto: string | null
  total_pedidos: number
  receita_total: number | null
  ticket_medio: number | null
  total_unidades_vendidas: number | null
  total_avaliacoes: number | null
  media_nota_produto: number | null
  media_nota_nps: number | null
  pct_recomendacoes_sim: number | null
  total_tickets: number | null
  media_tempo_resolucao_horas: number | null
  media_nota_suporte: number | null
  descricao?: string | null
}

// 2. Interface de como o dado vai para a TELA (Mantendo o padrão original do Front)
export interface Produto {
  id: string
  nome: string
  sku: string
  categoria: string
  preco: string
  estoque: number
  vendidos: number
  avaliacao: number
  status: 'ativo' | 'inativo' | 'baixo_estoque'
  imagem: string
  tendencia: 'up' | 'down' | 'stable'
  // Campos extras úteis para os cards do dashboard
  ticketMedio?: string
  total_tickets?: number
  receitaTotal?: string
  descricao?: string;
  comentarios?: string[];
}

export interface FiltrosProdutos {
  categoria?: string;
  status?: string; // 'ativo', 'inativo', 'baixo_estoque'
  precoMin?: number;
  precoMax?: number;
}

export async function getCategorias(): Promise<string[]> {
  try {
    // Tenta buscar da API (se você tiver criado a rota GET /categorias)
    const response = await fetch(apiUrl('/categories'));
    if (response.ok) {
      return await response.json();
    }
    return [];
  } catch {
    return [];
  }
}

export type ProdutoStatus = Produto['status']

export const produtoStatusConfig: Record<ProdutoStatus, { color: string; label: string }> = {
  ativo:         { color: 'bg-[#00C48C]/10 text-[#00C48C]', label: 'Ativo' },
  inativo:       { color: 'bg-[#FF4757]/10 text-[#FF4757]', label: 'Inativo' },
  baixo_estoque: { color: 'bg-[#FFD60A]/10 text-[#B8860B]', label: 'Baixo Estoque' },
}

// Lógica de status combinando regras de negócio
export function getProdutoStatus(ativo: string, estoque: number): ProdutoStatus {
  if (ativo === 'Não') return 'inativo'
  if (estoque <= 10) return 'baixo_estoque'
  return 'ativo'
}

// Função auxiliar para mapear 1 item da API para o formato da Tela
function formatCurrencyOrNA(value: number | null): string {
  if (value === null || value === -1) return 'N/A'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatNumberOrZero(value: number | null): number {
  if (value === null || value === -1) return 0
  return value
}

function mapearProduto(p: ProdutoDaAPI): Produto {
  return {
    id: p.id_produto,
    nome: p.nome_produto,
    sku: p.sku || 'Sem SKU',
    categoria: p.categoria || 'Outros',
    preco: formatCurrencyOrNA(p.preco),
    estoque: p.estoque_disponivel === -1 ? 0 : p.estoque_disponivel,
    vendidos: formatNumberOrZero(p.total_unidades_vendidas),
    avaliacao: formatNumberOrZero(p.media_nota_produto),
    status: getProdutoStatus(p.ativo, p.estoque_disponivel),
    imagem: '📦', // Imagem padrão
    tendencia: 'stable', 
    ticketMedio: formatCurrencyOrNA(p.ticket_medio),
    receitaTotal: formatCurrencyOrNA(p.receita_total),
    total_tickets: formatNumberOrZero(p.total_tickets),
    descricao: p.descricao || ''
  }
}

// Buscar todos os produtos (com paginação e filtros)
export async function getProdutos(
  skip: number = 0,
  limit: number = 1000,
  filtros?: FiltrosProdutos // Recebe os filtros aqui
): Promise<Produto[]> {
  try {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    })

    // Adicionando os filtros na URL da API
    if (filtros?.categoria && filtros.categoria !== 'Todas as Categorias') {
      params.append('categoria', filtros.categoria)
    }
    if (filtros?.status) params.append('status', filtros.status)
    if (filtros?.precoMin !== undefined) params.append('preco_min', filtros.precoMin.toString())
    if (filtros?.precoMax !== undefined) params.append('preco_max', filtros.precoMax.toString())

    const response = await fetch(`${API_URL}?${params.toString()}`)
    if (!response.ok) throw new Error(`Erro na API: ${response.status}`)

    const data = await response.json()
    const produtosApi: ProdutoDaAPI[] = Array.isArray(data) ? data : data.data || []
    return produtosApi.map(mapearProduto)
  } catch (error) {
    console.error('Erro ao buscar produtos:', error)
    return []
  }
}

export async function getFornecedores(): Promise<string[]> {
  try {
    const response = await fetch(`${API_URL}suppliers`)
    if (!response.ok) throw new Error(`Erro na API: ${response.status}`)

    const data = await response.json()
    return data.supplierList || []
  } catch (error) {
    console.error('Erro ao buscar fornecedores:', error)
    return []
  }
}

export async function getTotalProdutos(): Promise<number> {
  try {
    const response = await fetch(`${API_URL}total`)
    if (!response.ok) throw new Error(`Erro na API: ${response.status}`)

    const data = await response.json()
    return data.total || 0
  } catch (error) {
    console.error('Erro ao buscar total de produtos:', error)
    return 0
  }
}

export async function getTopSellingProduct(): Promise<string> {
  try {
    const response = await fetch(`${API_URL}top-selling`)
    if (!response.ok) throw new Error(`Erro na API: ${response.status}`)

    const data = await response.json()
    return data.top_selling || 'Nenhum'
  } catch (error) {
    console.error('Erro ao buscar produto mais vendido:', error)
    return 'Nenhum'
  }
}

export async function getProductComments(id: string): Promise<string[]> {
  try {
    const response = await fetch(`${EVAL_API_URL}product/${id}/comments`)
    if (!response.ok) throw new Error(`Erro na API: ${response.status}`)

    return await response.json()
  } catch (error) {
    console.error('Erro ao buscar comentários:', error)
    return []
  }
}

// Buscar um único produto por ID
export async function getProduto(id: string): Promise<Produto | null> {
  try {
    const response = await fetch(`${API_URL}${id}`)
    if (!response.ok) throw new Error(`Erro na API: ${response.status}`)
    
    const data: ProdutoDaAPI = await response.json()
    return mapearProduto(data)
    
  } catch (error) {
    console.error('Erro ao buscar produto:', error)
    return null
  }
}

export interface ProdutoPayload {
  id_produto: string; 
  sku: string;
  nome_produto: string;
  categoria: string;
  fornecedor: string;
  preco: number;
  peso_kg: number;
  estoque_disponivel: number;
  ativo: string | boolean; 
  precisa_revisao: string | boolean;
  descricao?: string;
}

export async function criarProduto(produto: ProdutoPayload): Promise<boolean> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(produto),
    })

    if (!response.ok) throw new Error(`Erro ao criar: ${response.status}`)
    return true
  } catch (error) {
    console.error('Erro ao criar produto:', error)
    return false
  }
}

export async function atualizarProduto(id: string, produto: Partial<ProdutoPayload>): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}${id}`, {
      method: 'PATCH', 
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(produto),
    })

    if (!response.ok) throw new Error(`Erro ao atualizar: ${response.status}`)
    return true
  } catch (error) {
    console.error('Erro ao atualizar produto:', error)
    return false
  }
}

export async function deleteProduto(id: string): Promise<void> {
  const response = await fetch(`${API_URL}${id}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    throw new Error(`Erro ao deletar produto: ${response.status}`)
  }
}

export async function exportarProdutosCSV(): Promise<void> {
  try {
    const response = await fetch(`${API_URL}exportar/csv`)
    if (!response.ok) throw new Error(`Erro na API: ${response.status}`)

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'produtos.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Erro ao exportar produtos:', error)
  }
}
