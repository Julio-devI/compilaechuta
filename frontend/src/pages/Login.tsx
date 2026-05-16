import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { SplashScreen } from '../components/SplashScreen'
import { DecorativePanel } from '../components/DecorativePanel'
import { useAuth } from '@/contexts/AuthContext'

export function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [splashDone, setSplashDone] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    if (!username.trim()) {
      toast.error('Informe seu usuário ou email.')
      return
    }
    if (!password.trim()) {
      toast.error('Informe sua senha.')
      return
    }

    setIsLoading(true)
    try {
      await login(username.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao fazer login.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}

      <div className="min-h-screen flex">

        <DecorativePanel />

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 flex flex-col bg-white min-w-0">

          {/* Mobile-only top brand bar */}
          <div
            className="lg:hidden h-1.5 w-full shrink-0"
            style={{ background: 'linear-gradient(90deg, #0a1172, #1565C0)' }}
          />

          {/* Logo */}
          <div className="flex justify-center pt-8 lg:pt-10 pb-2 shrink-0">
            <img src="/logo.png" alt="VCommerce" className="h-7 sm:h-8" />
          </div>

          {/* Form */}
          <div className="flex flex-col justify-center flex-1 w-full max-w-sm mx-auto px-6 sm:px-4 lg:px-0 py-8">

            <h1
              className="font-bold leading-tight mb-2 text-2xl sm:text-[2rem]"
              style={{ color: '#1A237E' }}
            >
              Bem vindo(a) de volta!
            </h1>
            <p
              className="leading-snug mb-8 sm:mb-10 text-base sm:text-xl"
              style={{ color: '#37474F' }}
            >
              Qual será a visão estratégica de hoje?
            </p>

            <div className="space-y-4 sm:space-y-5">

              {/* Username / Email */}
              <div>
                <label className="block text-sm font-semibold text-[#1A237E] mb-1.5">
                  Usuário ou Email
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Digite seu usuário ou email..."
                  className="w-full h-11 sm:h-12 px-4 rounded-xl text-sm placeholder:text-[#9BA3B8] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30"
                  style={{ background: '#F5F5F5', border: 'none' }}
                  disabled={isLoading}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-[#1A237E] mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="Digite sua senha..."
                    className="w-full h-11 sm:h-12 px-4 pr-12 rounded-xl text-sm placeholder:text-[#9BA3B8] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30"
                    style={{ background: '#F5F5F5', border: 'none' }}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9BA3B8] hover:text-[#64748B] transition-colors"
                  >
                    {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div className="flex justify-end">
                <a href="/esqueci-senha" className="text-sm font-semibold text-[#1565C0]">
                  Esqueceu a senha?
                </a>
              </div>

              {/* Login button */}
              <button
                type="button"
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full h-11 sm:h-12 rounded-full text-white font-bold text-base transition-colors mt-1 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ background: '#1565C0' }}
                onMouseEnter={e => !isLoading && (e.currentTarget.style.background = '#1251A3')}
                onMouseLeave={e => (e.currentTarget.style.background = '#1565C0')}
              >
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {isLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
