import { useState, useEffect, useMemo } from 'react'
import { DollarSign, ShoppingBag, ThumbsUp, Users, Truck, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { FilterTabs } from './FilterTabs'
import { KPICard } from './KPICard'
import { RevenueChart } from './RevenueChart'
import { SatisfactionChart } from './SatisfactionChart'
import { OperationsChart } from './OperationsChart'
import { QuickActions } from './QuickActions'
import { CategoryPieChart } from './CategoryPieChart'
import { RegionBarChart } from './RegionBarChart'
import { WeekdayLineChart } from './WeekdayLineChart'
import type { KpiItem, DateRange } from '../services/dashboardService'
import { getKpiData, tabToDateRange } from '../services/dashboardService'

function KPICardSkeleton() {
  return (
    <div className="bg-card rounded-3xl p-3.5 border border-border animate-pulse">
      <div className="flex items-start justify-between mb-2">
        <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-5 w-28 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
      <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
    </div>
  )
}

const iconMap: Record<KpiItem['iconName'], LucideIcon> = {
  DollarSign,
  ShoppingBag,
  ThumbsUp,
  Users,
  Truck,
}

const TAB_LABELS: Record<string, string> = {
  'visao-geral':     'Visão Geral',
  'este-mes':        'Este Mês',
  'ultimos-30-dias': 'Últimos 30 Dias',
  'trimestre':       'Trimestre',
}

export function Dashboard() {
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  const defaultRange = useMemo(() => tabToDateRange('ultimos-30-dias'), [])
  const [activeTab, setActiveTab] = useState('ultimos-30-dias')
  const [startDate, setStartDate] = useState(defaultRange.inicio)
  const [endDate, setEndDate] = useState(defaultRange.fim)
  const [kpiData, setKpiData] = useState<KpiItem[]>([])
  const [kpiLoading, setKpiLoading] = useState(true)

  // dateRange é sempre derivado dos inputs — sem lógica condicional
  const dateRange: DateRange = useMemo(
    () => ({ inicio: startDate, fim: endDate }),
    [startDate, endDate]
  )

  useEffect(() => {
    setKpiLoading(true)
    getKpiData(dateRange).then((d) => {
      setKpiData(d)
      setKpiLoading(false)
    })
  }, [dateRange.inicio, dateRange.fim])

  // clicar num tab popula os inputs automaticamente
  function handleTabChange(tabId: string) {
    const range = tabToDateRange(tabId)
    setActiveTab(tabId)
    setStartDate(range.inicio)
    setEndDate(range.fim)
  }

  // editar manualmente deseleciona o tab
  function handleStartChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    if (!val || val > today) return
    setStartDate(val)
    setActiveTab('')
    if (endDate && val > endDate) setEndDate(today)
  }

  function handleEndChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    if (!val || val > today) return
    if (startDate && val < startDate) return
    setEndDate(val)
    setActiveTab('')
  }

  // limpar volta ao tab padrão
  function clearCustomDates() {
    handleTabChange('ultimos-30-dias')
  }

  const isCustomActive = activeTab === ''

  const COMPARISON_LABELS: Record<string, string> = {
    'visao-geral':     'período anterior',
    'este-mes':        'mês anterior',
    'ultimos-30-dias': '30 dias anteriores',
    'trimestre':       'trimestre anterior',
  }
  const comparisonLabel = COMPARISON_LABELS[activeTab] ?? 'período anterior'

  const kpiDataLabeled = useMemo(
    () => kpiData.map((kpi) => ({ ...kpi, changeLabel: comparisonLabel })),
    [kpiData, comparisonLabel]
  )

  const periodLabel = isCustomActive
    ? `${new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')} — ${new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')}`
    : TAB_LABELS[activeTab] ?? activeTab

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#020854] dark:text-foreground mb-3">Dashboard</h1>

        {/* Tabs + date range picker na mesma linha */}
        <div className="flex flex-wrap items-center gap-3">
          <FilterTabs
            activeTab={isCustomActive ? '' : activeTab}
            onTabChange={handleTabChange}
          />

          {/* Separador visual */}
          <div className="h-6 w-px bg-border hidden sm:block" />

          {/* Date range picker */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              max={today}
              onChange={handleStartChange}
              className="px-3 py-1.5 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#1E5EFF]/30 cursor-pointer"
            />
            <span className="text-muted text-sm">até</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              max={today}
              onChange={handleEndChange}
              className="px-3 py-1.5 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#1E5EFF]/30 cursor-pointer"
            />
            {isCustomActive && (
              <button
                onClick={clearCustomDates}
                className="p-1.5 rounded-lg hover:bg-danger-light text-muted hover:text-danger transition-colors"
                title="Limpar datas"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <p className="text-muted text-sm mt-2">
          Visualizando{' '}
          <span className="font-semibold text-foreground">{periodLabel}</span>
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {kpiLoading
          ? Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />)
          : kpiDataLabeled.map((kpi) => {
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

      {/* Row 1: AreaChart Receita (2/3) + PieChart Categorias (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RevenueChart dateRange={dateRange} />
        </div>
        <CategoryPieChart dateRange={dateRange} />
      </div>

      {/* Row 2: Clientes por Região (1/2) + Pedidos por Dia (1/2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RegionBarChart />
        <WeekdayLineChart dateRange={dateRange} />
      </div>

      {/* Row 3: Operations (2/3) + Satisfaction (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <OperationsChart dateRange={dateRange} />
        </div>
        <SatisfactionChart dateRange={dateRange} />
      </div>

      <QuickActions dateRange={dateRange} />
    </div>
  )
}
