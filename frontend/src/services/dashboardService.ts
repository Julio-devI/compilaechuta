export interface KpiItem {
  title: string
  value: string
  change: number
  changeLabel: string
  iconName: 'DollarSign' | 'ShoppingBag' | 'ThumbsUp' | 'Users' | 'Truck'
  iconColor: string
  iconBgColor: string
}

export interface FilterTab {
  id: string
  label: string
}

export interface QuickAction {
  iconName: 'Package' | 'Users' | 'Download' | 'Lightbulb'
  label: string
  subLabel: string
  iconColor: string
  bgColor: string
}

export interface RevenueDataPoint {
  month: string
  value: number
  active: boolean
}

export interface SatisfactionItem {
  name: string
  value: number
  color: string
}

export interface OperationsDataPoint {
  status: string
  'Dentro do prazo': number
  'Fora do prazo': number
}

const mockKpiData: KpiItem[] = [
  { title: 'Receita total',    value: 'R$ 350k',  change: 3.14,  changeLabel: 'mês passado', iconName: 'DollarSign', iconColor: 'text-[#1E5EFF]', iconBgColor: 'bg-primary-light' },
  { title: 'Pedidos',          value: '310.000',  change: 0.14,  changeLabel: 'mês passado', iconName: 'ShoppingBag', iconColor: 'text-success',  iconBgColor: 'bg-success-light' },
  { title: 'CSTA Promotores',  value: '70%',      change: -0.21, changeLabel: 'mês passado', iconName: 'ThumbsUp',   iconColor: 'text-warning',  iconBgColor: 'bg-warning-light' },
  { title: 'Clientes Ativos',  value: '50.859',   change: 0.21,  changeLabel: 'mês passado', iconName: 'Users',      iconColor: 'text-primary',  iconBgColor: 'bg-primary-light' },
  { title: 'Entregas no Prazo', value: '87,6%',   change: -0.2,  changeLabel: 'mês passado', iconName: 'Truck',      iconColor: 'text-danger',   iconBgColor: 'bg-danger-light' },
]

const mockFilterTabs: FilterTab[] = [
  { id: 'visao-geral',     label: 'Visão Geral' },
  { id: 'este-mes',        label: 'Este Mês' },
  { id: 'ultimos-30-dias', label: 'Últimos 30 Dias' },
  { id: 'trimestre',       label: 'Trimestre' },
  { id: 'por-categoria',   label: 'Por Categoria' },
  { id: 'escolher-outro',  label: 'Escolher outro' },
]

const mockQuickActions: QuickAction[] = [
  { iconName: 'Package',   label: 'Pedidos atrasados',            subLabel: '12',             iconColor: 'text-[#FF3B3B]', bgColor: 'bg-[#FF3B3B]/10' },
  { iconName: 'Users',     label: 'Clientes com tickets abertos', subLabel: '5',              iconColor: 'text-[#FFCC00]', bgColor: 'bg-[#FFCC00]/20' },
  { iconName: 'Download',  label: 'Exportar CSV',                 subLabel: 'Mês atual',      iconColor: 'text-[#0070DB]', bgColor: 'bg-[#0070DB]/10' },
  { iconName: 'Lightbulb', label: 'Insights de IA',               subLabel: 'Info explaining more', iconColor: 'text-white', bgColor: 'bg-linear-to-b from-[#60A5FA] to-[#1E5EFF]' },
]

const mockRevenueData: RevenueDataPoint[] = [
  { month: 'Jan', value: 200, active: false },
  { month: 'Fev', value: 400, active: false },
  { month: 'Mar', value: 90,  active: false },
  { month: 'Abr', value: 110, active: false },
  { month: 'Mai', value: 450, active: false },
  { month: 'Jun', value: 150, active: false },
  { month: 'Jul', value: 200, active: true },
  { month: 'Ago', value: 300, active: false },
  { month: 'Set', value: 400, active: false },
  { month: 'Out', value: 200, active: false },
  { month: 'Nov', value: 600, active: false },
  { month: 'Dez', value: 720, active: false },
]

const mockSatisfactionData: SatisfactionItem[] = [
  { name: 'Promotores', value: 70, color: '#1E5EFF' },
  { name: 'Neutros',    value: 18, color: '#FFD60A' },
  { name: 'Detratores', value: 12, color: '#FF4757' },
]

const mockOperationsData: OperationsDataPoint[] = [
  { status: 'Comprados',       'Dentro do prazo': 5000,  'Fora do prazo': 500 },
  { status: 'Em Processamento', 'Dentro do prazo': 3000, 'Fora do prazo': 2000 },
  { status: 'Enviados',        'Dentro do prazo': 4000,  'Fora do prazo': 3000 },
  { status: 'Em trânsito',     'Dentro do prazo': 6000,  'Fora do prazo': 2000 },
  { status: 'Entregues',       'Dentro do prazo': 10000, 'Fora do prazo': 0 },
]

export async function getKpiData(): Promise<KpiItem[]> {
  return mockKpiData
}

export async function getFilterTabs(): Promise<FilterTab[]> {
  return mockFilterTabs
}

export async function getQuickActions(): Promise<QuickAction[]> {
  return mockQuickActions
}

export async function getRevenueData(): Promise<RevenueDataPoint[]> {
  return mockRevenueData
}

export async function getSatisfactionData(): Promise<SatisfactionItem[]> {
  return mockSatisfactionData
}

export async function getOperationsData(): Promise<OperationsDataPoint[]> {
  return mockOperationsData
}
