import { describe, expect, it } from 'vitest'
import { shouldShowAgentDataTable } from './agentDataDisplay'

describe('shouldShowAgentDataTable', () => {
  it('nao mostra tabela quando a resposta tem grafico', () => {
    expect(
      shouldShowAgentDataTable(
        {
          type: 'bar',
          x_axis: 'produto',
          y_axis: 'quantidade',
          title: 'Top produtos',
        },
        [{ produto: 'Produto A', quantidade: 10 }],
      ),
    ).toBe(false)
  })

  it('nao mostra tabela quando nao ha dados', () => {
    expect(shouldShowAgentDataTable(null, null)).toBe(false)
    expect(shouldShowAgentDataTable(null, [])).toBe(false)
  })

  it('nao mostra tabela para uma unica linha com um valor escalar', () => {
    expect(
      shouldShowAgentDataTable(null, [{ receita_total: 1250.75 }]),
    ).toBe(false)
  })

  it('nao mostra tabela para uma unica linha com mais de uma coluna', () => {
    expect(
      shouldShowAgentDataTable(null, [
        { ano: 2025, receita_total: 1250.75 },
      ]),
    ).toBe(false)
  })

  it('mostra tabela para multiplas linhas mesmo com uma coluna', () => {
    expect(
      shouldShowAgentDataTable(null, [
        { cliente: 'Cliente Alpha' },
        { cliente: 'Cliente Beta' },
      ]),
    ).toBe(true)
  })
})
