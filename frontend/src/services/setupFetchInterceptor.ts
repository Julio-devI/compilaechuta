const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/esqueci-senha',
  '/auth/redefinir-senha',
]

export const AUTH_EXPIRED_EVENT = 'auth:expired'

let installed = false

export function installFetchInterceptor(): void {
  if (installed) return
  installed = true

  const originalFetch = window.fetch.bind(window)
  window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
    const response = await originalFetch(...args)
    if (response.status === 401) {
      const input = args[0]
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url
      const isPublicAuth = PUBLIC_AUTH_PATHS.some(path => url.includes(path))
      const hasToken = !!localStorage.getItem('access_token')
      if (!isPublicAuth && hasToken) {
        window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
      }
    }
    return response
  }
}
