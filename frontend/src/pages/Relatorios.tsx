import { useState } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts'
import { Download, Calendar, TrendingUp, DollarSign, Users, ShoppingCart, FileText } from 'lucide-react'

const receitaMensal = [
  { mes: 'Jan', receita: 245000, meta: 250000 },
  { mes: 'Fev', receita: 298000, meta: 280000 },
  { mes: 'Mar', receita: 312000, meta: 300000 },
  { mes: 'Abr', receita: 285000, meta: 320000 },
  { mes: 'Mai', receita: 356000, meta: 340000 },
  { mes: 'Jun', receita: 389000, meta: 360000 },
  { mes: 'Jul', receita: 421000, meta: 400000 },
  { mes: 'Ago', receita: 398000, meta: 420000 },
  { mes: 'Set', receita: 445000, meta: 440000 },
  { mes: 'Out', receita: 478000, meta: 460000 },
  { mes: 'Nov', receita: 512000, meta: 500000 },
  { mes: 'Dez', receita: 567000, meta: 550000 },
]

const vendasPorCategoria = [
  { name: 'Eletrônicos', value: 35, color: '#1E5EFF' },
  { name: 'Informática', value: 25, color: '#00C48C' },
  { name: 'Áudio', value: 18, color: '#FFD60A' },
  { name: 'Games', value: 12, color: '#8B5CF6' },
  { name: 'Outros', value: 10, color: '#FF4757' },
]

const clientesPorRegiao = [
  { regiao: 'Sudeste', clientes: 25430 },
  { regiao: 'Sul', clientes: 12890 },
  { regiao: 'Nordeste', clientes: 8540 },
  { regiao: 'Centro-Oeste', clientes: 2890 },
  { regiao: 'Norte', clientes: 1109 },
]

const pedidosPorDia = [
  { dia: 'Seg', pedidos: 1250 },
  { dia: 'Ter', pedidos: 1380 },
  { dia: 'Qua', pedidos: 1420 },
  { dia: 'Qui', pedidos: 1350 },
  { dia: 'Sex', pedidos: 1680 },
  { dia: 'Sáb', pedidos: 2150 },
  { dia: 'Dom', pedidos: 1890 },
]

const relatoriosDisponiveis = [
  { id: 1, nome: 'Relatório de Vendas', tipo: 'PDF', tamanho: '2.4 MB', data: '18/01/2024' },
  { id: 2, nome: 'Análise de Clientes', tipo: 'Excel', tamanho: '1.8 MB', data: '17/01/2024' },
  { id: 3, nome: 'Performance de Produtos', tipo: 'PDF', tamanho: '3.2 MB', data: '16/01/2024' },
  { id: 4, nome: 'Relatório Financeiro', tipo: 'Excel', tamanho: '4.1 MB', data: '15/01/2024' },
]

export function Relatorios() {
  const [periodo, setPeriodo] = useState('anual')

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
