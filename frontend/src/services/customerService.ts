export interface Cliente {
  id: string | number
  nome: string
  cidade: string
  totalPedidos: number
  lvtTotal: string
  ultimoPedido: string
  ticketMedio: string
  estrelas: number
  qtd_tickets_suporte: number
  segmento: string
  status: string
  tendencia: 'up' | 'down' | 'stable'
  categoriaInteresse: string | null
}

export interface FiltrosClientes {
  search?: string
  status?: string
  lvtMin?: number
  lvtMax?: number
  ticket_min?: number
  ticket_max?: number
  data_inicio?: string
  data_fim?: string
  regiao?: string
  status_ticket?: 'aberto' | 'resolvido'
  sem_ticket?: boolean
  nps?: string
  csat?: string
  sku?: string
  categoria?: string
}

export interface ClientesKPIs {
  totalPedidos: { value: number; change: number }
  totalTickets: number
  csatPromotores: { value: number; change: number }
  npsDistribuicao: { promotores: number; neutros: number; detratores: number }
  ltvMedio: { value: number; change: number }
}

export function getClienteStatusStyle(segmento: string | null | undefined): string {
  if (!segmento) return 'bg-slate-100 text-slate-600 border border-slate-200'
  const s = segmento.toLowerCase()
  if (s.includes('vip')) return 'bg-[#020854] text-white border border-[#020854]'
  if (s.includes('novo')) return 'bg-[#1E5EFF] text-white border border-[#1E5EFF]'
  if (s.includes('inativo') || s.includes('perdido')) return 'bg-slate-100 text-slate-600 border border-slate-200'
  if (s.includes('campeão') || s.includes('campeao')) return 'bg-amber-100 text-amber-700 border border-amber-200'
  if (s.includes('regular') || s.includes('recorrente') || s.includes('potencial') || s.includes('promissor')) return 'bg-emerald-100 text-emerald-700 border border-emerald-200'
  if (s.includes('fiel') || s.includes('leal')) return 'bg-purple-100 text-purple-700 border border-purple-200'
  if (s.includes('risco')) return 'bg-red-100 text-red-700 border border-red-200'
  return 'bg-slate-100 text-slate-600 border border-slate-200'
}

const API_URL = 'http://localhost:8000/api/v1/clients/'
const DASHBOARD_URL = 'http://localhost:8000/api/v1/dashboard'
const TICKETS_URL = 'http://localhost:8000/api/v1/tickets'

export async function getClientes(
  skip = 0,
  limit = 20,
  filtros?: FiltrosClientes,
): Promise<{ data: Cliente[]; total: number }> {
  try {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    })

    if (filtros?.search) params.append('search', filtros.search)
    if (filtros?.status && filtros.status !== 'Todos') params.append('status', filtros.status)
    if (filtros?.lvtMin !== undefined) params.append('lvt_min', filtros.lvtMin.toString())
    if (filtros?.lvtMax !== undefined) params.append('lvt_max', filtros.lvtMax.toString())
    if (filtros?.ticket_min !== undefined) params.append('ticket_min', filtros.ticket_min.toString())
    if (filtros?.ticket_max !== undefined) params.append('ticket_max', filtros.ticket_max.toString())
    if (filtros?.data_inicio) params.append('data_inicio', filtros.data_inicio)
    if (filtros?.data_fim) params.append('data_fim', filtros.data_fim)
    if (filtros?.regiao && filtros.regiao !== 'Todos') params.append('regiao', filtros.regiao)
    if (filtros?.status_ticket) params.append('status_ticket', filtros.status_ticket)
    if (filtros?.sem_ticket) params.append('sem_ticket', 'true')
    if (filtros?.nps && filtros.nps !== 'Todos') params.append('nps', filtros.nps)
    if (filtros?.csat && filtros.csat !== 'Todos') params.append('csat', filtros.csat)
    if (filtros?.sku) params.append('sku', filtros.sku)
    if (filtros?.categoria && filtros.categoria !== 'Todos') params.append('categoria', filtros.categoria)

    const response = await fetch(`${API_URL}?${params.toString()}`)
    if (!response.ok) throw new Error(`Erro na API: ${response.status}`)
    const result = await response.json()

    const mappedData: Cliente[] = result.data.map((c: any) => {
      const ticketMedioVal =
        c.qtd_pedidos_realizados > 0 ? c.total_gasto_brl / c.qtd_pedidos_realizados : 0
      return {
        id: c.id_cliente,
        nome: c.nome_cliente,
        cidade: c.cidade ? `${c.cidade}${c.estado ? `, ${c.estado}` : ''}` : 'Não informada',
        totalPedidos: c.qtd_pedidos_realizados,
        lvtTotal: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
          c.total_gasto_brl,
        ),
        ultimoPedido: c.data_ultima_compra
          ? new Date(c.data_ultima_compra).toLocaleDateString('pt-BR')
          : 'N/A',
        ticketMedio: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
          ticketMedioVal,
        ),
        estrelas: c.media_estrelas_dadas ?? 0,
        qtd_tickets_suporte: c.qtd_tickets_suporte,
        segmento: c.segmento_rfm || 'Geral',
        status: c.segmento_rfm || 'Geral',
        tendencia: 'stable',
        categoriaInteresse: c.categoria_interesse ?? null,
      }
    })

    return { data: mappedData, total: result.total }
  } catch (error) {
    console.error('Erro ao buscar clientes:', error)
    return { data: [], total: 0 }
  }
}

export async function getClientesKPIs(): Promise<ClientesKPIs> {
  const fallback: ClientesKPIs = {
    totalPedidos: { value: 0, change: 0 },
    totalTickets: 0,
    csatPromotores: { value: 0, change: 0 },
    npsDistribuicao: { promotores: 70, neutros: 18, detratores: 12 },
    ltvMedio: { value: 0, change: 0 },
  }

  try {
    const [kpisRes, ticketSummaryRes, csatRes] = await Promise.all([
      fetch(`${DASHBOARD_URL}/kpis`),
      fetch(`${TICKETS_URL}/summary`),
      fetch(`${DASHBOARD_URL}/charts/csat-distribution`),
    ])

    const [kpis, ticketSummary, csat] = await Promise.all([
      kpisRes.ok ? kpisRes.json() : null,
      ticketSummaryRes.ok ? ticketSummaryRes.json() : null,
      csatRes.ok ? csatRes.json() : null,
    ])

    return {
      totalPedidos: {
        value: kpis?.total_orders?.current_value ?? 0,
        change: kpis?.total_orders?.percentage_change ?? 0,
      },
      totalTickets: ticketSummary?.total ?? 0,
      csatPromotores: {
        value: kpis?.csat_promoters?.current_value ?? 0,
        change: kpis?.csat_promoters?.percentage_change ?? 0,
      },
      npsDistribuicao: {
        promotores: csat?.data?.promoters_pct ?? 70,
        neutros: csat?.data?.neutrals_pct ?? 18,
        detratores: csat?.data?.detractors_pct ?? 12,
      },
      ltvMedio: {
        value: kpis?.ltv_medio?.current_value ?? 0,
        change: kpis?.ltv_medio?.percentage_change ?? 0,
      },
    }
  } catch (error) {
    console.error('Erro ao buscar KPIs de clientes:', error)
    return fallback
  }
}
