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
  nome_cliente?: string;
  cidade_cliente?: string;
  estado_cliente?: string;
  segmento_cliente?: string;
  qtd_tickets_cliente?: number;
  media_estrelas_cliente?: number;
  qtd_pedidos_cliente?: number;
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
  id_cliente?: string;
}

import { apiUrl } from './apiConfig'

const API_URL = apiUrl('/orders')

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
    if (filtros?.id_cliente) params.append('id_cliente', filtros.id_cliente);

    const response = await fetch(`${API_URL}/?${params.toString()}`);

    if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
    const result = await response.json();

    // Como já carregamos os dados do cliente no backend via propriedades eager load, não precisamos mais chamar getClientData
    const mappedData: Pedido[] = result.data.map((p: any) => {
        return {
          id: p.id_pedido_display,
          idReal: p.id_pedido, // ID real do banco (necessário para buscar o ticket)
          cliente: p.nome_cliente || p.id_cliente, // Agora usa o nome do cliente que já veio do backend
          cidade: p.cidade_cliente || 'N/A',
          estado: p.estado_cliente || 'N/A',
          produtos: p.quantidade_vendas || 1,
          valor: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor_total_venda || 0),
          data: p.id_data ? new Date(p.id_data).toLocaleDateString('pt-BR') : 'N/A',
          status: p.status || 'No prazo',
          recorrente: p.segmento_cliente?.toLowerCase().includes('recorrente') || false,
          ticket: p.qtd_tickets_cliente || 0,
          tempoAberto: 'N/A',
          progresso: p.status === 'Aprovado' ? 2 : p.status === 'Processando' ? 3 : p.status === 'Reembolsado' ? 1 : 5,
          mediaEstrelas: p.media_estrelas_cliente || 0,
          totalPedidosCliente: p.qtd_pedidos_cliente || 1,
          nomeProduto: p.nome_produto || 'Produto Principal',
          valorUnitario: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor_unitario || 0),
          skuProduto: p.id_produto || 'SKU-001',
          metodo_pagamento: p.metodo_pagamento || 'N/A'
        }
    });

    return { data: mappedData, total: result.total };
  } catch (error) {
    console.error("Erro ao buscar pedidos:", error);
    return { data: [], total: 0 };
  }
}