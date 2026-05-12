import { useState, useEffect } from 'react'
import { DollarSign, ShoppingBag, ThumbsUp, Users, Truck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { FilterTabs } from './FilterTabs'
import { KPICard } from './KPICard'
import { RevenueChart } from './RevenueChart'
import { SatisfactionChart } from './SatisfactionChart'
import { OperationsChart } from './OperationsChart'
import { QuickActions } from './QuickActions'
import { ChatIADrawer } from './ChatIADrawer'
import type { KpiItem } from '../services/dashboardService'
import { getKpiData } from '../services/dashboardService'

const iconMap: Record<KpiItem['iconName'], LucideIcon> = {
  DollarSign,
  ShoppingBag,
  ThumbsUp,
  Users,
  Truck,
}

export function Dashboard() {
  const [kpiData, setKpiData] = useState<KpiItem[]>([])

  useEffect(() => {
    getKpiData().then(setKpiData)
  }, [])

  return (
    <div className="p-4">
      {/* Title */}
      <h1 className="text-3xl font-bold text-[#020854] dark:text-foreground mb-3">Dashboard</h1>

      {/* Filter Tabs */}
      <FilterTabs />

      {/* Current View Info */}
      <div className="mt-3 mb-4">
        <p className="text-muted text-sm">
          Você está visualizando <span className="font-semibold text-foreground">Últimos 30 Dias</span>
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-4">
        {kpiData.map((kpi) => {
          const Icon = iconMap[kpi.iconName]
          return (
            <KPICard
              key={kpi.title}
              title={kpi.title}
              value={kpi.value}
              change={kpi.change}
              changeLabel={kpi.changeLabel}
              icon={<Icon className={`w-4 h-4 ${kpi.iconColor}`} />}
              iconBgColor={kpi.iconBgColor}
            />
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        <RevenueChart />
        <SatisfactionChart />
      </div>

      {/* Operations Chart and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <OperationsChart />
        <QuickActions />
      </div>

      <ChatIADrawer />
    </div>
  )
}
