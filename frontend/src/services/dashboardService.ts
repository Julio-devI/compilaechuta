const BASE = 'http://localhost:8000/api/v1/dashboard'

export interface DateRange {
  inicio: string
  fim: string
}

export function tabToDateRange(tabId: string): DateRange {
  const hoje = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  if (tabId === 'visao-geral') return { inicio: '2019-01-01', fim: fmt(hoje) }
  if (tabId === 'este-mes') {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    return { inicio: fmt(inicio), fim: fmt(hoje) }
  }
  if (tabId === 'trimestre') {
    const inicio = new Date(hoje)
    inicio.setDate(hoje.getDate() - 90)
    return { inicio: fmt(inicio), fim: fmt(hoje) }
  }
  const inicio = new Date(hoje)
  inicio.setDate(hoje.getDate() - 30)
  return { inicio: fmt(inicio), fim: fmt(hoje) }
}

function rangeToParams(r: DateRange): URLSearchParams {
  return new URLSearchParams({ data_inicio: r.inicio, data_fim: r.fim })
}

export interface KpiItem {
  title: string
  value: string
  change: number | null
  changeLabel: string
  iconName: 'DollarSign' | 'ShoppingBag' | 'ThumbsUp' | 'Users' | 'Truck'
  iconColor: string
  iconBgColor: string
}

export interface FilterTab {
  id: string
  label: string
}


export interface SatisfactionItem {
  name: string
  value: number
  color: string
}

export interface OperationsDataPoint {
  status: string
  count: number
}

const filterTabs: FilterTab[] = [
  { id: 'visao-geral',     label: 'Visão Geral' },
  { id: 'este-mes',        label: 'Este Mês' },
  { id: 'ultimos-30-dias', label: 'Últimos 30 Dias' },
  { id: 'trimestre',       label: 'Trimestre' },
]

export function getFilterTabs(): FilterTab[] {
  return filterTabs
}

export async function getKpiData(dateRange: DateRange): Promise<KpiItem[]> {
  try {
    const res = await fetch(`${BASE}/kpis?${rangeToParams(dateRange)}`)
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

export async function getSatisfactionData(dateRange: DateRange): Promise<SatisfactionItem[]> {
  try {
    const res = await fetch(`${BASE}/charts/csat-distribution?${rangeToParams(dateRange)}`)
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

export async function getOperationsData(dateRange: DateRange): Promise<OperationsDataPoint[]> {
  try {
    const res = await fetch(`${BASE}/charts/order-status?${rangeToParams(dateRange)}`)
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

export async function getTicketsAbertos(): Promise<number> {
  try {
    const res = await fetch(`${BASE}/quick-actions`)
    if (!res.ok) throw new Error()
    const data = await res.json()
    return data.clients_with_open_tickets as number
  } catch {
    return 0
  }
}
