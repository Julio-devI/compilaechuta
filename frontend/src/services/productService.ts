const API_URL = 'http://localhost:8800/produtos'

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
    const response = await fetch('http://localhost:8800/categorias');
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
function mapearProduto(p: ProdutoDaAPI): Produto {
  return {
    id: p.id_produto,
    nome: p.nome_produto,
    sku: p.sku || 'Sem SKU',
    categoria: p.categoria || 'Outros',
    preco: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.preco || 0),
    estoque: p.estoque_disponivel,
    vendidos: p.total_unidades_vendidas || 0,
    avaliacao: p.media_nota_produto || 0,
    status: getProdutoStatus(p.ativo, p.estoque_disponivel),
    imagem: '📦', // Imagem padrão
    tendencia: 'stable', 
    ticketMedio: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.ticket_medio || 0),
    total_tickets: p.total_tickets || 0
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

    const response = await fetch(`${API_URL}/?${params.toString()}`)
    if (!response.ok) throw new Error(`Erro na API: ${response.status}`)

    const data: ProdutoDaAPI[] = await response.json()
    return data.map(mapearProduto)
  } catch (error) {
    console.error('Erro ao buscar produtos:', error)
    return []
  }
}

// Buscar um único produto por ID
export async function getProduto(id: string): Promise<Produto | null> {
  try {
    const response = await fetch(`${API_URL}/${id}`)
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
    const response = await fetch(`${API_URL}/${id}`, {
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
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    throw new Error(`Erro ao deletar produto: ${response.status}`)
  }
}

export async function exportarProdutosCSV(): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/exportar/csv`)
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