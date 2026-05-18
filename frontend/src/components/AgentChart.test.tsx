import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AgentChart } from './AgentChart'
import type { ChartSuggestion } from '../services/aiAgentService'

vi.mock('recharts', () => {
  const Stub =
    (testid: string) =>
    ({ children }: { children?: React.ReactNode }) => (
      <div data-testid={testid}>{children}</div>
    )

  const StubWithRows =
    (testid: string) =>
    ({ children, data }: { children?: React.ReactNode; data?: unknown[] }) => (
      <div data-testid={testid} data-rows={data?.length ?? 0}>
        {children}
      </div>
    )

  return {
    ResponsiveContainer: Stub('responsive-container'),
    BarChart: StubWithRows('bar-chart'),
    LineChart: StubWithRows('line-chart'),
    PieChart: Stub('pie-chart'),
    AreaChart: StubWithRows('area-chart'),
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    Bar: () => null,
    Line: () => null,
    Pie: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="pie">{children}</div>
    ),
    Cell: () => null,
    Area: () => null,
    ReferenceLine: () => null,
  }
})

const baseChart: ChartSuggestion = {
  type: 'bar',
  x_axis: 'produto',
  y_axis: 'quantidade',
  title: 'Vendas por produto',
}

describe('AgentChart', () => {
  it('renderiza fallback quando data esta vazio', () => {
    render(<AgentChart chart={baseChart} data={[]} />)
    expect(
      screen.getByText('Sem dados para renderizar o gráfico.'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument()
  })

  it('renderiza fallback quando x_axis nao existe nos dados', () => {
    render(
      <AgentChart
        chart={baseChart}
        data={[{ outroCampo: 'X', quantidade: 10 }]}
      />,
    )
    expect(
      screen.getByText(
        'Não foi possível renderizar o gráfico com os dados disponíveis.',
      ),
    ).toBeInTheDocument()
  })

  it('renderiza fallback quando o eixo Y nao tem valores numericos', () => {
    render(
      <AgentChart
        chart={baseChart}
        data={[{ produto: 'A', quantidade: 'texto' }]}
      />,
    )
    expect(
      screen.getByText(
        'Não foi possível renderizar o gráfico porque o eixo Y não contém valores numéricos.',
      ),
    ).toBeInTheDocument()
  })

  it('renderiza BarChart com titulo e linhas correspondentes aos dados', () => {
    render(
      <AgentChart
        chart={baseChart}
        data={[
          { produto: 'A', quantidade: 10 },
          { produto: 'B', quantidade: 20 },
        ]}
      />,
    )
    expect(screen.getByText('Vendas por produto')).toBeInTheDocument()
    const bar = screen.getByTestId('bar-chart')
    expect(bar).toBeInTheDocument()
    expect(bar.getAttribute('data-rows')).toBe('2')
  })

  it('renderiza LineChart quando chart.type=line', () => {
    render(
      <AgentChart
        chart={{ ...baseChart, type: 'line', title: 'Tendencia' }}
        data={[
          { produto: 'A', quantidade: 10 },
          { produto: 'B', quantidade: 20 },
        ]}
      />,
    )
    expect(screen.getByText('Tendencia')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('renderiza AreaChart quando chart.type=area', () => {
    render(
      <AgentChart
        chart={{ ...baseChart, type: 'area', title: 'Volume acumulado' }}
        data={[
          { produto: 'A', quantidade: 10 },
          { produto: 'B', quantidade: 20 },
        ]}
      />,
    )
    expect(screen.getByText('Volume acumulado')).toBeInTheDocument()
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
  })

  it('renderiza PieChart com legenda listando as categorias', () => {
    render(
      <AgentChart
        chart={{ ...baseChart, type: 'pie', title: 'Distribuicao' }}
        data={[
          { produto: 'Camiseta', quantidade: 10 },
          { produto: 'Tenis', quantidade: 5 },
        ]}
      />,
    )
    expect(screen.getByText('Distribuicao')).toBeInTheDocument()
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    expect(screen.getByText('Camiseta')).toBeInTheDocument()
    expect(screen.getByText('Tenis')).toBeInTheDocument()
  })

  it('limita a 30 itens e mostra aviso de truncamento quando bar tem mais de 30 linhas', () => {
    const rows = Array.from({ length: 35 }, (_, i) => ({
      produto: `Item ${i}`,
      quantidade: i,
    }))
    render(<AgentChart chart={baseChart} data={rows} />)

    expect(
      screen.getByText('Exibindo os primeiros 30 de 35 registros.'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('bar-chart').getAttribute('data-rows')).toBe('30')
  })
})
