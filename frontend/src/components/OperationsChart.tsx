import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Truck, ArrowUpRight } from 'lucide-react'
import type { OperationsDataPoint } from '../services/dashboardService'
import { getOperationsData } from '../services/dashboardService'

export function OperationsChart() {
  const [data, setData] = useState<OperationsDataPoint[]>([])

  useEffect(() => {
    getOperationsData().then(setData)
  }, [])

  return (
    <div className="bg-card rounded-2xl p-4 border lg:col-span-2 border-border shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Truck className="w-3.5 h-3.5 text-muted" />
        <span className="text-xs font-medium text-muted uppercase tracking-wider">Operações</span>
      </div>
      <h3 className="text-lg font-semibold text-[#020854] dark:text-foreground mb-0.5">Distribuição de pedidos</h3>
      <p className="text-xs text-muted">Status x indicador de entrega</p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="90%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 10, bottom: -10 }}
          >
            <XAxis
              type="number"
              domain={[0, 10000]}
              ticks={[0, 2500, 5000, 7500, 10000]}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="status"
              width={120}
              tickLine={false}
              axisLine={false}
              tick={{ textAnchor: 'end', fill: '#64748B' }}
            />
            <Tooltip formatter={(value) => `${value}`} />
            <Bar dataKey="Dentro do prazo" stackId="a" fill="#00C48C" radius={[12, 0, 0, 12]} />
            <Bar dataKey="Fora do prazo" stackId="a" fill="#FF4757" radius={[0, 12, 12, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Custom Legend */}
      <div className="flex flex-row gap-4 mt-3 justify-center">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-primary-light">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#00C48C' }} />
          <p className="text-sm text-muted">Dentro do prazo</p>
        </div>
        <div className="flex items-center gap-3 p-2 rounded-lg bg-primary-light">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FF4757' }} />
          <p className="text-sm text-muted">Fora do prazo</p>
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <button className="flex items-center gap-2 py-1.5 rounded-full bg-[#1E5EFF] text-white font-medium text-xs hover:bg-[#0D47A1] transition-colors px-4">
          <span>Acessar pedidos críticos</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
