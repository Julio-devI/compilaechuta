import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { PieChart as PieChartIcon } from 'lucide-react'
import type { VendaCategoria } from '../services/reportService'
import { getVendasPorCategoria } from '../services/reportService'
import type { DateRange } from '../services/dashboardService'
import { ChartSkeleton } from './ChartSkeleton'

interface Props {
  dateRange: DateRange
}

export function CategoryPieChart({ dateRange }: Props) {
  const [data, setData] = useState<VendaCategoria[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getVendasPorCategoria(dateRange).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [dateRange.inicio, dateRange.fim])

  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm flex flex-col h-full">
      <div className="flex items-center gap-2 mb-1">
        <PieChartIcon className="w-3.5 h-3.5 text-muted" />
        <span className="text-xs font-medium text-muted uppercase tracking-wider">Categorias</span>
      </div>
      <h3 className="text-lg font-semibold text-[#020854] dark:text-foreground mb-0.5">Vendas por Categoria</h3>
      <p className="text-xs text-muted mb-2">Participação no faturamento do período</p>

      {loading ? (
        <ChartSkeleton height={320} variant="donut" />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value as number}%`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-1 space-y-2">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-muted truncate max-w-32">{item.name}</span>
                </div>
                <span className="font-semibold text-foreground">{item.value}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
