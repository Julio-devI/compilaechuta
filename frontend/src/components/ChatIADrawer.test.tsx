import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithRouter, screen, waitFor, within } from '@/test/test-utils'
import type { ChartSuggestion } from '@/services/aiAgentService'

vi.mock('@/services/aiAgentService', () => ({
  askAgent: vi.fn(),
  getSuggestions: vi.fn(),
}))

vi.mock('@/components/AgentChart', () => ({
  AgentChart: ({ chart }: { chart: ChartSuggestion }) => (
    <div data-testid="chart-stub">{chart.title}</div>
  ),
}))

const toastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: vi.fn(),
  },
}))

vi.mock('@/lib/chatSuggestionsByRoute', () => ({
  getRouteSuggestions: () => ['Sugestao alpha', 'Sugestao beta'],
}))

vi.mock('@/lib/useRotatingPlaceholder', () => ({
  AGENT_PLACEHOLDERS_COMPACT: ['placeholder estatico'],
  useRotatingPlaceholder: () => ({ text: 'placeholder estatico', opacity: 1 }),
}))

import { ChatIADrawer } from './ChatIADrawer'
import { askAgent, getSuggestions } from '@/services/aiAgentService'

const askAgentMock = askAgent as unknown as ReturnType<typeof vi.fn>
const getSuggestionsMock = getSuggestions as unknown as ReturnType<typeof vi.fn>

function findTriggerButton(): HTMLElement {
  const triggers = screen.getAllByRole('button').filter(btn => {
    return btn.querySelector('svg.lucide-sparkles') !== null
  })
  if (triggers.length === 0) {
    throw new Error('Trigger button (Sparkles) nao encontrado')
  }
  return triggers[0]
}

function findInput(): HTMLInputElement {
  return screen.getByPlaceholderText('placeholder estatico') as HTMLInputElement
}

beforeEach(() => {
  askAgentMock.mockReset()
  getSuggestionsMock.mockReset()
  toastError.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ChatIADrawer', () => {
  it('renderiza o botao flutuante de abertura e a saudacao do drawer', () => {
    renderWithRouter(<ChatIADrawer />)
    expect(findTriggerButton()).toBeInTheDocument()
    expect(screen.getByText(/Olá! Como posso te ajudar/)).toBeInTheDocument()
    expect(screen.getByText('Sugestao alpha')).toBeInTheDocument()
    expect(screen.getByText('Sugestao beta')).toBeInTheDocument()
  })

  it('envia pergunta digitada e renderiza a resposta do assistente', async () => {
    askAgentMock.mockResolvedValueOnce({
      status: 'success',
      session_id: 'sess-1',
      user_response: {
        answer_text: 'A receita foi R$ 10.',
        sources_text: null,
        data: null,
        chart: null,
        truncated: false,
      },
    })

    const user = userEvent.setup()
    renderWithRouter(<ChatIADrawer />)

    const input = findInput()
    await user.type(input, 'Qual foi a receita?')
    await user.keyboard('{Enter}')

    expect(askAgentMock).toHaveBeenCalledTimes(1)
    const [questionArg, sessionArg] = askAgentMock.mock.calls[0]
    expect(questionArg).toBe('Qual foi a receita?')
    expect(typeof sessionArg).toBe('string')
    expect(sessionArg.length).toBeGreaterThan(0)

    expect(await screen.findByText('Qual foi a receita?')).toBeInTheDocument()
    expect(await screen.findByText('A receita foi R$ 10.')).toBeInTheDocument()
  })

  it('exibe toast e mensagem de fallback quando askAgent rejeita', async () => {
    askAgentMock.mockRejectedValueOnce(new Error('Boom'))

    const user = userEvent.setup()
    renderWithRouter(<ChatIADrawer />)

    await user.type(findInput(), 'Pergunta com erro')
    await user.keyboard('{Enter}')

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Boom'))
    expect(
      await screen.findByText('Ops, algo deu errado: Boom'),
    ).toBeInTheDocument()
  })

  it('usa fallback de out_of_scope quando answer_text vem vazio', async () => {
    askAgentMock.mockResolvedValueOnce({
      status: 'out_of_scope',
      session_id: 'sess-1',
      user_response: {
        answer_text: '',
        sources_text: null,
        data: null,
        chart: null,
        truncated: false,
      },
    })

    const user = userEvent.setup()
    renderWithRouter(<ChatIADrawer />)

    await user.type(findInput(), 'Pergunta fora do escopo')
    await user.keyboard('{Enter}')

    expect(
      await screen.findByText(
        'Não consegui responder a essa pergunta com os dados disponíveis.',
      ),
    ).toBeInTheDocument()
  })

  it('executa /sugestao via Enter, chama getSuggestions e exibe a mensagem do agente', async () => {
    getSuggestionsMock.mockResolvedValueOnce({
      suggestions: ['Sugestao 1', 'Sugestao 2', 'Sugestao 3'],
    })

    const user = userEvent.setup()
    renderWithRouter(<ChatIADrawer />)

    await user.type(findInput(), '/sugestao')
    await user.keyboard('{Enter}')

    expect(getSuggestionsMock).toHaveBeenCalledTimes(1)
    const [sessionArg] = getSuggestionsMock.mock.calls[0]
    expect(typeof sessionArg).toBe('string')
    expect(sessionArg.length).toBeGreaterThan(0)

    expect(
      await screen.findByText('Aqui vão algumas sugestões para você:'),
    ).toBeInTheDocument()
  })

  it('toggle do grafico mostra e esconde o AgentChart', async () => {
    askAgentMock.mockResolvedValueOnce({
      status: 'success',
      session_id: 'sess-1',
      user_response: {
        answer_text: 'Top produtos vendidos.',
        sources_text: null,
        data: [{ produto: 'X', quantidade: 10 }],
        chart: {
          type: 'bar',
          x_axis: 'produto',
          y_axis: 'quantidade',
          title: 'Top produtos',
        },
        truncated: false,
      },
    })

    const user = userEvent.setup()
    renderWithRouter(<ChatIADrawer />)

    await user.type(findInput(), 'Quais os top produtos?')
    await user.keyboard('{Enter}')

    const toggle = await screen.findByRole('button', {
      name: /Visualizar gráfico/,
    })
    expect(screen.queryByTestId('chart-stub')).not.toBeInTheDocument()

    await user.click(toggle)
    expect(await screen.findByTestId('chart-stub')).toBeInTheDocument()

    await user.click(toggle)
    await waitFor(() =>
      expect(screen.queryByTestId('chart-stub')).not.toBeInTheDocument(),
    )
  })

  it('renderiza fonte e mostra tabela apenas depois do toggle', async () => {
    askAgentMock.mockResolvedValueOnce({
      status: 'success',
      session_id: 'sess-1',
      user_response: {
        answer_text: 'Clientes encontrados na consulta.',
        sources_text: 'Fonte: base Gold de clientes.',
        data: [
          { cliente: 'Cliente Alpha', receita_total: 1200.5 },
          { cliente: 'Cliente Beta', receita_total: 980 },
        ],
        chart: null,
        truncated: false,
      },
    })

    const user = userEvent.setup()
    renderWithRouter(<ChatIADrawer />)

    await user.type(findInput(), 'Liste os clientes')
    await user.keyboard('{Enter}')

    expect(
      await screen.findByText('Clientes encontrados na consulta.'),
    ).toBeInTheDocument()
    expect(await screen.findByText('Fonte: base Gold de clientes.')).toBeInTheDocument()

    const toggle = await screen.findByRole('button', {
      name: /Visualizar tabela/,
    })
    expect(screen.queryByText('Cliente Alpha')).not.toBeInTheDocument()

    await user.click(toggle)

    expect(await screen.findByText('Cliente')).toBeInTheDocument()
    expect(await screen.findByText('Receita Total')).toBeInTheDocument()
    expect(await screen.findByText('Cliente Alpha')).toBeInTheDocument()
    expect(await screen.findByText('1.200,5')).toBeInTheDocument()

    await user.click(toggle)
    await waitFor(() =>
      expect(screen.queryByText('Cliente Alpha')).not.toBeInTheDocument(),
    )
  })

  it('clicar em uma quick action envia a pergunta correspondente', async () => {
    askAgentMock.mockResolvedValueOnce({
      status: 'success',
      session_id: 'sess-1',
      user_response: {
        answer_text: 'Resposta para a sugestao.',
        sources_text: null,
        data: null,
        chart: null,
        truncated: false,
      },
    })

    const user = userEvent.setup()
    renderWithRouter(<ChatIADrawer />)

    const card = screen.getByText('Sugestao alpha')
    const button = card.closest('button')
    expect(button).not.toBeNull()
    await user.click(button as HTMLElement)

    expect(askAgentMock).toHaveBeenCalledTimes(1)
    expect(askAgentMock.mock.calls[0][0]).toBe('Sugestao alpha')
    expect(await screen.findByText('Resposta para a sugestao.')).toBeInTheDocument()
  })
})

// Garante que a re-exportacao `within` do test-utils nao quebra import noise.
void within
