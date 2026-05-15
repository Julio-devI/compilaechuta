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
}

export interface FiltrosClientes {
  search?: string;
  status?: string;
  segmento?: string;
  lvtMin?: number;
  lvtMax?: number;
  ticket_min?: number;
  ticket_max?: number;
  data_inicio?: string;
  data_fim?: string;
  regiao?: string;
}

export function getClienteStatusStyle(segmento: string | null | undefined): string {
  if (!segmento) return 'bg-slate-100 text-slate-600 border border-slate-200';
  const s = segmento.toLowerCase();

  if (s.includes('vip')) return 'bg-[#020854] text-white border border-[#020854]';
  if (s.includes('novo')) return 'bg-[#1E5EFF] text-white border border-[#1E5EFF]';
  if (s.includes('inativo') || s.includes('perdido')) return 'bg-slate-100 text-slate-600 border border-slate-200';
  if (s.includes('campeão') || s.includes('campeao')) return 'bg-amber-100 text-amber-700 border border-amber-200';
  if (s.includes('regular') || s.includes('recorrente') || s.includes('potencial') || s.includes('promissor')) return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
  if (s.includes('fiel') || s.includes('leal')) return 'bg-purple-100 text-purple-700 border border-purple-200';
  if (s.includes('risco')) return 'bg-red-100 text-red-700 border border-red-200';

  return 'bg-slate-100 text-slate-600 border border-slate-200'; // Default
}

const API_URL = 'http://localhost:8000/api/v1/clients/'

export async function getClientes(
  skip: number = 0,
  limit: number = 20,
  filtros?: FiltrosClientes
): Promise<{ data: Cliente[], total: number }> {
  try {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });

    if (filtros?.search) params.append('search', filtros.search);
    if (filtros?.status && filtros.status !== 'todos') params.append('status', filtros.status);
    if (filtros?.segmento) params.append('segmento', filtros.segmento);

    if (filtros?.lvtMin !== undefined) params.append('lvt_min', filtros.lvtMin.toString());
    if (filtros?.lvtMax !== undefined) params.append('lvt_max', filtros.lvtMax.toString());

    if (filtros?.ticket_min !== undefined) params.append('ticket_min', filtros.ticket_min.toString());
    if (filtros?.ticket_max !== undefined) params.append('ticket_max', filtros.ticket_max.toString());

    if (filtros?.data_inicio) params.append('data_inicio', filtros.data_inicio);
    if (filtros?.data_fim) params.append('data_fim', filtros.data_fim);
    if (filtros?.regiao) params.append('regiao', filtros.regiao);

    const response = await fetch(`${API_URL}?${params.toString()}`);

    if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
    const result = await response.json();

    const mappedData: Cliente[] = result.data.map((c: any) => {
      const ticketMedioVal = c.qtd_pedidos_realizados > 0 ? c.total_gasto_brl / c.qtd_pedidos_realizados : 0;
      return {
        id: c.id_cliente,
        nome: c.nome_cliente,
        cidade: c.cidade ? `${c.cidade}${c.estado ? `, ${c.estado}` : ''}` : 'Não informada',
        totalPedidos: c.qtd_pedidos_realizados,
        lvtTotal: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.total_gasto_brl),
        ultimoPedido: c.data_ultima_compra ? new Date(c.data_ultima_compra).toLocaleDateString('pt-BR') : 'N/A',
        ticketMedio: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ticketMedioVal),
        estrelas: c.media_estrelas_dadas,
        qtd_tickets_suporte: c.qtd_tickets_suporte,
        segmento: c.segmento_rfm || 'Geral',
        status: c.segmento_rfm || 'Geral',
        tendencia: 'stable'
      }
    });

    return { data: mappedData, total: result.total };
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    return { data: [], total: 0 };
  }
}