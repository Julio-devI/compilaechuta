export interface SupportTicket {
  ticketId: string
  ticketDisplayId: string
  customerId: string
  customerName: string
  orderId: string | null
  productId: string | null
  openedAt: string
  resolvedAt: string | null
  resolutionTimeHours: number | null
  status: 'aberto' | 'resolvido'
  problemType: string
  supportAgent: string | null
  rating: number | null
}

export interface SupportTicketFilters {
  search?: string
  status?: string
  agent?: string
  problemType?: string
  startDate?: string
  endDate?: string
  skip?: number
  limit?: number
}

export interface SupportTicketSummary {
  total: number
  open: number
  resolved: number
  averageResolutionTimeHours: number
  agents: string[]
  problemTypes: string[]
}

interface SupportTicketApiResponse {
  id_ticket: string
  id_cliente: string
  nome_cliente?: string | null
  id_pedido?: string | null
  id_produto?: string | null
  data_abertura?: string | null
  data_resolucao?: string | null
  tempo_resolucao_horas?: number | null
  status?: 'aberto' | 'resolvido' | null
  tipo_problema?: string | null
  agente_suporte?: string | null
  nota_avaliacao?: number | null
}

interface SupportTicketSummaryApiResponse {
  total: number
  open: number
  resolved: number
  average_resolution_time_hours: number
  agents: string[]
  problem_types: string[]
}

interface CustomerApiResponse {
  id_cliente: string
  nome_cliente: string
}

const API_URL = 'http://localhost:8000/tickets'
const CUSTOMERS_API_URL = 'http://localhost:8000/clientes'

function mapSupportTicket(ticket: SupportTicketApiResponse, customerNames: Map<string, string>): SupportTicket {
  const customerName = ticket.nome_cliente || customerNames.get(ticket.id_cliente) || ticket.id_cliente

  return {
    ticketId: ticket.id_ticket,
    ticketDisplayId: formatTicketDisplayId(ticket.id_ticket),
    customerId: ticket.id_cliente,
    customerName,
    orderId: ticket.id_pedido ?? null,
    productId: ticket.id_produto ?? null,
    openedAt: ticket.data_abertura || '',
    resolvedAt: ticket.data_resolucao ?? null,
    resolutionTimeHours: ticket.tempo_resolucao_horas ?? null,
    status: ticket.status || 'aberto',
    problemType: ticket.tipo_problema || 'Não informado',
    supportAgent: ticket.agente_suporte ?? null,
    rating: ticket.nota_avaliacao ?? null,
  }
}

function formatTicketDisplayId(ticketId: string) {
  return `TK-${ticketId.slice(0, 8)}`
}

function normalizeTicketSearch(search: string) {
  const trimmedSearch = search.trim()
  return trimmedSearch.toLowerCase().startsWith('tk-') ? trimmedSearch.slice(3) : trimmedSearch
}

export async function getSupportTickets(filters: SupportTicketFilters = {}): Promise<SupportTicket[]> {
  const response = await fetch(`${API_URL}?${buildTicketParams(filters).toString()}`)

  if (!response.ok) {
    throw new Error(`Erro ao buscar tickets: ${response.status}`)
  }

  const result: SupportTicketApiResponse[] = await response.json()
  const customerNames = await getCustomerNamesById(result.map(ticket => ticket.id_cliente))
  return result.map(ticket => mapSupportTicket(ticket, customerNames))
}

export async function getSupportTicketsCount(filters: SupportTicketFilters = {}): Promise<number> {
  const params = buildTicketParams(filters, false)
  const response = await fetch(`${API_URL}/count?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`Erro ao contar tickets: ${response.status}`)
  }

  const result: { total: number } = await response.json()
  return result.total
}

export async function getSupportTicketSummary(): Promise<SupportTicketSummary> {
  const response = await fetch(`${API_URL}/summary`)

  if (!response.ok) {
    throw new Error(`Erro ao buscar resumo de tickets: ${response.status}`)
  }

  const result: SupportTicketSummaryApiResponse = await response.json()

  return {
    total: result.total,
    open: result.open,
    resolved: result.resolved,
    averageResolutionTimeHours: result.average_resolution_time_hours,
    agents: result.agents,
    problemTypes: result.problem_types,
  }
}

function buildTicketParams(filters: SupportTicketFilters, includePagination = true) {
  const params = new URLSearchParams({
    skip: (filters.skip ?? 0).toString(),
    limit: (filters.limit ?? 100).toString(),
  })

  if (!includePagination) {
    params.delete('skip')
    params.delete('limit')
  }

  if (filters.search) params.append('search', normalizeTicketSearch(filters.search))
  if (filters.status && filters.status !== 'all') params.append('status', filters.status)
  if (filters.agent) params.append('agente', filters.agent)
  if (filters.problemType) params.append('tipo', filters.problemType)
  if (filters.startDate) params.append('start_date', filters.startDate)
  if (filters.endDate) params.append('end_date', filters.endDate)

  return params
}

async function getCustomerNamesById(customerIds: string[]) {
  const uniqueCustomerIds = Array.from(new Set(customerIds.filter(Boolean)))
  const customers = await Promise.all(
    uniqueCustomerIds.map(async (customerId) => {
      try {
        const response = await fetch(`${CUSTOMERS_API_URL}/${encodeURIComponent(customerId)}`)

        if (!response.ok) return null

        const customer: CustomerApiResponse = await response.json()
        return [customer.id_cliente, customer.nome_cliente] as const
      } catch (error) {
        console.error(`Erro ao buscar cliente ${customerId}:`, error)
        return null
      }
    })
  )

  return new Map(customers.filter((customer): customer is readonly [string, string] => customer !== null))
}
