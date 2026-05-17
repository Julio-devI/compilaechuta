const BASE = 'http://localhost:8000/api/v1/dashboard'

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function tabToDateRange(tabId: string): Record<string, string> {
  const hoje = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  if (tabId === 'visao-geral') {
    return { data_inicio: '2019-01-01', data_fim: fmt(hoje) }
  }
  if (tabId === 'este-mes') {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    return { data_inicio: fmt(inicio), data_fim: fmt(hoje) }
  }
  if (tabId === 'trimestre') {
    const inicio = new Date(hoje)
    inicio.setDate(hoje.getDate() - 90)
    return { data_inicio: fmt(inicio), data_fim: fmt(hoje) }
  }
  // default: últimos 30 dias
  const inicio = new Date(hoje)
  inicio.setDate(hoje.getDate() - 30)
  return { data_inicio: fmt(inicio), data_fim: fmt(hoje) }
}

export interface KpiItem {
  title: string
  value: string
  change: number
  changeLabel: string
  iconName: 'DollarSign' | 'ShoppingBag' | 'ThumbsUp' | 'Users' | 'Truck'
  iconColor: string
  iconBgColor: string
}

export interface FilterTab {
  id: string
  label: string
}

export interface QuickAction {
  iconName: 'Package' | 'Users' | 'Download' | 'Lightbulb'
  label: string
  subLabel: string
  iconColor: string
  bgColor: string
}

export interface RevenueDataPoint {
  month: string
  value: number
  active: boolean
}

export interface SatisfactionItem {
  name: string
  value: number
  color: string
}

// "Dentro/Fora do prazo" não existe no banco — substituído por contagem por status
export interface OperationsDataPoint {
  status: string
  count: number
}

const filterTabs: FilterTab[] = [
  { id: 'visao-geral',     label: 'Visão Geral' },
  { id: 'este-mes',        label: 'Este Mês' },
  { id: 'ultimos-30-dias', label: 'Últimos 30 Dias' },
  { id: 'trimestre',       label: 'Trimestre' },
  { id: 'por-categoria',   label: 'Por Categoria' },
  { id: 'escolher-outro',  label: 'Escolher outro' },
]

export function getFilterTabs(): FilterTab[] {
  return filterTabs
}

export async function getKpiData(tabId = 'ultimos-30-dias'): Promise<KpiItem[]> {
  try {
    const params = new URLSearchParams(tabToDateRange(tabId))
    const res = await fetch(`${BASE}/kpis?${params}`)
    if (!res.ok) throw new Error()
    const data = await res.json()

    const fmtBRL = (v: number) =>
      new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(v)
    const fmtNum = (v: number) =>
      new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v)

    return [
      {
        title: 'Receita total',
        value: fmtBRL(data.total_revenue.current_value),
        change: data.total_revenue.percentage_change,
        changeLabel: 'período anterior',
        iconName: 'DollarSign',
        iconColor: 'text-[#1E5EFF]',
        iconBgColor: 'bg-primary-light',
      },
      {
        title: 'Pedidos',
        value: fmtNum(data.total_orders.current_value),
        change: data.total_orders.percentage_change,
        changeLabel: 'período anterior',
        iconName: 'ShoppingBag',
        iconColor: 'text-success',
        iconBgColor: 'bg-success-light',
      },
      {
        title: 'CSAT Promotores',
        value: `${data.csat_promoters.current_value.toFixed(1)}%`,
        change: data.csat_promoters.percentage_change,
        changeLabel: 'período anterior',
        iconName: 'ThumbsUp',
        iconColor: 'text-warning',
        iconBgColor: 'bg-warning-light',
      },
      {
        title: 'Clientes Ativos',
        value: fmtNum(data.active_clients.current_value),
        change: data.active_clients.percentage_change,
        changeLabel: 'período anterior',
        iconName: 'Users',
        iconColor: 'text-primary',
        iconBgColor: 'bg-primary-light',
      },
      {
        title: 'LTV Médio',
        value: fmtBRL(data.ltv_medio.current_value),
        change: data.ltv_medio.percentage_change,
        changeLabel: 'período anterior',
        iconName: 'DollarSign',
        iconColor: 'text-danger',
        iconBgColor: 'bg-danger-light',
      },
    ]
  } catch {
    return []
  }
}

export async function getRevenueData(tabId = 'ultimos-30-dias'): Promise<RevenueDataPoint[]> {
  try {
    const params = new URLSearchParams(tabToDateRange(tabId))
    const res = await fetch(`${BASE}/charts/revenue-over-time?${params}`)
    if (!res.ok) throw new Error()
    const json = await res.json()
    const currentMonthKey = new Date().toISOString().slice(0, 7)

    return (json.data as { time_period: string; revenue: number }[]).map((row) => {
      const [, monthStr] = row.time_period.split('-')
      const month = MONTH_LABELS[parseInt(monthStr, 10) - 1] ?? row.time_period
      return {
        month,
        value: Math.round(row.revenue / 1000),
        active: row.time_period === currentMonthKey,
      }
    })
  } catch {
    return []
  }
}

export async function getSatisfactionData(tabId = 'ultimos-30-dias'): Promise<SatisfactionItem[]> {
  try {
    const params = new URLSearchParams(tabToDateRange(tabId))
    const res = await fetch(`${BASE}/charts/csat-distribution?${params}`)
    if (!res.ok) throw new Error()
    const json = await res.json()
    const d = json.data
    return [
      { name: 'Promotores', value: Math.round(d.promoters_pct), color: '#1E5EFF' },
      { name: 'Neutros',    value: Math.round(d.neutrals_pct),  color: '#FFD60A' },
      { name: 'Detratores', value: Math.round(d.detractors_pct), color: '#FF4757' },
    ]
  } catch {
    return []
  }
}

export async function getOperationsData(tabId = 'ultimos-30-dias'): Promise<OperationsDataPoint[]> {
  try {
    const params = new URLSearchParams(tabToDateRange(tabId))
    const res = await fetch(`${BASE}/charts/order-status?${params}`)
    if (!res.ok) throw new Error()
    const json = await res.json()
    return (json.data as { status: string; count: number }[]).map((row) => ({
      status: row.status,
      count: row.count,
    }))
  } catch {
    return []
  }
}

export async function getQuickActions(): Promise<QuickAction[]> {
  try {
    const res = await fetch(`${BASE}/quick-actions`)
    if (!res.ok) throw new Error()
    const data = await res.json()
    return [
      {
        iconName: 'Users',
        label: 'Clientes com tickets abertos',
        subLabel: String(data.clients_with_open_tickets),
        iconColor: 'text-[#FFCC00]',
        bgColor: 'bg-[#FFCC00]/20',
      },
      {
        iconName: 'Download',
        label: 'Exportar CSV',
        subLabel: 'Mês atual',
        iconColor: 'text-[#0070DB]',
        bgColor: 'bg-[#0070DB]/10',
      },
      {
        iconName: 'Lightbulb',
        label: 'Insights de IA',
        subLabel: 'Analisar dados',
        iconColor: 'text-white',
        bgColor: 'bg-linear-to-b from-[#60A5FA] to-[#1E5EFF]',
      },
    ]
  } catch {
    return []
  }
}
