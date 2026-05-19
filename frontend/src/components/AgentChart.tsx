import { memo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
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
const Y_AXIS_DOMAIN: [
  (dataMin: number) => number,
  (dataMax: number) => number,
] = [
  (dataMin: number) => Math.min(0, dataMin),
  (dataMax: number) => Math.max(0, dataMax),
]

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

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
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
  const visibleData = shouldCap ? data.slice(0, MAX_CATEGORICAL_ITEMS) : data
  const renderData = visibleData.map(row => {
    const numericValue = toFiniteNumber(row[yKey])
    if (numericValue === null || row[yKey] === numericValue) return row
    return { ...row, [yKey]: numericValue }
  })
  const numericYValues = renderData
    .map(row => toFiniteNumber(row[yKey]))
    .filter((value): value is number => value !== null)
  if (numericYValues.length === 0) {
    return <Fallback message="Não foi possível renderizar o gráfico porque o eixo Y não contém valores numéricos." />
  }

  const hasNegativeYValue = numericYValues.some(value => value < 0)
  const shouldRotateBarXAxis =
    chart.type === 'bar' &&
    (renderData.length > 4 ||
      renderData.some(row => String(row[xKey] ?? '').length > MAX_LABEL_CHARS))
  const yAxisWidth = Math.min(
    80,
    Math.max(
      48,
      Math.max(
        ...numericYValues.map(value => compactNumberFormatter.format(value).length),
      ) * 7 + 12,
    ),
  )
  const tooltipLabelFormatter = (label: unknown) => String(label ?? '')
  const zeroReferenceLine = hasNegativeYValue ? (
    <ReferenceLine
      y={0}
      stroke="var(--chat-border)"
      strokeDasharray="4 4"
      ifOverflow="extendDomain"
    />
  ) : null

  if (chart.type === 'pie') {
    const pieChartHeight = Math.max(120, height - 60)

    return (
      <div className="w-full" style={{ minHeight: shouldCap ? height + 20 : height }}>
        <p className="text-xs font-semibold mb-1 text-foreground">{chart.title}</p>
        {shouldCap && (
          <p className="text-[10px] text-muted-foreground mb-2">
            Exibindo os primeiros {MAX_CATEGORICAL_ITEMS} de {data.length} registros.
          </p>
        )}
        <div className="min-w-0" style={{ height: pieChartHeight }}>
          <ResponsiveContainer width="100%" height={pieChartHeight}>
            <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Pie
                data={renderData}
                dataKey={yKey}
                nameKey={xKey}
                cx="50%"
                cy="50%"
                outerRadius="78%"
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
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] leading-tight text-muted-foreground">
          {renderData.map((row, index) => {
            const label = String(row[xKey] ?? '')
            return (
              <div key={`${label}-${index}`} className="flex min-w-0 max-w-[45%] items-center gap-1">
                <span
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ background: PALETTE[index % PALETTE.length] }}
                />
                <span className="truncate" title={label}>
                  {truncateLabel(label)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const categoricalChartHeight = Math.max(120, height - (shouldCap ? 54 : 30))

  return (
    <div className="w-full min-w-0" style={{ height: shouldCap ? height + 20 : height }}>
      <p className="text-xs font-semibold mb-1 text-foreground">{chart.title}</p>
      {shouldCap && (
        <p className="text-[10px] text-muted-foreground mb-2">
          Exibindo os primeiros {MAX_CATEGORICAL_ITEMS} de {data.length} registros.
        </p>
      )}
      <ResponsiveContainer width="100%" height={categoricalChartHeight}>
        {chart.type === 'bar' ? (
          <BarChart
            data={renderData}
            margin={{ top: hasNegativeYValue ? 16 : 8, right: 16, left: 4, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chat-border)" />
            <XAxis
              dataKey={xKey}
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={0}
              tickFormatter={truncateLabel}
              angle={shouldRotateBarXAxis ? -35 : 0}
              textAnchor={shouldRotateBarXAxis ? 'end' : 'middle'}
              height={shouldRotateBarXAxis ? 70 : 30}
            />
            <YAxis
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={value => compactNumberFormatter.format(value as number)}
              width={yAxisWidth}
              domain={Y_AXIS_DOMAIN}
            />
            {zeroReferenceLine}
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
          <LineChart
            data={renderData}
            margin={{ top: hasNegativeYValue ? 16 : 8, right: 16, left: 4, bottom: 0 }}
          >
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
              width={yAxisWidth}
              domain={Y_AXIS_DOMAIN}
            />
            {zeroReferenceLine}
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
        ) : (
          <AreaChart
            data={renderData}
            margin={{ top: hasNegativeYValue ? 16 : 8, right: 16, left: 4, bottom: 0 }}
          >
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
              width={yAxisWidth}
              domain={Y_AXIS_DOMAIN}
            />
            {zeroReferenceLine}
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
              baseValue={0}
              stroke={PALETTE[0]}
              fill={PALETTE[0]}
              fillOpacity={0.25}
              strokeWidth={2}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

export const AgentChart = memo(AgentChartImpl)
