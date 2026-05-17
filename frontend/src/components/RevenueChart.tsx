import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp } from 'lucide-react'
import type { RevenueDataPoint } from '../services/dashboardService'
import { getRevenueData } from '../services/dashboardService'

interface Props {
  tabId?: string
}

export function RevenueChart({ tabId = 'ultimos-30-dias' }: Props) {
  const [data, setData] = useState<RevenueDataPoint[]>([])

  useEffect(() => {
    getRevenueData(tabId).then(setData)
  }, [tabId])

  const maxValue = Math.max(...data.map((d) => d.value), 1)
  const yMax = Math.ceil(maxValue * 1.15)

  return (
    <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-3.5 h-3.5 text-muted" />
        <span className="text-xs font-medium text-muted uppercase tracking-wider">Tendências</span>
      </div>
      <h3 className="text-lg font-semibold text-[#020854] dark:text-foreground mb-0.5">Média de Receita por Mês</h3>
      <p className="text-xs text-muted mb-3">Evolução de Faturamento — clique para detalhar</p>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="10%" margin={{ top: 5, right: 5 }}>
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 12 }}
            />
            <YAxis
              type="number"
              domain={[0, yMax]}
              tickFormatter={(value) => `${value}k`}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 12 }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.active ? '#0D47A1' : '#1E5EFF'}
                  opacity={entry.value === 0 ? 0.2 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
