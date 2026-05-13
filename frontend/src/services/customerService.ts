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
  status: 'VIP' | 'Recorrente' | 'Novo Cliente' | 'Inativo' | 'Campeao'
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
}

export type ClienteStatus = Cliente['status']

export const clienteStatusStyles: Record<ClienteStatus, string> = {
  'VIP': 'bg-[#020854] text-white',
  'Recorrente': 'bg-[#BAE6FD] text-[#0369A1]',
  'Novo Cliente': 'bg-[#1E5EFF] text-white',
  'Inativo': 'bg-[#FF4757] text-white',
  'Campeao': 'bg-[#FF4757] text-white'
}

const API_URL = 'http://localhost:8000/clientes'

function mapSegmentoToStatus(segmento: string | null): ClienteStatus {
  if (!segmento) return 'Novo Cliente';
  const s = segmento.toLowerCase();
  if (s.includes('campe') || s.includes('leal') || s.includes('vip')) return 'VIP';
  if (s.includes('potencial') || s.includes('promissor') || s.includes('recorrente')) return 'Recorrente';
  if (s.includes('hibernando') || s.includes('risco') || s.includes('perdido')) return 'Inativo';
  return 'Novo Cliente';
}

export async function getClientes(
  skip: number = 0,
  limit: number = 20,
  filtros?: FiltrosClientes // Novo parâmetro
): Promise<{ data: Cliente[], total: number }> {
  try {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });

    if (filtros?.search) params.append('search', filtros.search);
    if (filtros?.status && filtros.status !== 'todos') params.append('status', filtros.status);
    if (filtros?.segmento) params.append('segmento', filtros.segmento);
    if (filtros?.ticket_min !== undefined) params.append('ticket_min', filtros.ticket_min.toString());
    if (filtros?.ticket_max !== undefined) params.append('ticket_max', filtros.ticket_max.toString());

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
        status: mapSegmentoToStatus(c.segmento_rfm),
        tendencia: 'stable'
      }
    });

    return { data: mappedData, total: result.total };
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    return { data: [], total: 0 };
  }
}
