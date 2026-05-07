import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Truck, ArrowUpRight } from 'lucide-react' // Import ArrowUpRight icon

const data = [
  { status: 'Comprados', 'Dentro do prazo': 5000, 'Fora do prazo': 500 }, // Scaled to total 10000
  { status: 'Em Processamento', 'Dentro do prazo': 3000, 'Fora do prazo': 2000 }, // Scaled to total 10000
  { status: 'Enviados', 'Dentro do prazo': 4000, 'Fora do prazo': 3000 }, // Scaled to total 10000
  { status: 'Em trânsito', 'Dentro do prazo': 6000, 'Fora do prazo': 2000 }, // Scaled to total 10000
  { status: 'Entregues', 'Dentro do prazo': 10000, 'Fora do prazo': 0 }, // Scaled to total 10000
];

export function OperationsChart() {
  return (
    <div className="bg-card rounded-2xl p-6 border lg:col-span-2 border-border shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Truck className="w-4 h-4 text-muted" />
        <span className="text-xs font-medium text-muted uppercase tracking-wider">Operações</span>
      </div>
      <h3 className="text-2xl font-semibold text-[#020854] dark:text-foreground mb-1">Distribuição de pedidos</h3>
      <p>Status x indicador de entrega</p>
      <div className="h-[300px]"> 
        <ResponsiveContainer width="100%" height="90%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{
              top: 20,
              right: 30,
              left: 10, // Adjusted left margin to align better with Y-axis width and textAnchor: 'start'
              bottom: -10,
            }}
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
            <Tooltip formatter={(value) => `${value}`} /> {/* Removed % from tooltip */}
            {/* The default Legend component from recharts is not used here as we have a custom one below */}
            {/* <Legend /> */}
            <Bar dataKey="Dentro do prazo" stackId="a" fill="#00C48C" radius={[12, 0, 0, 12]} /> {/* Green for "Dentro do prazo" - rounded left */}
            <Bar dataKey="Fora do prazo" stackId="a" fill="#FF4757" radius={[0, 12, 12, 0]} />  {/* Red for "Fora do prazo" - rounded right */}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Custom Legend */}
      <div className="flex flex-row gap-4 mt-3 justify-center">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-primary-light">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: '#00C48C' }}
              />
              <div>
                <p className="text-sm text-muted">Dentro do prazo</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-primary-light">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: '#FF4757' }}
              />
              <div>
                <p className="text-sm text-muted">Fora do prazo</p>
              </div>
            </div>
        </div>

      {/* "Acessar pedidos críticos" Button */}
      <div className="flex justify-end mt-4"> {/* Wrapper div to push button to the right */}
        <button className="flex items-center gap-2 py-3 rounded-full bg-[#1E5EFF] text-white font-medium text-sm hover:bg-[#0D47A1] transition-colors px-6">
          <span>Acessar pedidos críticos</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
