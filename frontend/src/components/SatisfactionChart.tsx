import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Users } from 'lucide-react'
import type { SatisfactionItem } from '../services/dashboardService'
import { getSatisfactionData } from '../services/dashboardService'
import type { DateRange } from '../services/dashboardService'
import { ChartSkeleton } from './ChartSkeleton'

interface Props {
  dateRange: DateRange
}

export function SatisfactionChart({ dateRange }: Props) {
  const [data, setData] = useState<SatisfactionItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getSatisfactionData(dateRange).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [dateRange.inicio, dateRange.fim])

  const barChartData =
    data.length > 0
      ? [{ category: 'Satisfação', Promotores: data[0].value, Neutros: data[1].value, Detratores: data[2].value }]
      : []

  return (
    <div
      className="flex flex-col items-start p-4 gap-1.5 rounded-3xl bg-card border border-border h-full"
      style={{ boxShadow: '0 4px 24px -8px rgba(2, 2, 85, 0.08)' }}
    >
      <div className="flex items-center gap-2">
        <Users className="w-3.5 h-3.5 text-muted" />
        <span className="text-xs font-medium text-muted uppercase tracking-wider">Clientes</span>
      </div>
      <h3 className="text-lg font-semibold text-[#020854] dark:text-foreground">Taxa de Satisfação</h3>
      <p className="text-xs text-muted">Distribuição NPS do período</p>

      {loading ? (
        <div className="w-full">
          <ChartSkeleton height={100} variant="horizontal" />
          <div className="animate-pulse flex gap-3 mt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-1 h-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                <XAxis type="number" tickFormatter={(value) => `${value}%`} domain={[0, 100]} hide />
                <YAxis type="category" dataKey="category" hide />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="Promotores" stackId="a" fill={data[0]?.color ?? '#1E5EFF'} radius={[12, 0, 0, 12]} />
                <Bar dataKey="Neutros" stackId="a" fill={data[1]?.color ?? '#FFD60A'} />
                <Bar dataKey="Detratores" stackId="a" fill={data[2]?.color ?? '#FF4757'} radius={[0, 12, 12, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-row gap-4 justify-center w-full">
            {data.map((item) => (
              <div key={item.name} className="flex items-center gap-3 p-2 rounded-lg bg-primary-light">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <div>
                  <p className="text-sm text-muted">{item.name}</p>
                  <p className="text-lg font-semibold text-foreground">{item.value}%</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
