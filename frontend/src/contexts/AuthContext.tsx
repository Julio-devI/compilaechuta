import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { loginRequest, verify2faCode, UserInfo } from '@/services/authService'

interface LoginResult {
  requires2fa: boolean
  tempToken?: string
}

interface AuthContextType {
  user: UserInfo | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<LoginResult>
  completeLogin: (tempToken: string, code: string) => Promise<void>
  logout: () => void
  hasRole: (...roles: string[]) => boolean
  updateUser: (data: Partial<UserInfo>) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const stored = localStorage.getItem('user')
    if (token && stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string): Promise<LoginResult> => {
    const data = await loginRequest(username, password)
    if (data.requires_2fa) {
      return { requires2fa: true, tempToken: data.temp_token }
    }
    localStorage.setItem('access_token', data.access_token!)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user!)
    return { requires2fa: false }
  }

  const completeLogin = async (tempToken: string, code: string): Promise<void> => {
    const data = await verify2faCode(tempToken, code)
    localStorage.setItem('access_token', data.access_token!)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user!)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const hasRole = (...roles: string[]) => {
    if (!user) return false
    return roles.includes(user.role)
  }

  const updateUser = (data: Partial<UserInfo>) => {
    setUser(prev => {
      if (!prev) return prev
      const updated = { ...prev, ...data }
      localStorage.setItem('user', JSON.stringify(updated))
      return updated
    })
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, completeLogin, logout, hasRole, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
