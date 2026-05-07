import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Users } from 'lucide-react'

const data = [
  { name: 'Promotores', value: 70, color: '#1E5EFF' },
  { name: 'Neutros', value: 18, color: '#FFD60A' },
  { name: 'Detratores', value: 12, color: '#FF4757' },
]

// Transform data for stacked bar chart
const barChartData = [
  {
    category: 'Satisfação',
    Promotores: data[0].value,
    Neutros: data[1].value,
    Detratores: data[2].value,
  },
];

export function SatisfactionChart() {
  return (
    <div
      className="flex flex-col items-start p-6 gap-[10px] rounded-[30px] bg-white" // Updated classes
      style={{
        boxShadow: '0 4px 24px -8px rgba(2, 2, 85, 0.08)', // Custom box-shadow
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2"> {/* Removed mb-1 to align with gap: 10px */}
        <Users className="w-4 h-4 text-[#6B7588]" />
        <span className="text-sm font-medium text-[#6B7588] uppercase tracking-wider">Clientes</span>
      </div>
      <h3 className="text-2xl font-semibold text-[#020854]">Taxa de Satisfação</h3> {/* Removed mb-1 */}
      <p className="text-sm text-muted">Exibição de dados média — clique para detalhar</p> {/* Removed mb-6 */}

      <div className="h-[200px] w-full"> {/* Adjust height as needed, added w-full */}
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={barChartData}
            layout="vertical" // For a horizontal stacked bar chart
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 10,
            }}
          >
            <XAxis type="number" tickFormatter={(value) => `${value}%`} domain={[0, 100]} hide /> {/* Added hide prop */}
            <YAxis type="category" dataKey="category" hide /> {/* Hide YAxis as there's only one category */}
            <Tooltip formatter={(value) => `${value}%`} />
            {/* The default Legend component from recharts is not used here as we have a custom one below */}
            {/* <Legend /> */}
            <Bar dataKey="Promotores" stackId="a" fill={data[0].color} radius={[12, 0, 0, 12]} /> {/* Added radius */}
            <Bar dataKey="Neutros" stackId="a" fill={data[1].color} />
            <Bar dataKey="Detratores" stackId="a" fill={data[2].color} radius={[0, 12, 12, 0]} /> {/* Added radius */}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend - Reusing the existing legend structure for consistency */}
      <div className="flex flex-row gap-4 justify-center w-full"> {/* Removed mt-6, added w-full */}
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-3 p-2 rounded-lg bg-[#E3EDFF]"> {/* Added padding, rounded corners, and background color */}
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
  )
}
