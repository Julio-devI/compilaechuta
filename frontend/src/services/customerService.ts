export interface Cliente {
  id: number
  nome: string
  email: string
  telefone: string
  cidade: string
  totalPedidos: number
  lvtTotal: string
  ultimoPedido: string
  ticketMedio: string
  segmento: 'Moda' | 'Eletrônicos'
  status: 'VIP' | 'Recorrente' | '1ª Compra' | 'Inativo'
  avatar: string
  tendencia: 'up' | 'down' | 'stable'
}

export type ClienteStatus = Cliente['status']

export const clienteStatusStyles: Record<ClienteStatus, string> = {
  'VIP': 'bg-[#020854] text-white',
  'Recorrente': 'bg-[#BAE6FD] text-[#0369A1]',
  '1ª Compra': 'bg-[#1E5EFF] text-white',
  'Inativo': 'bg-[#FF4757] text-white',
}

const mockClientes: Cliente[] = [
  { id: 1, nome: 'Marina Albuquerque', email: 'marina@email.com', telefone: '(11) 99999-0000', cidade: 'São Paulo, SP', totalPedidos: 45, lvtTotal: 'R$ 10.540', ultimoPedido: 'R$ 10.540', ticketMedio: 'R$ 250', segmento: 'Moda', status: 'VIP', avatar: 'https://i.pravatar.cc/150?u=1', tendencia: 'up' },
  { id: 2, nome: 'Marina Albuquerque', email: 'marina@email.com', telefone: '(11) 99999-0000', cidade: 'Rio de Janeiro, RJ', totalPedidos: 32, lvtTotal: 'R$ 10.540', ultimoPedido: 'R$ 10.540', ticketMedio: 'R$ 250', segmento: 'Eletrônicos', status: 'Recorrente', avatar: 'https://i.pravatar.cc/150?u=2', tendencia: 'up' },
  { id: 3, nome: 'Marina Albuquerque', email: 'marina@email.com', telefone: '(11) 99999-0000', cidade: 'Belo Horizonte, MG', totalPedidos: 28, lvtTotal: 'R$ 10.540', ultimoPedido: 'R$ 10.540', ticketMedio: 'R$ 250', segmento: 'Moda', status: 'VIP', avatar: 'https://i.pravatar.cc/150?u=3', tendencia: 'stable' },
  { id: 4, nome: 'Marina Albuquerque', email: 'marina@email.com', telefone: '(11) 99999-0000', cidade: 'Curitiba, PR', totalPedidos: 18, lvtTotal: 'R$ 10.540', ultimoPedido: 'R$ 10.540', ticketMedio: 'R$ 250', segmento: 'Moda', status: '1ª Compra', avatar: 'https://i.pravatar.cc/150?u=4', tendencia: 'down' },
  { id: 5, nome: 'Marina Albuquerque', email: 'marina@email.com', telefone: '(11) 99999-0000', cidade: 'Porto Alegre, RS', totalPedidos: 12, lvtTotal: 'R$ 10.540', ultimoPedido: 'R$ 10.540', ticketMedio: 'R$ 250', segmento: 'Eletrônicos', status: 'VIP', avatar: 'https://i.pravatar.cc/150?u=5', tendencia: 'down' },
  { id: 6, nome: 'Marina Albuquerque', email: 'marina@email.com', telefone: '(11) 99999-0000', cidade: 'Salvador, BA', totalPedidos: 56, lvtTotal: 'R$ 10.540', ultimoPedido: 'R$ 10.540', ticketMedio: 'R$ 250', segmento: 'Eletrônicos', status: '1ª Compra', avatar: 'https://i.pravatar.cc/150?u=6', tendencia: 'up' },
  { id: 7, nome: 'Marina Albuquerque', email: 'marina@email.com', telefone: '(11) 99999-0000', cidade: 'Brasília, DF', totalPedidos: 8, lvtTotal: 'R$ 10.540', ultimoPedido: 'R$ 10.540', ticketMedio: 'R$ 250', segmento: 'Moda', status: 'Inativo', avatar: 'https://i.pravatar.cc/150?u=7', tendencia: 'stable' },
]

export async function getClientes(): Promise<Cliente[]> {
  return mockClientes
}
