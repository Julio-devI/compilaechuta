export interface PedidoBackend {
  id_pedido_display: string;
  id_pedido: string;
  id_cliente: string;
  id_produto: string;
  nome_produto: string;
  id_data?: string;
  quantidade_vendas?: number;
  valor_unitario?: number;
  valor_total_venda?: number;
  status?: string;
  metodo_pagamento?: string;
}

export interface Pedido {
  id: string
  idReal: string
  cliente: string
  cidade: string
  estado: string
  produtos: number
  valor: string
  data: string
  status: 'Atrasado' | 'No prazo' | string
  recorrente: boolean
  ticket: number
  tempoAberto: string
  progresso: number
  mediaEstrelas: number
  totalPedidosCliente: number
  nomeProduto: string
  valorUnitario: string
  skuProduto: string
  metodo_pagamento: string
}

export interface FiltrosPedidos {
  status?: string;
  id_produto?: string;
  id_pedido_display?: string;
  data_inicio?: string;
  data_fim?: string;
  tipo_cliente?: string;
  nome_produto?: string;
  status_ticket?: string;
}

const API_URL = 'http://localhost:8000/api/v1/orders'
const CLIENT_API_URL = 'http://localhost:8000/api/v1/clients'

// Cache local simples para evitar múltiplas chamadas à API pelo mesmo cliente
const clientCache = new Map<string, any>();

async function getClientData(id_cliente: string) {
  if (clientCache.has(id_cliente)) {
    return clientCache.get(id_cliente);
  }
  
  try {
    const response = await fetch(`${CLIENT_API_URL}/${id_cliente}`);
    if (response.ok) {
      const data = await response.json();
      clientCache.set(id_cliente, data);
      return data;
    }
  } catch (error) {
    console.error(`Erro ao buscar dados do cliente ${id_cliente}:`, error);
  }
  
  return null;
}

export async function getPedidos(
  skip: number = 0,
  limit: number = 20,
  filtros?: FiltrosPedidos
): Promise<{ data: Pedido[], total: number }> {
  try {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });

    if (filtros?.status) params.append('status', filtros.status);
    if (filtros?.id_produto) params.append('id_produto', filtros.id_produto);
    if (filtros?.id_pedido_display) params.append('id_pedido_display', filtros.id_pedido_display);
    if (filtros?.data_inicio) params.append('data_inicio', filtros.data_inicio);
    if (filtros?.data_fim) params.append('data_fim', filtros.data_fim);
    if (filtros?.tipo_cliente) params.append('tipo_cliente', filtros.tipo_cliente);
    if (filtros?.nome_produto) params.append('nome_produto', filtros.nome_produto);
    if (filtros?.status_ticket) params.append('status_ticket', filtros.status_ticket);

    const response = await fetch(`${API_URL}/?${params.toString()}`);

    if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
    const result = await response.json();

    // Como getClientData é assíncrono, usaremos Promise.all
    const mappedData: Pedido[] = await Promise.all(
      result.data.map(async (p: any) => {
        
        // Busca os dados adicionais do cliente para exibir na interface
        const clientData = await getClientData(p.id_cliente);
        
        return {
          id: p.id_pedido_display,
          idReal: p.id_pedido, // ID real do banco (necessário para buscar o ticket)
          cliente: clientData?.nome_cliente || p.id_cliente, // Agora usa o nome do cliente se existir
          cidade: clientData?.cidade || 'N/A',
          estado: clientData?.estado || 'N/A',
          produtos: p.quantidade_vendas || 1,
          valor: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor_total_venda || 0),
          data: p.id_data ? new Date(p.id_data).toLocaleDateString('pt-BR') : 'N/A',
          status: p.status || 'No prazo',
          recorrente: clientData?.segmento_rfm?.toLowerCase().includes('recorrente') || false,
          ticket: clientData?.qtd_tickets_suporte || 0,
          tempoAberto: 'N/A',
          progresso: p.status === 'Aprovado' ? 2 : p.status === 'Processando' ? 3 : p.status === 'Reembolsado' ? 1 : 5,
          mediaEstrelas: clientData?.media_estrelas_dadas || 0,
          totalPedidosCliente: clientData?.qtd_pedidos_realizados || 1,
          nomeProduto: p.nome_produto || 'Produto Principal',
          valorUnitario: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor_unitario || 0),
          skuProduto: p.id_produto || 'SKU-001',
          metodo_pagamento: p.metodo_pagamento || 'N/A'
        }
      })
    );

    return { data: mappedData, total: result.total };
  } catch (error) {
    console.error("Erro ao buscar pedidos:", error);
    return { data: [], total: 0 };
  }
}