const API_BASE = 'http://127.0.0.1:8000/api/v1'

export type UserRole = 'super_admin' | 'admin' | 'user'

export interface UserInfo {
  id_operador:    string
  nome:           string
  username:       string
  email:          string
  telefone?:      string | null
  role:           UserRole
  two_fa_enabled: boolean
}

export interface LoginResponse {
  access_token?: string
  token_type?: string
  user?: UserInfo
  requires_2fa?: boolean
  temp_token?: string
}

export async function loginRequest(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao fazer login' }))
    throw new Error(err.detail || 'Erro ao fazer login')
  }
  return res.json()
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function forgotPasswordRequest(email: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/esqueci-senha`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao enviar email' }))
    throw new Error(err.detail || 'Erro ao enviar email')
  }
}

export async function resetPasswordRequest(token: string, new_password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/redefinir-senha`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, new_password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao redefinir senha' }))
    throw new Error(err.detail || 'Erro ao redefinir senha')
  }
}

export async function getMe(): Promise<UserInfo> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { ...getAuthHeaders() },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao buscar perfil' }))
    throw new Error(err.detail || 'Erro ao buscar perfil')
  }
  return res.json()
}

export async function verify2faCode(tempToken: string, code: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/verify-2fa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ temp_token: tempToken, code }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Código inválido' }))
    throw new Error(err.detail || 'Código inválido')
  }
  return res.json()
}

export async function toggle2fa(enabled: boolean): Promise<UserInfo> {
  const res = await fetch(`${API_BASE}/auth/me/toggle-2fa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ enabled }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao atualizar 2FA' }))
    throw new Error(err.detail || 'Erro ao atualizar 2FA')
  }
  return res.json()
}

export async function updateMe(data: { nome?: string; email?: string; telefone?: string | null }): Promise<UserInfo> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao salvar perfil' }))
    throw new Error(err.detail || 'Erro ao salvar perfil')
  }
  return res.json()
}
