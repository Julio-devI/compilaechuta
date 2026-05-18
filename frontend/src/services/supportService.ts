export interface SupportTicket {
  ticketId: string;
  ticketDisplayId: string;
  customerId: string;
  customerName: string;
  orderId: string | null;
  productId: string | null;
  openedAt: string;
  resolvedAt: string | null;
  resolutionTimeHours: number | null;
  status: "aberto" | "resolvido";
  problemType: string;
  supportAgent: string | null;
  rating: number | null;
}

export interface SupportTicketFilters {
  search?: string;
  status?: string;
  agent?: string;
  problemType?: string;
  startDate?: string;
  endDate?: string;
  skip?: number;
  limit?: number;
  customer_id?: string;
}

export interface SupportTicketSummary {
  total: number;
  open: number;
  resolved: number;
  averageResolutionTimeHours: number;
  agents: string[];
  problemTypes: string[];
}

interface SupportTicketApiResponse {
  id_ticket: string;
  id_cliente: string;
  nome_cliente?: string | null;
  id_pedido?: string | null;
  id_pedido_display?: string | null;
  id_produto?: string | null;
  data_abertura?: string | null;
  data_resolucao?: string | null;
  tempo_resolucao_horas?: number | null;
  status?: "aberto" | "resolvido" | null;
  tipo_problema?: string | null;
  agente_suporte?: string | null;
  nota_avaliacao?: number | null;
}

interface SupportTicketSummaryApiResponse {
  total: number;
  open: number;
  resolved: number;
  average_resolution_time_hours: number;
  agents: string[];
  problem_types: string[];
}

const API_URL = "http://localhost:8000/api/v1/tickets";

function mapSupportTicket(ticket: SupportTicketApiResponse): SupportTicket {
  const customerName = ticket.nome_cliente || ticket.id_cliente;

  return {
    ticketId: ticket.id_ticket,
    ticketDisplayId: formatTicketDisplayId(ticket.id_ticket),
    customerId: ticket.id_cliente,
    customerName,
    orderId: ticket.id_pedido_display ?? ticket.id_pedido ?? null,
    productId: ticket.id_produto ?? null,
    openedAt: ticket.data_abertura || "",
    resolvedAt: ticket.data_resolucao ?? null,
    resolutionTimeHours: ticket.tempo_resolucao_horas ?? null,
    status: ticket.status || "aberto",
    problemType: ticket.tipo_problema || "Não informado",
    supportAgent: ticket.agente_suporte ?? null,
    rating: ticket.nota_avaliacao ?? null,
  };
}

function formatTicketDisplayId(ticketId: string) {
  return `TK-${ticketId.slice(0, 8)}`;
}

function normalizeTicketSearch(search: string) {
  return (
    search
      .toLowerCase()
      .trim()

      // remove espaços
      .replace(/\s+/g, "")

      // remove separadores
      .replace(/[-_]/g, "")

      // remove prefixos conhecidos apenas no início
      .replace(/^ticket/, "")
      .replace(/^tk/, "")
      .replace(/^t(?=\d)/, "")
  );
}

export type Ticket = {
  id: string;
  status: "aberto" | "resolvido" | "em_andamento" | string;
  prioridade: string;
  assunto: string;
  dataAberturaRaw: string | null;
  dataResolucaoRaw: string | null;
};

export async function getTicketPorPedido(
  idPedido: string,
): Promise<Ticket | null> {
  const response = await fetch(
    `${API_URL}/pedido/${encodeURIComponent(idPedido)}`,
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Erro ao buscar ticket por pedido: ${response.status}`);
  }

  const result = await response.json();

  return {
    id: result.id_ticket,
    status: result.status || "aberto",
    prioridade: "normal",
    assunto: result.tipo_problema || "Ticket de suporte",
    dataAberturaRaw: result.data_abertura ?? null,
    dataResolucaoRaw: result.data_resolucao ?? null,
  };
}

export async function getSupportTickets(
  filters: SupportTicketFilters = {},
): Promise<SupportTicket[]> {
  const response = await fetch(
    `${API_URL}?${buildTicketParams(filters).toString()}`,
  );

  if (!response.ok) {
    throw new Error(`Erro ao buscar tickets: ${response.status}`);
  }

  const result: SupportTicketApiResponse[] = await response.json();
  return result.map(mapSupportTicket);
}

export async function getSupportTicketsCount(
  filters: SupportTicketFilters = {},
): Promise<number> {
  const params = buildTicketParams(filters, false);
  const response = await fetch(`${API_URL}/count?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Erro ao contar tickets: ${response.status}`);
  }

  const result: { total: number } = await response.json();
  return result.total;
}

export async function getSupportTicketSummary(): Promise<SupportTicketSummary> {
  const response = await fetch(`${API_URL}/summary`);

  if (!response.ok) {
    throw new Error(`Erro ao buscar resumo de tickets: ${response.status}`);
  }

  const result: SupportTicketSummaryApiResponse = await response.json();

  return {
    total: result.total,
    open: result.open,
    resolved: result.resolved,
    averageResolutionTimeHours: result.average_resolution_time_hours,
    agents: result.agents,
    problemTypes: result.problem_types,
  };
}

function buildTicketParams(
  filters: SupportTicketFilters,
  includePagination = true,
) {
  const params = new URLSearchParams({
    skip: (filters.skip ?? 0).toString(),
    limit: (filters.limit ?? 100).toString(),
  });

  if (!includePagination) {
    params.delete("skip");
    params.delete("limit");
  }

  if (filters.search)
    params.append("search", normalizeTicketSearch(filters.search));
  if (filters.status && filters.status !== "all")
    params.append("status", filters.status);
  if (filters.agent) params.append("agente", filters.agent);
  if (filters.problemType) params.append("tipo", filters.problemType);
  if (filters.startDate) params.append("start_date", filters.startDate);
  if (filters.endDate) params.append("end_date", filters.endDate);
  if (filters.customer_id) params.append("id_cliente", filters.customer_id);

  return params;
}

// The API already returns nome_cliente for each ticket, so no extra customer fetch is needed.
