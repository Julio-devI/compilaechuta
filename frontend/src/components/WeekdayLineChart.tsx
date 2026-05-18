import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Calendar } from 'lucide-react'
import type { PedidoDia } from '../services/reportService'
import { getPedidosPorDia } from '../services/reportService'
import type { DateRange } from '../services/dashboardService'
import { ChartSkeleton } from './ChartSkeleton'

interface Props {
  dateRange: DateRange
}

export function WeekdayLineChart({ dateRange }: Props) {
  const [data, setData] = useState<PedidoDia[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getPedidosPorDia(dateRange).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [dateRange.inicio, dateRange.fim])

  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Calendar className="w-3.5 h-3.5 text-muted" />
        <span className="text-xs font-medium text-muted uppercase tracking-wider">Frequência</span>
      </div>
      <h3 className="text-lg font-semibold text-[#020854] dark:text-foreground mb-0.5">Pedidos por Dia</h3>
      <p className="text-xs text-muted mb-4">Volume de pedidos por dia da semana no período</p>

      {loading ? (
        <ChartSkeleton height={240} />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 12 }}
              tickFormatter={(v) => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v)}
              width={40}
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '12px' }}
              formatter={(value) => [new Intl.NumberFormat('pt-BR').format(value as number), 'Pedidos']}
            />
            <Line type="monotone" dataKey="pedidos" stroke="#00C48C" strokeWidth={3} dot={{ fill: '#00C48C', strokeWidth: 2, r: 5 }} activeDot={{ r: 7 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
