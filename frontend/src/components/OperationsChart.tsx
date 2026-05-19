import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { BarChart2, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { OperationsDataPoint } from '../services/dashboardService'
import { getOperationsData } from '../services/dashboardService'
import type { DateRange } from '../services/dashboardService'
import { ChartSkeleton } from './ChartSkeleton'

interface Props {
  dateRange: DateRange
}

const STATUS_COLORS: Record<string, string> = {
  Aprovado:    '#00C48C',
  Processando: '#FFD60A',
  Recusado:    '#FF4757',
  Reembolsado: '#FF8C42',
}

export function OperationsChart({ dateRange }: Props) {
  const [data, setData] = useState<OperationsDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getOperationsData(dateRange).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [dateRange.inicio, dateRange.fim])

  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const xMax = Math.ceil(maxCount * 1.15)

  return (
    <div className="bg-card rounded-2xl p-4 border border-border shadow-sm flex flex-col">
      <div className="flex items-center gap-2 mb-1">
        <BarChart2 className="w-3.5 h-3.5 text-muted" />
        <span className="text-xs font-medium text-muted uppercase tracking-wider">Operações</span>
      </div>
      <h3 className="text-lg font-semibold text-[#020854] dark:text-foreground mb-0.5">Distribuição de pedidos</h3>
      <p className="text-xs text-muted">Pedidos por status no período</p>

      {loading ? (
        <div className="mt-4">
          <ChartSkeleton height={200} variant="horizontal" />
        </div>
      ) : (
        <>
          <div className="h-56 min-w-0">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 10, bottom: -10 }}>
                <XAxis
                  type="number"
                  domain={[0, xMax]}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v)}
                />
                <YAxis type="category" dataKey="status" width={120} tickLine={false} axisLine={false} tick={{ textAnchor: 'end', fill: '#64748B' }} />
                <Tooltip formatter={(value) => new Intl.NumberFormat('pt-BR').format(value as number)} />
                <Bar dataKey="count" radius={[0, 12, 12, 0]}>
                  {data.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#1E5EFF'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-row gap-3 mt-3 flex-wrap">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2 p-2 rounded-lg bg-primary-light">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <p className="text-sm text-muted">{status}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex justify-end mt-4">
        <Link
          to="/pedidos"
          className="flex items-center gap-2 py-1.5 rounded-full bg-[#1E5EFF] text-white font-medium text-xs hover:bg-[#0D47A1] transition-colors px-4"
        >
          <span>Acessar pedidos</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
