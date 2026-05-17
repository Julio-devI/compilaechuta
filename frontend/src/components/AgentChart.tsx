import { memo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ChartSuggestion, ChartValueFormat } from '../services/aiAgentService'

interface AgentChartProps {
  chart: ChartSuggestion
  data: Array<Record<string, unknown>>
  height?: number
}

const PALETTE = [
  '#1E5EFF',
  '#8B5CF6',
  '#22C55E',
  '#F59E0B',
  '#EF4444',
  '#06B6D4',
  '#EC4899',
]

const MAX_CATEGORICAL_ITEMS = 30
const MAX_LABEL_CHARS = 14

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
})

const compactNumberFormatter = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1,
})

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 2,
})

function formatValueByType(value: unknown, format: ChartValueFormat | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return String(value)
  }
  if (format === 'currency') {
    return currencyFormatter.format(value)
  }
  if (format === 'percent') {
    return `${numberFormatter.format(value)}%`
  }
  return numberFormatter.format(value)
}

const ACCENT_DICTIONARY: Record<string, string> = {
  media: 'média',
  medio: 'médio',
  regiao: 'região',
  numero: 'número',
}

function prettifyColumnName(key: string): string {
  if (!key) return ''
  const withSpaces = key.replace(/_/g, ' ').trim()
  const withAccents = withSpaces
    .split(' ')
    .map(word => ACCENT_DICTIONARY[word.toLowerCase()] ?? word)
    .join(' ')
  return withAccents.charAt(0).toUpperCase() + withAccents.slice(1)
}

function truncateLabel(value: unknown): string {
  const str = value == null ? '' : String(value)
  if (str.length <= MAX_LABEL_CHARS) return str
  return str.slice(0, MAX_LABEL_CHARS - 1) + '…'
}

function isValidAxis(data: Array<Record<string, unknown>>, key: string | null): boolean {
  if (!key) return false
  return data.length > 0 && Object.prototype.hasOwnProperty.call(data[0], key)
}

function Fallback({ message }: { message: string }) {
  return (
    <div className="text-xs text-muted-foreground italic py-4 text-center">
      {message}
    </div>
  )
}

function AgentChartImpl({ chart, data, height = 240 }: AgentChartProps) {
  if (!Array.isArray(data) || data.length === 0) {
    return <Fallback message="Sem dados para renderizar o gráfico." />
  }
  if (!isValidAxis(data, chart.x_axis) || !isValidAxis(data, chart.y_axis)) {
    return <Fallback message="Não foi possível renderizar o gráfico com os dados disponíveis." />
  }

  const xKey = chart.x_axis as string
  const yKey = chart.y_axis as string

  const shouldCap = (chart.type === 'bar' || chart.type === 'pie') && data.length > MAX_CATEGORICAL_ITEMS
  const renderData = shouldCap ? data.slice(0, MAX_CATEGORICAL_ITEMS) : data
  const tooltipLabelFormatter = (label: unknown) => String(label ?? '')

  return (
    <div className="w-full" style={{ height: shouldCap ? height + 20 : height }}>
      <p className="text-xs font-semibold mb-1 text-foreground">{chart.title}</p>
      {shouldCap && (
        <p className="text-[10px] text-muted-foreground mb-2">
          Exibindo os primeiros {MAX_CATEGORICAL_ITEMS} de {data.length} registros.
        </p>
      )}
      <ResponsiveContainer width="100%" height="85%">
        {chart.type === 'bar' ? (
          <BarChart data={renderData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chat-border)" />
            <XAxis
              dataKey={xKey}
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={0}
              tickFormatter={truncateLabel}
              angle={renderData.length > 6 ? -35 : 0}
              textAnchor={renderData.length > 6 ? 'end' : 'middle'}
              height={renderData.length > 6 ? 70 : 30}
            />
            <YAxis
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={value => compactNumberFormatter.format(value as number)}
              width={48}
            />
            <Tooltip
              cursor={{ fill: 'rgba(30, 94, 255, 0.08)' }}
              labelFormatter={tooltipLabelFormatter}
              formatter={(value: unknown, name: unknown) => [
                formatValueByType(value, chart.y_axis_format ?? null),
                prettifyColumnName(String(name ?? '')),
              ]}
              contentStyle={{
                background: 'var(--chat-msg-ai-bg)',
                border: '1px solid var(--chat-border)',
                borderRadius: '0.5rem',
                fontSize: 12,
              }}
            />
            <Bar dataKey={yKey} fill={PALETTE[0]} radius={[6, 6, 0, 0]} />
          </BarChart>
        ) : chart.type === 'line' ? (
          <LineChart data={renderData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chat-border)" />
            <XAxis
              dataKey={xKey}
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              tickFormatter={truncateLabel}
            />
            <YAxis
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={value => compactNumberFormatter.format(value as number)}
              width={48}
            />
            <Tooltip
              labelFormatter={tooltipLabelFormatter}
              formatter={(value: unknown, name: unknown) => [
                formatValueByType(value, chart.y_axis_format ?? null),
                prettifyColumnName(String(name ?? '')),
              ]}
              contentStyle={{
                background: 'var(--chat-msg-ai-bg)',
                border: '1px solid var(--chat-border)',
                borderRadius: '0.5rem',
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey={yKey}
              stroke={PALETTE[0]}
              strokeWidth={2}
              dot={renderData.length <= 30 ? { r: 3 } : false}
            />
          </LineChart>
        ) : chart.type === 'area' ? (
          <AreaChart data={renderData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chat-border)" />
            <XAxis
              dataKey={xKey}
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              tickFormatter={truncateLabel}
            />
            <YAxis
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={value => compactNumberFormatter.format(value as number)}
              width={48}
            />
            <Tooltip
              labelFormatter={tooltipLabelFormatter}
              formatter={(value: unknown, name: unknown) => [
                formatValueByType(value, chart.y_axis_format ?? null),
                prettifyColumnName(String(name ?? '')),
              ]}
              contentStyle={{
                background: 'var(--chat-msg-ai-bg)',
                border: '1px solid var(--chat-border)',
                borderRadius: '0.5rem',
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey={yKey}
              stroke={PALETTE[0]}
              fill={PALETTE[0]}
              fillOpacity={0.25}
              strokeWidth={2}
            />
          </AreaChart>
        ) : (
          <PieChart>
            <Pie
              data={renderData}
              dataKey={yKey}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              outerRadius="80%"
              label={({ name }: { name?: unknown }) => truncateLabel(name)}
              labelLine={false}
            >
              {renderData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              labelFormatter={tooltipLabelFormatter}
              formatter={(value: unknown, name: unknown) => [
                formatValueByType(value, chart.y_axis_format ?? null),
                prettifyColumnName(String(name ?? '')),
              ]}
              contentStyle={{
                background: 'var(--chat-msg-ai-bg)',
                border: '1px solid var(--chat-border)',
                borderRadius: '0.5rem',
                fontSize: 12,
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              iconSize={8}
              formatter={value => truncateLabel(value)}
            />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

export const AgentChart = memo(AgentChartImpl)
