export interface Produto {
  id: number
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
}

export type ProdutoStatus = Produto['status']

export const produtoStatusConfig: Record<ProdutoStatus, { color: string; label: string }> = {
  ativo:        { color: 'bg-[#00C48C]/10 text-[#00C48C]', label: 'Ativo' },
  inativo:      { color: 'bg-[#FF4757]/10 text-[#FF4757]', label: 'Inativo' },
  baixo_estoque: { color: 'bg-[#FFD60A]/10 text-[#B8860B]', label: 'Baixo Estoque' },
}

const mockProdutos: Produto[] = [
  { id: 1, nome: 'Smartphone Galaxy S24', sku: 'SKU-001234', categoria: 'Eletrônicos',  preco: 'R$ 4.299,00', estoque: 145, vendidos: 892,  avaliacao: 4.8, status: 'ativo',        imagem: '📱', tendencia: 'up' },
  { id: 2, nome: 'Notebook Dell Inspiron', sku: 'SKU-001235', categoria: 'Informática',  preco: 'R$ 3.599,00', estoque: 67,  vendidos: 456,  avaliacao: 4.6, status: 'ativo',        imagem: '💻', tendencia: 'up' },
  { id: 3, nome: 'Fone Bluetooth JBL',    sku: 'SKU-001236', categoria: 'Áudio',        preco: 'R$ 299,00',   estoque: 12,  vendidos: 1234, avaliacao: 4.7, status: 'baixo_estoque', imagem: '🎧', tendencia: 'up' },
  { id: 4, nome: 'Smart TV 55" LG',       sku: 'SKU-001237', categoria: 'Eletrônicos',  preco: 'R$ 2.799,00', estoque: 89,  vendidos: 234,  avaliacao: 4.5, status: 'ativo',        imagem: '📺', tendencia: 'stable' },
  { id: 5, nome: 'Câmera Canon EOS',      sku: 'SKU-001238', categoria: 'Fotografia',   preco: 'R$ 5.999,00', estoque: 23,  vendidos: 78,   avaliacao: 4.9, status: 'ativo',        imagem: '📷', tendencia: 'down' },
  { id: 6, nome: 'Tablet iPad Pro',       sku: 'SKU-001239', categoria: 'Informática',  preco: 'R$ 7.499,00', estoque: 0,   vendidos: 345,  avaliacao: 4.8, status: 'inativo',      imagem: '📲', tendencia: 'down' },
  { id: 7, nome: 'Console PS5',           sku: 'SKU-001240', categoria: 'Games',        preco: 'R$ 4.499,00', estoque: 34,  vendidos: 567,  avaliacao: 4.9, status: 'ativo',        imagem: '🎮', tendencia: 'up' },
  { id: 8, nome: 'Smartwatch Apple',      sku: 'SKU-001241', categoria: 'Wearables',    preco: 'R$ 3.299,00', estoque: 56,  vendidos: 289,  avaliacao: 4.7, status: 'ativo',        imagem: '⌚', tendencia: 'stable' },
]

export async function getProdutos(): Promise<Produto[]> {
  return mockProdutos
}
