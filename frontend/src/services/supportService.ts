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
