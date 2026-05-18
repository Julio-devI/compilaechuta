import { getAuthHeaders } from './authService'
import { apiUrl } from './apiConfig'

export type OperatorRole = 'super_admin' | 'admin' | 'user'

export interface Operator {
  id_operador: string
  nome: string
  username: string
  email: string
  telefone: string | null
  role: OperatorRole
  active: boolean
  created_at: string | null
}

export interface OperatorCreate {
  nome: string
  username: string
  email: string
  telefone?: string
  role: OperatorRole
  active: boolean
  password: string
}

export interface OperatorUpdate {
  nome?: string
  username?: string
  email?: string
  telefone?: string
  role?: OperatorRole
  active?: boolean
  password?: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro na requisição' }))
    throw new Error(err.detail || 'Erro na requisição')
  }
  return res.json()
}

export async function listOperators(params?: {
  skip?: number
  limit?: number
  search?: string
  role?: string
  active?: boolean
}): Promise<{ total: number; items: Operator[] }> {
  const qs = new URLSearchParams()
  if (params?.skip !== undefined) qs.set('skip', String(params.skip))
  if (params?.limit !== undefined) qs.set('limit', String(params.limit))
  if (params?.search) qs.set('search', params.search)
  if (params?.role) qs.set('role', params.role)
  if (params?.active !== undefined) qs.set('active', String(params.active))
  return request(`/operators/?${qs}`)
}

export async function createOperator(data: OperatorCreate): Promise<Operator> {
  return request('/operators/', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateOperator(id: string, data: OperatorUpdate): Promise<Operator> {
  return request(`/operators/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function deleteOperator(id: string): Promise<Operator> {
  return request(`/operators/${id}`, { method: 'DELETE' })
}
