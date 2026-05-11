export interface Pedido {
  id: string
  cliente: string
  produtos: number
  valor: string
  data: string
  status: 'pendente' | 'processando' | 'enviado' | 'entregue' | 'cancelado'
  pagamento: 'pix' | 'cartao' | 'boleto'
  avatar: string
}

export type PedidoStatus = Pedido['status']
export type PedidoPagamento = Pedido['pagamento']

export interface StatusConfigItem {
  color: string
  iconName: string
  label: string
}

export const pedidoStatusConfig: Record<PedidoStatus, StatusConfigItem> = {
  pendente:    { color: 'bg-[#FFD60A]/10 text-[#B8860B]', iconName: 'Clock',       label: 'Pendente' },
  processando: { color: 'bg-[#1E5EFF]/10 text-[#1E5EFF]', iconName: 'Package',     label: 'Processando' },
  enviado:     { color: 'bg-[#8B5CF6]/10 text-[#8B5CF6]', iconName: 'Truck',       label: 'Enviado' },
  entregue:    { color: 'bg-[#00C48C]/10 text-[#00C48C]', iconName: 'CheckCircle', label: 'Entregue' },
  cancelado:   { color: 'bg-[#FF4757]/10 text-[#FF4757]', iconName: 'XCircle',     label: 'Cancelado' },
}

export const pagamentoLabels: Record<PedidoPagamento, string> = {
  pix:    'PIX',
  cartao: 'Cartão',
  boleto: 'Boleto',
}

const mockPedidos: Pedido[] = [
  { id: '#PED-001234', cliente: 'Maria Silva',     produtos: 3, valor: 'R$ 459,90',   data: '18/01/2024 14:32', status: 'entregue',    pagamento: 'pix',    avatar: 'MS' },
  { id: '#PED-001235', cliente: 'João Santos',     produtos: 1, valor: 'R$ 189,00',   data: '18/01/2024 13:15', status: 'enviado',     pagamento: 'cartao', avatar: 'JS' },
  { id: '#PED-001236', cliente: 'Ana Oliveira',    produtos: 5, valor: 'R$ 892,50',   data: '18/01/2024 11:45', status: 'processando', pagamento: 'cartao', avatar: 'AO' },
  { id: '#PED-001237', cliente: 'Carlos Ferreira', produtos: 2, valor: 'R$ 328,00',   data: '18/01/2024 10:20', status: 'pendente',    pagamento: 'boleto', avatar: 'CF' },
  { id: '#PED-001238', cliente: 'Beatriz Lima',    produtos: 4, valor: 'R$ 1.245,00', data: '17/01/2024 18:50', status: 'entregue',    pagamento: 'pix',    avatar: 'BL' },
  { id: '#PED-001239', cliente: 'Roberto Costa',   produtos: 1, valor: 'R$ 99,90',    data: '17/01/2024 16:30', status: 'cancelado',   pagamento: 'cartao', avatar: 'RC' },
  { id: '#PED-001240', cliente: 'Fernanda Alves',  produtos: 6, valor: 'R$ 1.567,80', data: '17/01/2024 14:15', status: 'enviado',     pagamento: 'pix',    avatar: 'FA' },
  { id: '#PED-001241', cliente: 'Pedro Mendes',    produtos: 2, valor: 'R$ 445,00',   data: '17/01/2024 11:00', status: 'entregue',    pagamento: 'cartao', avatar: 'PM' },
]

export async function getPedidos(): Promise<Pedido[]> {
  return mockPedidos
}
