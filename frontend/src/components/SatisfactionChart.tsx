import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Users } from 'lucide-react'

const data = [
  { name: 'Promotores', value: 70, color: '#1E5EFF' },
  { name: 'Neutros', value: 18, color: '#FFD60A' },
  { name: 'Detratores', value: 12, color: '#FF4757' },
]

export function SatisfactionChart() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-4 h-4 text-[#1E5EFF]" />
        <span className="text-xs font-medium text-[#1E5EFF] uppercase tracking-wider">Clientes</span>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">Taxa de Satisfação</h3>
      <p className="text-sm text-muted mb-6">Exibição de dados média — clique para detalhar</p>

      <div className="flex items-center gap-8">
        {/* Chart */}
        <div className="w-[180px] h-[180px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-foreground">70%</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-4">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-3">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <div>
                <p className="text-sm text-muted">{item.name}</p>
                <p className="text-lg font-semibold text-foreground">{item.value}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
