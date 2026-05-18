import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  askAgent,
  deleteSession,
  getSessionDetail,
  getSuggestions,
  listSessions,
} from './aiAgentService'
import { apiUrl } from './apiConfig'

vi.mock('./authService', () => ({
  getAuthHeaders: () => ({ Authorization: 'Bearer tok' }),
}))

function mockFetchOk(body: unknown): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function mockFetchErr(status: number, detail?: string): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => (detail ? { detail } : {}),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function mockFetchErrInvalidJson(status: number): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => {
      throw new Error('invalid json')
    },
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  vi.resetAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('askAgent', () => {
  it('posta question e session_id com headers de auth e retorna o body parseado', async () => {
    const payload = {
      status: 'success' as const,
      session_id: 's1',
      user_response: {
        answer_text: 'ok',
        sources_text: null,
        data: null,
        chart: null,
        truncated: false,
      },
    }
    const fetchMock = mockFetchOk(payload)

    const result = await askAgent('Qual?', 's1')

    expect(result).toEqual(payload)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe(apiUrl('/ai-agent/ask'))
    expect(options.method).toBe('POST')
    expect(options.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer tok',
    })
    expect(JSON.parse(options.body)).toEqual({
      question: 'Qual?',
      session_id: 's1',
    })
  })

  it('lanca Error com detail quando fetch retorna nao-ok', async () => {
    mockFetchErr(500, 'Servidor caiu')
    await expect(askAgent('x', 's1')).rejects.toThrow('Servidor caiu')
  })

  it('usa mensagem fallback quando o corpo do erro nao e JSON valido', async () => {
    mockFetchErrInvalidJson(500)
    await expect(askAgent('x', 's1')).rejects.toThrow('Erro ao consultar o agente')
  })
})

describe('getSuggestions', () => {
  it('posta session_id padrao vazio quando nenhum argumento e passado', async () => {
    const fetchMock = mockFetchOk({ suggestions: ['a', 'b'] })

    const result = await getSuggestions()

    expect(result).toEqual({ suggestions: ['a', 'b'] })
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe(apiUrl('/ai-agent/suggestions'))
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ session_id: '' })
  })

  it('lanca Error com fallback em caso de falha', async () => {
    mockFetchErrInvalidJson(503)
    await expect(getSuggestions('s1')).rejects.toThrow('Erro ao buscar sugestões')
  })
})

describe('listSessions', () => {
  it('faz GET em /sessions e retorna apenas o array sessions do envelope', async () => {
    const fetchMock = mockFetchOk({
      sessions: [
        { session_id: 's1', title: 't1', updated_at: '2026-05-17T12:00:00Z' },
      ],
    })

    const result = await listSessions()

    expect(result).toEqual([
      { session_id: 's1', title: 't1', updated_at: '2026-05-17T12:00:00Z' },
    ])
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe(apiUrl('/ai-agent/sessions'))
    expect(options.method).toBe('GET')
    expect(options.headers).toMatchObject({ Authorization: 'Bearer tok' })
  })

  it('lanca Error com fallback em caso de falha', async () => {
    mockFetchErrInvalidJson(500)
    await expect(listSessions()).rejects.toThrow('Erro ao listar sessões')
  })
})

describe('getSessionDetail', () => {
  it('codifica o session_id na URL para evitar quebra de path', async () => {
    const fetchMock = mockFetchOk({ session_id: 'a/b c', history: [] })

    await getSessionDetail('a/b c')

    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe(apiUrl('/ai-agent/sessions/a%2Fb%20c'))
  })

  it('lanca Error com detail quando o backend responde 404', async () => {
    mockFetchErr(404, 'Sessão não encontrada.')
    await expect(getSessionDetail('s1')).rejects.toThrow('Sessão não encontrada.')
  })
})

describe('deleteSession', () => {
  it('faz DELETE com session_id codificado e resolve void quando ok', async () => {
    const fetchMock = mockFetchOk({})

    await expect(deleteSession('s 1')).resolves.toBeUndefined()

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe(apiUrl('/ai-agent/sessions/s%201'))
    expect(options.method).toBe('DELETE')
  })

  it('lanca Error com detail quando o backend responde 404', async () => {
    mockFetchErr(404, 'Sessão não encontrada.')
    await expect(deleteSession('s1')).rejects.toThrow('Sessão não encontrada.')
  })
})
