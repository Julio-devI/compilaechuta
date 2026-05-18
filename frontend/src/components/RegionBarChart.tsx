import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { MapPin } from 'lucide-react'
import type { ClienteRegiao } from '../services/reportService'
import { getClientesPorRegiao } from '../services/reportService'
import { ChartSkeleton } from './ChartSkeleton'

export function RegionBarChart() {
  const [data, setData] = useState<ClienteRegiao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getClientesPorRegiao().then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [])

  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="w-3.5 h-3.5 text-muted" />
        <span className="text-xs font-medium text-muted uppercase tracking-wider">Geográfico</span>
      </div>
      <h3 className="text-lg font-semibold text-[#020854] dark:text-foreground mb-0.5">Clientes por Região</h3>
      <p className="text-xs text-muted mb-4">Distribuição da base de clientes</p>

      {loading ? (
        <ChartSkeleton height={240} variant="horizontal" />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} vertical={true} />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 12 }}
              tickFormatter={(v) => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v)}
            />
            <YAxis dataKey="regiao" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} width={90} />
            <Tooltip
              contentStyle={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '12px' }}
              formatter={(value) => [new Intl.NumberFormat('pt-BR').format(value as number), 'Clientes']}
            />
            <Bar dataKey="clientes" fill="#1E5EFF" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
