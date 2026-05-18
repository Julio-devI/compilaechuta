import { getAuthHeaders } from './authService'
import { apiUrl } from './apiConfig'

export type ChartValueFormat = 'percent' | 'currency' | 'number'
export type AiAgentPageContext =
  | 'dashboard'
  | 'clientes'
  | 'pedidos'
  | 'produtos'
  | 'suporte'
  | 'categorias'
  | 'relatorios'

export interface ChartSuggestion {
  type: 'bar' | 'line' | 'pie' | 'area'
  x_axis: string | null
  y_axis: string | null
  title: string
  y_axis_format?: ChartValueFormat | null
}

export interface UserResponse {
  answer_text: string
  sources_text: string | null
  data: Array<Record<string, unknown>> | null
  chart: ChartSuggestion | null
  truncated: boolean
}

export interface AgentResponse {
  status: 'success' | 'error' | 'out_of_scope'
  session_id: string
  user_response: UserResponse
}

export interface SuggestionsResponse {
  suggestions: string[]
}

export interface SessionSummary {
  session_id: string
  title: string
  updated_at: string
}

export interface SessionsListResponse {
  sessions: SessionSummary[]
}

export interface SessionHistoryEntry {
  role: 'user' | 'assistant'
  content: string
  sql: string | null
  sources_text?: string | null
  data?: Array<Record<string, unknown>> | null
  chart?: ChartSuggestion | null
}

export interface SessionDetail {
  session_id: string
  history: SessionHistoryEntry[]
}

function buildHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', ...getAuthHeaders() }
}

async function parseError(res: Response, fallback: string): Promise<never> {
  const err = await res.json().catch(() => ({ detail: fallback }))
  throw new Error(err.detail || fallback)
}

export async function askAgent(
  question: string,
  sessionId: string,
  pageContext?: AiAgentPageContext,
): Promise<AgentResponse> {
  const res = await fetch(apiUrl('/ai-agent/ask'), {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      question,
      session_id: sessionId,
      page_context: pageContext,
    }),
  })
  if (!res.ok) await parseError(res, 'Erro ao consultar o agente')
  return res.json()
}

export async function getSuggestions(
  sessionId: string = '',
): Promise<SuggestionsResponse> {
  const res = await fetch(apiUrl('/ai-agent/suggestions'), {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ session_id: sessionId }),
  })
  if (!res.ok) await parseError(res, 'Erro ao buscar sugestões')
  return res.json()
}

export async function listSessions(): Promise<SessionSummary[]> {
  const res = await fetch(apiUrl('/ai-agent/sessions'), {
    method: 'GET',
    headers: buildHeaders(),
  })
  if (!res.ok) await parseError(res, 'Erro ao listar sessões')
  const data: SessionsListResponse = await res.json()
  return data.sessions
}

export async function getSessionDetail(
  sessionId: string,
): Promise<SessionDetail> {
  const res = await fetch(
    apiUrl(`/ai-agent/sessions/${encodeURIComponent(sessionId)}`),
    { method: 'GET', headers: buildHeaders() },
  )
  if (!res.ok) await parseError(res, 'Erro ao carregar a conversa')
  return res.json()
}

export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(
    apiUrl(`/ai-agent/sessions/${encodeURIComponent(sessionId)}`),
    { method: 'DELETE', headers: buildHeaders() },
  )
  if (!res.ok) await parseError(res, 'Erro ao apagar a conversa')
}
