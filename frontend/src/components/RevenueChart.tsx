import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp } from 'lucide-react'

const data = [
  { month: 'Jan', value: 85, active: false },
  { month: 'Fev', value: 100, active: false },
  { month: 'Mar', value: 90, active: false },
  { month: 'Abr', value: 110, active: false },
  { month: 'Mai', value: 120, active: false },
  { month: 'Jun', value: 95, active: false },
  { month: 'Jul', value: 130, active: true },
  { month: 'Ago', value: 0, active: false },
  { month: 'Set', value: 0, active: false },
  { month: 'Out', value: 0, active: false },
  { month: 'Nov', value: 0, active: false },
  { month: 'Dez', value: 0, active: false },
]

export function RevenueChart() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-4 h-4 text-[#1E5EFF]" />
        <span className="text-xs font-medium text-[#1E5EFF] uppercase tracking-wider">Tendências</span>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">Média de Receita por Mês</h3>
      <p className="text-sm text-muted mb-6">Exibição em barras concorrente — clique para detalhar</p>

      {/* Chart */}
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="20%">
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 12 }}
            />
            <YAxis hide />
            <Bar 
              dataKey="value" 
              radius={[6, 6, 0, 0]}
            >
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
