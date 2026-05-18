import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import {
  render,
  renderWithRouter,
  screen,
  act,
  waitFor,
  within,
} from '@/test/test-utils'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ChartSuggestion } from '@/services/aiAgentService'
import { AiAgentChatProvider } from '@/contexts/AiAgentChatContext'

vi.mock('@/services/aiAgentService', () => ({
  askAgent: vi.fn(),
  getSuggestions: vi.fn(),
  listSessions: vi.fn(),
  getSessionDetail: vi.fn(),
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
import {
  askAgent,
  getSessionDetail,
  getSuggestions,
  listSessions,
} from '@/services/aiAgentService'

const askAgentMock = askAgent as unknown as ReturnType<typeof vi.fn>
const getSuggestionsMock = getSuggestions as unknown as ReturnType<typeof vi.fn>
const listSessionsMock = listSessions as unknown as ReturnType<typeof vi.fn>
const getSessionDetailMock = getSessionDetail as unknown as ReturnType<
  typeof vi.fn
>

function compareNodeOrder(first: HTMLElement, second: HTMLElement): number {
  return first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING
}

function renderDrawer(route = '/') {
  return renderWithRouter(
    <AiAgentChatProvider>
      <ChatIADrawer />
    </AiAgentChatProvider>,
    { route },
  )
}

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
  listSessionsMock.mockReset()
  getSessionDetailMock.mockReset()
  toastError.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ChatIADrawer', () => {
  it('renderiza o botao flutuante de abertura e a saudacao do drawer', () => {
    renderDrawer()
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
    renderDrawer()

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

  it('enfileira novas perguntas enquanto o agente responde e preserva a ordem visual', async () => {
    let resolveFirst!: (value: unknown) => void
    let resolveSecond!: (value: unknown) => void

    askAgentMock
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveFirst = resolve
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveSecond = resolve
          }),
      )

    const user = userEvent.setup()
    renderDrawer()

    await user.type(findInput(), 'Pergunta 1')
    await user.keyboard('{Enter}')

    expect(await screen.findByText('Pergunta 1')).toBeInTheDocument()
    expect(askAgentMock).toHaveBeenCalledTimes(1)

    await user.type(findInput(), 'Pergunta 2')
    await user.keyboard('{Enter}')

    expect(askAgentMock).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Na fila')).toBeInTheDocument()
    expect(screen.getByTestId('queued-question')).toHaveTextContent('Pergunta 2')

    await act(async () => {
      resolveFirst({
        status: 'success',
        session_id: 'sess-1',
        user_response: {
          answer_text: 'Resposta 1',
          sources_text: null,
          data: null,
          chart: null,
          truncated: false,
        },
      })
    })

    expect(await screen.findByText('Resposta 1')).toBeInTheDocument()
    expect(await screen.findByText('Pergunta 2')).toBeInTheDocument()
    expect(screen.queryByTestId('queued-question')).not.toBeInTheDocument()
    await waitFor(() => expect(askAgentMock).toHaveBeenCalledTimes(2))

    await act(async () => {
      resolveSecond({
        status: 'success',
        session_id: 'sess-1',
        user_response: {
          answer_text: 'Resposta 2',
          sources_text: null,
          data: null,
          chart: null,
          truncated: false,
        },
      })
    })

    const pergunta1 = await screen.findByText('Pergunta 1')
    const resposta1 = await screen.findByText('Resposta 1')
    const pergunta2 = await screen.findByText('Pergunta 2')
    const resposta2 = await screen.findByText('Resposta 2')

    expect(compareNodeOrder(pergunta1, resposta1)).toBeTruthy()
    expect(compareNodeOrder(resposta1, pergunta2)).toBeTruthy()
    expect(compareNodeOrder(pergunta2, resposta2)).toBeTruthy()
  })

  it('remove pergunta enfileirada antes dela ser enviada ao agente', async () => {
    let resolveFirst!: (value: unknown) => void

    askAgentMock.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveFirst = resolve
        }),
    )

    const user = userEvent.setup()
    renderDrawer()

    await user.type(findInput(), 'Pergunta principal')
    await user.keyboard('{Enter}')
    await user.type(findInput(), 'Pergunta removida')
    await user.keyboard('{Enter}')

    expect(screen.getByTestId('queued-question')).toHaveTextContent(
      'Pergunta removida',
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Remover pergunta da fila: Pergunta removida',
      }),
    )

    expect(screen.queryByText('Pergunta removida')).not.toBeInTheDocument()
    expect(screen.queryByText('Na fila')).not.toBeInTheDocument()

    await act(async () => {
      resolveFirst({
        status: 'success',
        session_id: 'sess-1',
        user_response: {
          answer_text: 'Resposta principal',
          sources_text: null,
          data: null,
          chart: null,
          truncated: false,
        },
      })
    })

    expect(await screen.findByText('Resposta principal')).toBeInTheDocument()
    expect(askAgentMock).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Pergunta removida')).not.toBeInTheDocument()
  })

  it('exibe toast e mensagem de fallback quando askAgent rejeita', async () => {
    askAgentMock.mockRejectedValueOnce(new Error('Boom'))

    const user = userEvent.setup()
    renderDrawer()

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
    renderDrawer()

    await user.type(findInput(), 'Pergunta fora do escopo')
    await user.keyboard('{Enter}')

    expect(
      await screen.findByText(
        'Não consegui responder a essa pergunta com os dados disponíveis.',
      ),
    ).toBeInTheDocument()
  })

  it('executa /sugestao via Enter, chama getSuggestions e exibe a mensagem de pedido e do agente', async () => {
    getSuggestionsMock.mockResolvedValueOnce({
      suggestions: ['Sugestao 1', 'Sugestao 2', 'Sugestao 3'],
    })

    const user = userEvent.setup()
    renderDrawer()

    await user.type(findInput(), '/sugestao')
    await user.keyboard('{Enter}')

    expect(getSuggestionsMock).toHaveBeenCalledTimes(1)
    const [sessionArg] = getSuggestionsMock.mock.calls[0]
    expect(typeof sessionArg).toBe('string')
    expect(sessionArg.length).toBeGreaterThan(0)

    expect(
      await screen.findByText(
        'Estou sem ideias do que perguntar agora. Com base no que conversamos até aqui, pode me sugerir algumas perguntas?',
      ),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('Aqui vão algumas sugestões para você:'),
    ).toBeInTheDocument()
    expect(await screen.findByText('Sugestao 1')).toBeInTheDocument()
    expect(screen.getByText('Sugestao 2')).toBeInTheDocument()
    expect(screen.getByText('Sugestao 3')).toBeInTheDocument()
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
    renderDrawer()

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
    renderDrawer()

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

  it('nao mostra tabela quando a resposta contem apenas um valor escalar', async () => {
    askAgentMock.mockResolvedValueOnce({
      status: 'success',
      session_id: 'sess-1',
      user_response: {
        answer_text: 'A receita total foi R$ 1.250,75.',
        sources_text: null,
        data: [{ receita_total: 1250.75 }],
        chart: null,
        truncated: false,
      },
    })

    const user = userEvent.setup()
    renderDrawer()

    await user.type(findInput(), 'Qual foi a receita total?')
    await user.keyboard('{Enter}')

    expect(
      await screen.findByText('A receita total foi R$ 1.250,75.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Visualizar tabela/ }),
    ).not.toBeInTheDocument()
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
    renderDrawer()

    const card = screen.getByText('Sugestao alpha')
    const button = card.closest('button')
    expect(button).not.toBeNull()
    await user.click(button as HTMLElement)

    expect(askAgentMock).toHaveBeenCalledTimes(1)
    expect(askAgentMock.mock.calls[0][0]).toBe('Sugestao alpha')
    expect(await screen.findByText('Resposta para a sugestao.')).toBeInTheDocument()
  })

  it('preserva erro em memoria quando o drawer desmonta e remonta no mesmo provider', async () => {
    askAgentMock.mockRejectedValueOnce(new Error('Erro preservado'))

    const user = userEvent.setup()
    const view = renderWithRouter(
      <AiAgentChatProvider>
        <ChatIADrawer />
      </AiAgentChatProvider>,
    )

    await user.type(findInput(), 'Pergunta instavel')
    await user.keyboard('{Enter}')

    expect(
      await screen.findByText('Ops, algo deu errado: Erro preservado'),
    ).toBeInTheDocument()

    view.rerender(
      <AiAgentChatProvider>
        <div>Outra tela</div>
      </AiAgentChatProvider>,
    )
    expect(
      screen.queryByText('Ops, algo deu errado: Erro preservado'),
    ).not.toBeInTheDocument()

    view.rerender(
      <AiAgentChatProvider>
        <ChatIADrawer />
      </AiAgentChatProvider>,
    )
    expect(
      await screen.findByText('Ops, algo deu errado: Erro preservado'),
    ).toBeInTheDocument()
  })

  it('mantem uma conversa separada por pagina do drawer', async () => {
    askAgentMock
      .mockResolvedValueOnce({
        status: 'success',
        session_id: 'sess-dashboard',
        user_response: {
          answer_text: 'Resposta do dashboard.',
          sources_text: null,
          data: null,
          chart: null,
          truncated: false,
        },
      })
      .mockResolvedValueOnce({
        status: 'success',
        session_id: 'sess-pedidos',
        user_response: {
          answer_text: 'Resposta de pedidos.',
          sources_text: null,
          data: null,
          chart: null,
          truncated: false,
        },
      })

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AiAgentChatProvider>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <>
                  <ChatIADrawer />
                  <Link to="/pedidos">Ir para pedidos</Link>
                </>
              }
            />
            <Route
              path="/pedidos"
              element={
                <>
                  <ChatIADrawer />
                  <Link to="/dashboard">Ir para dashboard</Link>
                </>
              }
            />
          </Routes>
        </AiAgentChatProvider>
      </MemoryRouter>,
    )

    await user.type(findInput(), 'Pergunta do dashboard')
    await user.keyboard('{Enter}')
    expect(await screen.findByText('Resposta do dashboard.')).toBeInTheDocument()

    await user.click(screen.getByText('Ir para pedidos'))
    expect(screen.queryByText('Pergunta do dashboard')).not.toBeInTheDocument()
    expect(screen.queryByText('Resposta do dashboard.')).not.toBeInTheDocument()
    expect(screen.getByText(/Olá! Como posso te ajudar/)).toBeInTheDocument()

    await user.type(findInput(), 'Pergunta de pedidos')
    await user.keyboard('{Enter}')
    expect(await screen.findByText('Resposta de pedidos.')).toBeInTheDocument()

    await user.click(screen.getByText('Ir para dashboard'))
    expect(await screen.findByText('Pergunta do dashboard')).toBeInTheDocument()
    expect(screen.getByText('Resposta do dashboard.')).toBeInTheDocument()
    expect(screen.queryByText('Pergunta de pedidos')).not.toBeInTheDocument()
    expect(screen.queryByText('Resposta de pedidos.')).not.toBeInTheDocument()
  })

  it('limpa mensagens transitorias quando um novo provider e montado', async () => {
    askAgentMock.mockRejectedValueOnce(new Error('Erro descartavel'))

    const user = userEvent.setup()
    const firstView = renderDrawer()

    await user.type(findInput(), 'Pergunta descartavel')
    await user.keyboard('{Enter}')

    expect(
      await screen.findByText('Ops, algo deu errado: Erro descartavel'),
    ).toBeInTheDocument()

    firstView.unmount()
    renderDrawer()

    expect(
      screen.queryByText('Ops, algo deu errado: Erro descartavel'),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/Olá! Como posso te ajudar/)).toBeInTheDocument()
  })

  it('inicia nova conversa pelo drawer e troca a sessao usada no envio', async () => {
    askAgentMock
      .mockResolvedValueOnce({
        status: 'success',
        session_id: 'sess-antiga',
        user_response: {
          answer_text: 'Resposta antiga.',
          sources_text: null,
          data: null,
          chart: null,
          truncated: false,
        },
      })
      .mockResolvedValueOnce({
        status: 'success',
        session_id: 'sess-nova',
        user_response: {
          answer_text: 'Resposta nova.',
          sources_text: null,
          data: null,
          chart: null,
          truncated: false,
        },
      })

    const user = userEvent.setup()
    renderDrawer()

    await user.type(findInput(), 'Pergunta antiga')
    await user.keyboard('{Enter}')

    expect(await screen.findByText('Resposta antiga.')).toBeInTheDocument()
    const firstSessionId = askAgentMock.mock.calls[0][1]

    await user.click(screen.getByRole('button', { name: /Nova conversa/ }))

    expect(screen.queryByText('Pergunta antiga')).not.toBeInTheDocument()
    expect(screen.queryByText('Resposta antiga.')).not.toBeInTheDocument()
    expect(screen.getByText(/Olá! Como posso te ajudar/)).toBeInTheDocument()

    await user.type(findInput(), 'Pergunta nova')
    await user.keyboard('{Enter}')

    expect(await screen.findByText('Resposta nova.')).toBeInTheDocument()
    expect(askAgentMock).toHaveBeenCalledTimes(2)
    expect(askAgentMock.mock.calls[1][1]).not.toBe(firstSessionId)
  })

  it('abre o historico no drawer e carrega uma conversa sem navegar', async () => {
    listSessionsMock.mockResolvedValueOnce([
      {
        session_id: 'sess-historico',
        title: 'Receita por categoria',
        updated_at: '2026-05-18T12:30:00.000Z',
      },
    ])
    getSessionDetailMock.mockResolvedValueOnce({
      session_id: 'sess-historico',
      history: [
        {
          role: 'user',
          content: 'Mostre a receita por categoria',
          sql: null,
          sources_text: null,
          data: null,
          chart: null,
        },
        {
          role: 'assistant',
          content: 'A categoria Alpha liderou a receita.',
          sql: null,
          sources_text: 'Fonte: pedidos e produtos.',
          data: [{ categoria: 'Alpha', receita: 1500 }],
          chart: null,
        },
      ],
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AiAgentChatProvider>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <>
                  <ChatIADrawer />
                  <div>Página dashboard</div>
                </>
              }
            />
            <Route path="/chat-ia" element={<div>Página ChatIA</div>} />
          </Routes>
        </AiAgentChatProvider>
      </MemoryRouter>,
    )

    await user.click(findTriggerButton())
    await user.click(screen.getAllByRole('button', { name: /Histórico/ })[0])

    expect(await screen.findByText('Receita por categoria')).toBeInTheDocument()
    expect(listSessionsMock).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: /Receita por categoria/ }))

    expect(getSessionDetailMock).toHaveBeenCalledWith('sess-historico')
    expect(
      await screen.findByText('Mostre a receita por categoria'),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('A categoria Alpha liderou a receita.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Página dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Página ChatIA')).not.toBeInTheDocument()
  })
})

// Garante que a re-exportacao `within` do test-utils nao quebra import noise.
void within
