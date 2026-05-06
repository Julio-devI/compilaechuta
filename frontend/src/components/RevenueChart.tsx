import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp } from 'lucide-react'

const data = [
  { month: 'Jan', value: 200, active: false },
  { month: 'Fev', value: 400, active: false },
  { month: 'Mar', value: 90, active: false },
  { month: 'Abr', value: 110, active: false },
  { month: 'Mai', value: 450, active: false },
  { month: 'Jun', value: 150, active: false },
  { month: 'Jul', value: 200, active: true },
  { month: 'Ago', value: 300, active: false },
  { month: 'Set', value: 400, active: false },
  { month: 'Out', value: 200, active: false },
  { month: 'Nov', value: 600, active: false },
  { month: 'Dez', value: 720, active: false },
]

export function RevenueChart() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-4 h-4 text-[#6B7588]" />
        <span className="text-sm font-medium text-[#6B7588] uppercase tracking-wider">Tendências</span>
      </div>
      <h3 className="text-2xl font-semibold text-[#020854] mb-1">Média de Receita por Mês</h3>
      <p className="text-sm text-muted mb-6">Evolução de Faturamento — clique para detalhar</p>

      {/* Chart */}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            barCategoryGap="10%"
            margin={{
              top: 5,
              right: 5, // Adjusted left margin for Y-axis labels
            }}
          >
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 12 }}
            />
            <YAxis
              type="number"
              domain={[0, 720]} // Set domain up to 720k
              ticks={[0, 200, 400, 720]} // Specific ticks as requested
              tickFormatter={(value) => `${value}k`} // Add 'k' suffix
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 12 }}
            />
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
