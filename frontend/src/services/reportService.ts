export interface ReceitaMensal {
  mes: string
  receita: number
  meta: number
}

export interface VendaCategoria {
  name: string
  value: number
  color: string
}

export interface ClienteRegiao {
  regiao: string
  clientes: number
}

export interface PedidoDia {
  dia: string
  pedidos: number
}

export interface RelatorioDisponivel {
  id: number
  nome: string
  tipo: string
  tamanho: string
  data: string
}

const mockReceitaMensal: ReceitaMensal[] = [
  { mes: 'Jan', receita: 245000, meta: 250000 },
  { mes: 'Fev', receita: 298000, meta: 280000 },
  { mes: 'Mar', receita: 312000, meta: 300000 },
  { mes: 'Abr', receita: 285000, meta: 320000 },
  { mes: 'Mai', receita: 356000, meta: 340000 },
  { mes: 'Jun', receita: 389000, meta: 360000 },
  { mes: 'Jul', receita: 421000, meta: 400000 },
  { mes: 'Ago', receita: 398000, meta: 420000 },
  { mes: 'Set', receita: 445000, meta: 440000 },
  { mes: 'Out', receita: 478000, meta: 460000 },
  { mes: 'Nov', receita: 512000, meta: 500000 },
  { mes: 'Dez', receita: 567000, meta: 550000 },
]

const mockVendasPorCategoria: VendaCategoria[] = [
  { name: 'Eletrônicos', value: 35, color: '#1E5EFF' },
  { name: 'Informática', value: 25, color: '#00C48C' },
  { name: 'Áudio',       value: 18, color: '#FFD60A' },
  { name: 'Games',       value: 12, color: '#8B5CF6' },
  { name: 'Outros',      value: 10, color: '#FF4757' },
]

const mockClientesPorRegiao: ClienteRegiao[] = [
  { regiao: 'Sudeste',      clientes: 25430 },
  { regiao: 'Sul',          clientes: 12890 },
  { regiao: 'Nordeste',     clientes: 8540 },
  { regiao: 'Centro-Oeste', clientes: 2890 },
  { regiao: 'Norte',        clientes: 1109 },
]

const mockPedidosPorDia: PedidoDia[] = [
  { dia: 'Seg', pedidos: 1250 },
  { dia: 'Ter', pedidos: 1380 },
  { dia: 'Qua', pedidos: 1420 },
  { dia: 'Qui', pedidos: 1350 },
  { dia: 'Sex', pedidos: 1680 },
  { dia: 'Sáb', pedidos: 2150 },
  { dia: 'Dom', pedidos: 1890 },
]

const mockRelatoriosDisponiveis: RelatorioDisponivel[] = [
  { id: 1, nome: 'Relatório de Vendas',       tipo: 'PDF',   tamanho: '2.4 MB', data: '18/01/2024' },
  { id: 2, nome: 'Análise de Clientes',       tipo: 'Excel', tamanho: '1.8 MB', data: '17/01/2024' },
  { id: 3, nome: 'Performance de Produtos',   tipo: 'PDF',   tamanho: '3.2 MB', data: '16/01/2024' },
  { id: 4, nome: 'Relatório Financeiro',      tipo: 'Excel', tamanho: '4.1 MB', data: '15/01/2024' },
]

export async function getReceitaMensal(): Promise<ReceitaMensal[]> {
  return mockReceitaMensal
}

export async function getVendasPorCategoria(): Promise<VendaCategoria[]> {
  return mockVendasPorCategoria
}

export async function getClientesPorRegiao(): Promise<ClienteRegiao[]> {
  return mockClientesPorRegiao
}

export async function getPedidosPorDia(): Promise<PedidoDia[]> {
  return mockPedidosPorDia
}

export async function getRelatoriosDisponiveis(): Promise<RelatorioDisponivel[]> {
  return mockRelatoriosDisponiveis
}
