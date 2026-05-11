import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts'
import { Download, Calendar, TrendingUp, DollarSign, Users, ShoppingCart, FileText } from 'lucide-react'
import type { ReceitaMensal, VendaCategoria, ClienteRegiao, PedidoDia, RelatorioDisponivel } from '../services/reportService'
import { getReceitaMensal, getVendasPorCategoria, getClientesPorRegiao, getPedidosPorDia, getRelatoriosDisponiveis } from '../services/reportService'

export function Relatorios() {
  const [periodo, setPeriodo] = useState('anual')
  const [receitaMensal, setReceitaMensal] = useState<ReceitaMensal[]>([])
  const [vendasPorCategoria, setVendasPorCategoria] = useState<VendaCategoria[]>([])
  const [clientesPorRegiao, setClientesPorRegiao] = useState<ClienteRegiao[]>([])
  const [pedidosPorDia, setPedidosPorDia] = useState<PedidoDia[]>([])
  const [relatoriosDisponiveis, setRelatoriosDisponiveis] = useState<RelatorioDisponivel[]>([])

  useEffect(() => {
    getReceitaMensal().then(setReceitaMensal)
    getVendasPorCategoria().then(setVendasPorCategoria)
    getClientesPorRegiao().then(setClientesPorRegiao)
    getPedidosPorDia().then(setPedidosPorDia)
    getRelatoriosDisponiveis().then(setRelatoriosDisponiveis)
  }, [])

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted mt-1">Análises e métricas do seu negócio</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="px-4 py-2.5 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-[#1E5EFF]/20"
          >
            <option value="semanal">Última Semana</option>
            <option value="mensal">Último Mês</option>
            <option value="trimestral">Último Trimestre</option>
            <option value="anual">Último Ano</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-muted hover:bg-background transition-colors">
            <Calendar className="w-4 h-4" />
            Período Personalizado
          </button>
          <button className="flex items-center gap-2 bg-[#1E5EFF] text-white px-4 py-2.5 rounded-xl font-medium hover:bg-[#1E5EFF]/90 transition-colors">
            <Download className="w-5 h-5" />
            Exportar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-sm">Receita Total</p>
              <p className="text-2xl font-bold text-foreground mt-1">R$ 4.2M</p>
              <p className="text-[#00C48C] text-sm mt-2 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +18,5% vs ano anterior
              </p>
            </div>
            <div className="w-12 h-12 bg-[#1E5EFF]/10 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-[#1E5EFF]" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-sm">Total de Pedidos</p>
              <p className="text-2xl font-bold text-foreground mt-1">310.000</p>
              <p className="text-[#00C48C] text-sm mt-2 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +12,3% vs ano anterior
              </p>
            </div>
            <div className="w-12 h-12 bg-[#00C48C]/10 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-[#00C48C]" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-sm">Novos Clientes</p>
              <p className="text-2xl font-bold text-foreground mt-1">15.234</p>
              <p className="text-[#00C48C] text-sm mt-2 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +25,8% vs ano anterior
              </p>
            </div>
            <div className="w-12 h-12 bg-[#8B5CF6]/10 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-[#8B5CF6]" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-sm">Ticket Médio</p>
              <p className="text-2xl font-bold text-foreground mt-1">R$ 285,00</p>
              <p className="text-[#00C48C] text-sm mt-2 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +8,2% vs ano anterior
              </p>
            </div>
            <div className="w-12 h-12 bg-[#FFD60A]/10 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-[#B8860B]" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Receita vs Meta */}
        <div className="col-span-2 bg-card rounded-2xl p-6 border border-border">
          <h3 className="font-bold text-foreground mb-6">Receita vs Meta Mensal</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={receitaMensal}>
              <defs>
                <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1E5EFF" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#1E5EFF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} tickFormatter={(value) => `${value / 1000}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '12px' }}
                formatter={(value) => [`R$ ${((value as number) / 1000).toFixed(0)}k`, '']}
              />
              <Legend />
              <Area type="monotone" dataKey="receita" name="Receita" stroke="#1E5EFF" strokeWidth={2} fill="url(#colorReceita)" />
              <Line type="monotone" dataKey="meta" name="Meta" stroke="#FF4757" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Vendas por Categoria */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          <h3 className="font-bold text-foreground mb-6">Vendas por Categoria</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={vendasPorCategoria}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {vendasPorCategoria.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value as number}%`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {vendasPorCategoria.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted">{item.name}</span>
                </div>
                <span className="font-medium text-foreground">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Clientes por Região */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          <h3 className="font-bold text-foreground mb-6">Clientes por Região</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={clientesPorRegiao} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={true} vertical={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
              <YAxis dataKey="regiao" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} width={80} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '12px' }}
                formatter={(value) => [(value as number).toLocaleString(), 'Clientes']}
              />
              <Bar dataKey="clientes" fill="#1E5EFF" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pedidos por Dia da Semana */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          <h3 className="font-bold text-foreground mb-6">Pedidos por Dia da Semana</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={pedidosPorDia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '12px' }}
              />
              <Line type="monotone" dataKey="pedidos" stroke="#00C48C" strokeWidth={3} dot={{ fill: '#00C48C', strokeWidth: 2, r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Relatórios Disponíveis */}
      <div className="bg-card rounded-2xl border border-border">
        <div className="p-4 border-b border-border">
          <h3 className="font-bold text-foreground">Relatórios Recentes</h3>
        </div>
        <div className="divide-y divide-[#E2E8F0]">
          {relatoriosDisponiveis.map((relatorio) => (
            <div key={relatorio.id} className="p-4 flex items-center justify-between hover:bg-background transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${relatorio.tipo === 'PDF' ? 'bg-[#FF4757]/10' : 'bg-[#00C48C]/10'}`}>
                  <FileText className={`w-5 h-5 ${relatorio.tipo === 'PDF' ? 'text-[#FF4757]' : 'text-[#00C48C]'}`} />
                </div>
                <div>
                  <p className="font-medium text-foreground">{relatorio.nome}</p>
                  <p className="text-sm text-muted">{relatorio.tipo} • {relatorio.tamanho}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted">{relatorio.data}</span>
                <button className="p-2 hover:bg-[#E2E8F0] rounded-lg transition-colors">
                  <Download className="w-5 h-5 text-[#1E5EFF]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
