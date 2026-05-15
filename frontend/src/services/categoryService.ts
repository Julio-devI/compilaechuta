const API_URL = 'http://localhost:8800/categorias'

export interface Categoria {
  id_categoria: string
  nome_categoria: string
  imagem_url: string | null
  total_produtos: number
  total_produtos_ativos: number
  total_com_estoque: number
  preco_medio: number | null
  preco_minimo: number | null
  preco_maximo: number | null
  peso_medio_kg: number | null
  total_precisa_revisao: number
}

export async function getCategorias(): Promise<Categoria[]> {
  try {
    const response = await fetch(`${API_URL}?skip=0&limit=100`)
    if (!response.ok) throw new Error(`Erro na API: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('Erro ao buscar categorias:', error)
    return []
  }
}

export async function getCategoria(id: string): Promise<Categoria | null> {
  try {
    const response = await fetch(`${API_URL}/${id}`)
    if (!response.ok) throw new Error(`Erro na API: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('Erro ao buscar categoria:', error)
    return null
  }
}