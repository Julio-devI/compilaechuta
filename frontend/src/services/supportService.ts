export interface Ticket {
  id: string
  assunto: string
  cliente: string
  email: string
  categoria: 'duvida' | 'problema' | 'solicitacao' | 'reclamacao'
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
  status: 'aberto' | 'em_andamento' | 'aguardando' | 'resolvido'
  dataCriacao: string
  ultimaAtualizacao: string
  avatar: string
  mensagens: number
  id_pedido?: string
  dataAberturaRaw?: string
  dataResolucaoRaw?: string
}

export type TicketStatus = Ticket['status']
export type TicketPrioridade = Ticket['prioridade']
export type TicketCategoria = Ticket['categoria']

export const ticketStatusConfig: Record<TicketStatus, { color: string; label: string }> = {
  aberto:       { color: 'bg-[#1E5EFF]/10 text-[#1E5EFF]',  label: 'Aberto' },
  em_andamento: { color: 'bg-[#FFD60A]/10 text-[#B8860B]',  label: 'Em Andamento' },
  aguardando:   { color: 'bg-[#8B5CF6]/10 text-[#8B5CF6]',  label: 'Aguardando' },
  resolvido:    { color: 'bg-[#00C48C]/10 text-[#00C48C]',  label: 'Resolvido' },
}

export const ticketPrioridadeConfig: Record<TicketPrioridade, { color: string; label: string }> = {
  baixa:   { color: 'bg-[#64748B]/10 text-muted',           label: 'Baixa' },
  media:   { color: 'bg-[#1E5EFF]/10 text-[#1E5EFF]',       label: 'Média' },
  alta:    { color: 'bg-[#FFD60A]/10 text-[#B8860B]',        label: 'Alta' },
  urgente: { color: 'bg-[#FF4757]/10 text-[#FF4757]',        label: 'Urgente' },
}

export const ticketCategoriaConfig: Record<TicketCategoria, { icon: string; label: string }> = {
  duvida:     { icon: '❓', label: 'Dúvida' },
  problema:   { icon: '⚠️', label: 'Problema' },
  solicitacao: { icon: '📝', label: 'Solicitação' },
  reclamacao: { icon: '😤', label: 'Reclamação' },
}

const API_URL = 'http://localhost:8000/api/v1/tickets'

export async function getTicketPorPedido(id_pedido: string): Promise<Ticket | null> {
  try {
    const response = await fetch(`${API_URL}/pedido/${encodeURIComponent(id_pedido)}`);
    if (!response.ok) {
      if (response.status === 404) return null; // Nenhum ticket para este pedido
      throw new Error(`Erro na API: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Mapeia do backend TicketOut para a interface do frontend
    return {
      id: data.id_ticket?.substring(0, 8).toUpperCase() || '#TKT-N/A', // O backend retorna um UUID, vamos pegar um pedaço
      assunto: data.tipo_problema || 'Dúvida/Suporte',
      cliente: data.id_cliente,
      email: 'N/A',
      categoria: 'problema',
      prioridade: data.status === 'aberto' ? 'alta' : 'baixa',
      status: data.status === 'aberto' ? 'aberto' : 'resolvido',
      dataCriacao: data.data_abertura ? new Date(data.data_abertura).toLocaleDateString('pt-BR') : 'N/A',
      ultimaAtualizacao: data.data_resolucao ? new Date(data.data_resolucao).toLocaleDateString('pt-BR') : 'N/A',
      avatar: 'N/A',
      mensagens: 1,
      id_pedido: data.id_pedido,
      dataAberturaRaw: data.data_abertura,
      dataResolucaoRaw: data.data_resolucao
    };
  } catch (error) {
    console.error("Erro ao buscar ticket do pedido:", error);
    return null;
  }
}

const mockTickets: Ticket[] = [
  { id: '#TKT-001234', assunto: 'Problema com entrega do pedido', cliente: 'Maria Silva',    email: 'maria.silva@email.com',    categoria: 'problema',   prioridade: 'alta',    status: 'em_andamento', dataCriacao: '18/01/2024 14:32', ultimaAtualizacao: '2 horas atrás', avatar: 'MS', mensagens: 5 },
  { id: '#TKT-001235', assunto: 'Dúvida sobre política de troca', cliente: 'João Santos',    email: 'joao.santos@email.com',    categoria: 'duvida',     prioridade: 'baixa',   status: 'aberto',       dataCriacao: '18/01/2024 13:15', ultimaAtualizacao: '3 horas atrás', avatar: 'JS', mensagens: 2 },
  { id: '#TKT-001236', assunto: 'Solicitação de reembolso',       cliente: 'Ana Oliveira',   email: 'ana.oliveira@email.com',   categoria: 'solicitacao', prioridade: 'media',  status: 'aguardando',   dataCriacao: '18/01/2024 11:45', ultimaAtualizacao: '5 horas atrás', avatar: 'AO', mensagens: 8 },
  { id: '#TKT-001237', assunto: 'Produto com defeito',            cliente: 'Carlos Ferreira', email: 'carlos.ferreira@email.com', categoria: 'reclamacao', prioridade: 'urgente', status: 'em_andamento', dataCriacao: '18/01/2024 10:20', ultimaAtualizacao: '1 hora atrás',  avatar: 'CF', mensagens: 12 },
  { id: '#TKT-001238', assunto: 'Atualização de cadastro',        cliente: 'Beatriz Lima',   email: 'beatriz.lima@email.com',   categoria: 'solicitacao', prioridade: 'baixa',  status: 'resolvido',    dataCriacao: '17/01/2024 18:50', ultimaAtualizacao: '1 dia atrás',   avatar: 'BL', mensagens: 3 },
  { id: '#TKT-001239', assunto: 'Dificuldade no pagamento',       cliente: 'Roberto Costa',  email: 'roberto.costa@email.com',  categoria: 'problema',   prioridade: 'alta',    status: 'aberto',       dataCriacao: '17/01/2024 16:30', ultimaAtualizacao: '4 horas atrás', avatar: 'RC', mensagens: 1 },
]

export async function getTickets(): Promise<Ticket[]> {
  return mockTickets
}