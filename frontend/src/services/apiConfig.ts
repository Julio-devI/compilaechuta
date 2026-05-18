const DEFAULT_API_BASE_URL = '/api/v1'
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

export const API_BASE_URL = (
  configuredApiBaseUrl || DEFAULT_API_BASE_URL
).replace(/\/+$/, '')

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}
