import { DollarSign, ShoppingBag, ThumbsUp, Users, Truck } from 'lucide-react'
import { FilterTabs } from './FilterTabs'
import { KPICard } from './KPICard'
import { RevenueChart } from './RevenueChart'
import { SatisfactionChart } from './SatisfactionChart'
import { OperationsChart } from './OperationsChart'
import { QuickActions } from './QuickActions' // Import the new component

const kpiData = [
  {
    title: 'Receita total',
    value: 'R$ 350k',
    change: 3.14,
    changeLabel: 'mês passado',
    icon: <DollarSign className="w-6 h-6 text-[#1E5EFF]" />,
    iconBgColor: 'bg-[#EBF1FF]',
  },
  {
    title: 'Pedidos',
    value: '310.000',
    change: 0.14,
    changeLabel: 'mês passado',
    icon: <ShoppingBag className="w-6 h-6 text-[#00C48C]" />,
    iconBgColor: 'bg-[#E6F9F3]',
  },
  {
    title: 'CSTA Promotores',
    value: '70%',
    change: -0.21,
    changeLabel: 'mês passado',
    icon: <ThumbsUp className="w-6 h-6 text-[#FFD60A]" />,
    iconBgColor: 'bg-[#FFF9E6]',
  },
  {
    title: 'Clientes Ativos',
    value: '50.859',
    change: 0.21,
    changeLabel: 'mês passado',
    icon: <Users className="w-6 h-6 text-[#1E5EFF]" />,
    iconBgColor: 'bg-[#EBF1FF]',
  },
  {
    title: 'Entregas no Prazo',
    value: '87,6%',
    change: -0.2,
    changeLabel: 'mês passado',
    icon: <Truck className="w-6 h-6 text-[#FF4757]" />,
    iconBgColor: 'bg-[#FFE8EA]',
  },
]

export function Dashboard() {
  return (
    <div className="p-6">
      {/* Title */}
      <h1 className="text-5xl font-bold text-[#020854] mb-6">Dashboard</h1>

      {/* Filter Tabs */}
      <FilterTabs />

      {/* Current View Info */}
      <div className="mt-6 mb-8">
        <p className="text-muted">
          Você está visualizando <span className="font-semibold text-foreground">Últimos 30 Dias</span>
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {kpiData.map((kpi) => (
          <KPICard key={kpi.title} {...kpi} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <RevenueChart />
        <SatisfactionChart />
      </div>

      {/* Operations Chart and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <OperationsChart />
        <QuickActions /> {/* Added the new QuickActions component here */}
      </div>
    </div>
  )
}
