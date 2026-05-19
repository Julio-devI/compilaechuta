const ROUTE_SUGGESTIONS: Record<string, string[]> = {
  '/dashboard': [
    'Qual é a receita total agrupada por região do país?',
    'Quais são as principais métricas comerciais do último mês?',
    'Como está a evolução de receita ao longo de 2024?',
    'Qual canal de aquisição traz mais clientes para a loja?',
  ],
  '/clientes': [
    'Quais são os 10 clientes que mais gastaram na loja?',
    'Quantos clientes novos foram cadastrados no último mês?',
    'Qual é o ticket médio por segmento de cliente?',
    'Quais clientes não fazem pedidos há mais de 90 dias?',
  ],
  '/pedidos': [
    'Quantos pedidos existem agrupados por status?',
    'Qual é o ticket médio dos pedidos do último mês?',
    'Quais foram os 10 pedidos de maior valor já realizados?',
    'Como está a evolução diária de pedidos neste mês?',
  ],
  '/produtos': [
    'Quais são os 10 produtos mais vendidos?',
    'Quais produtos têm a melhor avaliação média dos clientes?',
    'Qual é a receita total por categoria de produto?',
    'Quais produtos têm a pior avaliação média dos clientes?',
  ],
  '/categorias': [
    'Quais categorias têm mais produtos precisando de revisão?',
    'Quais categorias concentram o maior estoque disponível?',
    'Qual é o preço médio dos produtos por categoria?',
    'Quais categorias têm menos produtos ativos no catálogo?',
  ],
  '/suporte': [
    'Qual é o tempo médio de resolução de tickets por tipo de problema?',
    'Quantos tickets estão abertos atualmente por tipo?',
    'Quais tipos de ticket mais aparecem nos últimos 30 dias?',
    'Qual é o nível de satisfação dos clientes com o atendimento?',
  ],
  '/relatorios': [
    'Qual é a evolução mensal de receita nos últimos 12 meses?',
    'Compare a receita deste trimestre com a do trimestre anterior.',
    'Quais produtos tiveram maior crescimento de vendas?',
    'Qual região teve maior aumento de vendas no último ano?',
  ],
}

const FALLBACK_SUGGESTIONS: string[] = [
  'Qual é a receita total deste mês?',
  'Quais foram os 5 produtos mais vendidos?',
  'Quantos clientes ativos temos atualmente?',
  'Qual é o tempo médio de resolução de tickets?',
]

export function getRouteSuggestions(pathname: string): string[] {
  for (const route of Object.keys(ROUTE_SUGGESTIONS)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return ROUTE_SUGGESTIONS[route]
    }
  }
  return FALLBACK_SUGGESTIONS
}
