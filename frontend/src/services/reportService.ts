import type { DateRange } from './dashboardService'
import { apiUrl } from './apiConfig'

const BASE = apiUrl('/dashboard')

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const CATEGORY_COLORS = ['#1E5EFF', '#00C48C', '#FFD60A', '#8B5CF6', '#FF4757', '#FF8C42', '#64748B']

function toParams(r: DateRange): URLSearchParams {
  return new URLSearchParams({ data_inicio: r.inicio, data_fim: r.fim })
}

export interface ReceitaMensal {
  mes: string
  receita: number
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

export async function getReceitaMensal(dateRange: DateRange): Promise<ReceitaMensal[]> {
  try {
    const res = await fetch(`${BASE}/charts/revenue-over-time?${toParams(dateRange)}`)
    if (!res.ok) throw new Error()
    const json = await res.json()
    return (json.data as { time_period: string; revenue: number }[]).map((row) => ({
      mes: row.time_period, // mantém "2019-01" como chave única — label formatado no gráfico
      receita: row.revenue,
    }))
  } catch {
    return []
  }
}

export async function getVendasPorCategoria(dateRange: DateRange): Promise<VendaCategoria[]> {
  try {
    const res = await fetch(`${BASE}/charts/revenue-by-category?${toParams(dateRange)}`)
    if (!res.ok) throw new Error()
    const json = await res.json()
    const rows = json.data as { category: string; revenue: number }[]
    const total = rows.reduce((sum, r) => sum + r.revenue, 0)
    return rows.map((r, i) => ({
      name: r.category,
      value: total > 0 ? Math.round((r.revenue / total) * 100) : 0,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }))
  } catch {
    return []
  }
}

export async function getClientesPorRegiao(): Promise<ClienteRegiao[]> {
  try {
    const res = await fetch(`${BASE}/charts/clients-by-region`)
    if (!res.ok) throw new Error()
    const json = await res.json()
    return json.data as ClienteRegiao[]
  } catch {
    return []
  }
}

export async function getPedidosPorDia(dateRange: DateRange): Promise<PedidoDia[]> {
  try {
    const res = await fetch(`${BASE}/charts/orders-by-weekday?${toParams(dateRange)}`)
    if (!res.ok) throw new Error()
    const json = await res.json()
    return json.data as PedidoDia[]
  } catch {
    return []
  }
}
