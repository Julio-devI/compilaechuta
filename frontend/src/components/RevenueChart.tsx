import { useState, useEffect, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp } from 'lucide-react'
import type { ReceitaMensal } from '../services/reportService'
import { getReceitaMensal } from '../services/reportService'
import type { DateRange } from '../services/dashboardService'
import { ChartSkeleton } from './ChartSkeleton'

const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function parsePeriod(value: string) {
  const [year, month] = value.split('-')
  return { year, label: MONTH_SHORT[parseInt(month, 10) - 1] ?? value }
}

interface Props {
  dateRange: DateRange
}

export function RevenueChart({ dateRange }: Props) {
  const [data, setData] = useState<ReceitaMensal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getReceitaMensal(dateRange).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [dateRange.inicio, dateRange.fim])

  const multiYear = useMemo(() => {
    const years = new Set(data.map((d) => d.mes.split('-')[0]))
    return years.size > 1
  }, [data])

  // mostra a cada 6 meses em multi-ano, ou cada mês em view curta
  const tickInterval = multiYear ? 5 : 0

  function formatTick(value: string) {
    const { year, label } = parsePeriod(value)
    return multiYear ? `${label}/${year.slice(2)}` : label
  }

  function formatTooltipLabel(value: string) {
    const { year, label } = parsePeriod(value)
    return multiYear ? `${label}/${year}` : label
  }

  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-3.5 h-3.5 text-muted" />
        <span className="text-xs font-medium text-muted uppercase tracking-wider">Tendências</span>
      </div>
      <h3 className="text-lg font-semibold text-[#020854] dark:text-foreground mb-0.5">Receita por Mês</h3>
      <p className="text-xs text-muted mb-4">Evolução do faturamento no período</p>

      {loading ? (
        <ChartSkeleton height={300} />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1E5EFF" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#1E5EFF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="mes"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 12 }}
              tickFormatter={formatTick}
              interval={tickInterval}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 12 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              width={45}
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '12px' }}
              labelFormatter={formatTooltipLabel}
              formatter={(value) => [
                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value as number),
                'Receita',
              ]}
            />
            <Area
              type="monotone"
              dataKey="receita"
              name="Receita"
              stroke="#1E5EFF"
              strokeWidth={2}
              fill="url(#colorReceita)"
              isAnimationActive={false}
              activeDot={{ r: 5, fill: '#1E5EFF', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
