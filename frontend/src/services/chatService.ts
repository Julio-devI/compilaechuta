export interface ConversaHistorico {
  id: number
  titulo: string
  timestamp: string
}

export interface ChatQuickAction {
  iconName: 'TrendingUp' | 'MessageSquare' | 'Users' | 'BarChart'
  texto: string
}

export type ChatRespostas = Record<string, string>

const mockConversasHistorico: ConversaHistorico[] = [
  { id: 1, titulo: 'Localizar lista de Clientes VP no Risco de Churn',         timestamp: '14:30' },
  { id: 2, titulo: 'Histórico Comportamento do Cliente Russell Grant',          timestamp: '13:15' },
  { id: 3, titulo: 'Fatores de Comparações Recorrentes do Cliente',             timestamp: '11:45' },
  { id: 4, titulo: 'Evolução de Retorno Mensal/Mais Estratégico',               timestamp: '10:20' },
  { id: 5, titulo: 'Análise dos Fatores de Qualidade Cancelamento do Inventário', timestamp: 'Ontem' },
  { id: 6, titulo: 'Mapeamento de Pedidos Atrasados da Região de SP',           timestamp: 'Ontem' },
  { id: 7, titulo: 'Novo departamento de Entregas/Prazo do Prazo',              timestamp: 'Seg' },
]

const mockChatQuickActions: ChatQuickAction[] = [
  { iconName: 'TrendingUp',   texto: 'O que está vendendo mais?' },
  { iconName: 'MessageSquare', texto: 'Resumir esta página' },
  { iconName: 'Users',        texto: 'Perguntas sobre vendas' },
  { iconName: 'BarChart',     texto: 'Analisar resultados desta semana' },
]

const mockChatRespostas: ChatRespostas = {
  receita: 'Com base nos dados do último mês, a receita total foi de R$ 350.000, representando um aumento de 12,5% em comparação ao mês anterior.\n\nOs principais contribuidores foram:\n• Eletrônicos: R$ 125.000 (35,7%)\n• Informática: R$ 87.500 (25%)\n• Áudio: R$ 63.000 (18%)\n\nO ticket médio subiu para R$ 285,00, indicando que os clientes estão comprando produtos de maior valor.',
  clientes: 'Esta semana tivemos 234 novos clientes cadastrados, um aumento de 15% em relação à semana anterior.\n\nDistribuição por região:\n• Sudeste: 45%\n• Sul: 25%\n• Nordeste: 18%\n• Centro-Oeste: 8%\n• Norte: 4%\n\nTaxa de conversão: 3,2% (acima da média do setor)',
  produtos: 'Os Top 5 produtos mais vendidos deste mês são:\n\n1. Smartphone Galaxy S24 - 892 unidades (R$ 3.8M)\n2. Notebook Dell Inspiron - 456 unidades (R$ 1.6M)\n3. Fone Bluetooth JBL - 1.234 unidades (R$ 369k)\n4. Console PS5 - 567 unidades (R$ 2.5M)\n5. Smart TV 55" LG - 234 unidades (R$ 655k)\n\nDestaque: Fones Bluetooth tiveram aumento de 45% nas vendas!',
  analise: 'Análise completa do desempenho de vendas:\n\nMétricas Principais:\n• Receita Total: R$ 4.2M (+18,5% YoY)\n• Pedidos: 310.000 (+12,3%)\n• Ticket Médio: R$ 285 (+8,2%)\n• Taxa de Conversão: 3,8%\n\nPontos de Atenção:\n• Estoque de Fones JBL está baixo (12 unidades)\n• Taxa de cancelamento subiu 0,5%\n\nRecomendações:\n1. Reabastecer estoque de produtos populares\n2. Investir em campanhas para região Norte\n3. Melhorar processo de entrega',
}

export async function getConversasHistorico(): Promise<ConversaHistorico[]> {
  return mockConversasHistorico
}

export async function getChatQuickActions(): Promise<ChatQuickAction[]> {
  return mockChatQuickActions
}

export async function getChatRespostas(): Promise<ChatRespostas> {
  return mockChatRespostas
}

export function resolveResposta(input: string, respostas: ChatRespostas): string {
  const lower = input.toLowerCase()
  if (lower.includes('receita') || lower.includes('faturamento')) return respostas.receita
  if (lower.includes('cliente')) return respostas.clientes
  if (lower.includes('produto') || lower.includes('vendido') || lower.includes('vendendo')) return respostas.produtos
  if (lower.includes('análise') || lower.includes('desempenho') || lower.includes('resultado')) return respostas.analise
  return 'Entendi sua pergunta! Deixe-me analisar os dados disponíveis. Posso ajudar com informações sobre vendas, clientes, produtos e muito mais. Poderia ser mais específico?'
}
