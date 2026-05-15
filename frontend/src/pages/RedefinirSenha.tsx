import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { DecorativePanel } from '../components/DecorativePanel'
import { resetPasswordRequest } from '../services/authService'

export function RedefinirSenha() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [showNova, setShowNova] = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)
  const [loading, setLoading] = useState(false)
  const [concluido, setConcluido] = useState(false)

  const handleRedefinir = async () => {
    if (!novaSenha || !confirmarSenha) {
      toast.error('Preencha os dois campos')
      return
    }
    if (novaSenha !== confirmarSenha) {
      toast.error('As senhas não coincidem')
      return
    }
    if (novaSenha.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }
    if (!token) {
      toast.error('Link inválido ou expirado. Solicite um novo.')
      return
    }

    setLoading(true)
    try {
      await resetPasswordRequest(token, novaSenha)
      setConcluido(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao redefinir senha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <DecorativePanel />

      <div className="flex-1 flex flex-col bg-white min-w-0">
        <div
          className="lg:hidden h-1.5 w-full shrink-0"
          style={{ background: 'linear-gradient(90deg, #0a1172, #1565C0)' }}
        />

        <div className="flex justify-center pt-8 lg:pt-10 pb-2 shrink-0">
          <img src="/logo.png" alt="VCommerce" className="h-7 sm:h-8" />
        </div>

        <div className="flex flex-col justify-start flex-1 w-full max-w-sm mx-auto px-6 sm:px-4 lg:px-0 pt-26 pb-8">

          {!concluido ? (
            <>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-6"
                style={{ background: '#EFF6FF' }}
              >
                <KeyRound className="w-6 h-6" style={{ color: '#1565C0' }} />
              </div>

              <h1
                className="font-bold leading-tight mb-2 text-2xl sm:text-[2rem]"
                style={{ color: '#1A237E' }}
              >
                Crie uma nova senha
              </h1>
              <p
                className="leading-snug mb-8 sm:mb-10 text-base sm:text-xl"
                style={{ color: '#37474F' }}
              >
                Sua nova senha deve ter pelo menos 6 caracteres.
              </p>

              <div className="space-y-4 sm:space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-[#1A237E] mb-1.5">
                    Nova senha
                  </label>
                  <div className="relative">
                    <input
                      type={showNova ? 'text' : 'password'}
                      value={novaSenha}
                      onChange={e => setNovaSenha(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRedefinir()}
                      placeholder="Digite sua nova senha..."
                      className="w-full h-11 sm:h-12 px-4 pr-11 rounded-xl text-sm placeholder:text-[#9BA3B8] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30"
                      style={{ background: '#F5F5F5', border: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNova(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9BA3B8] hover:text-[#37474F] transition-colors"
                      tabIndex={-1}
                    >
                      {showNova ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#1A237E] mb-1.5">
                    Confirmar senha
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmar ? 'text' : 'password'}
                      value={confirmarSenha}
                      onChange={e => setConfirmarSenha(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRedefinir()}
                      placeholder="Confirme sua nova senha..."
                      className="w-full h-11 sm:h-12 px-4 pr-11 rounded-xl text-sm placeholder:text-[#9BA3B8] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30"
                      style={{ background: '#F5F5F5', border: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmar(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9BA3B8] hover:text-[#37474F] transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRedefinir}
                  disabled={loading}
                  className="w-full h-11 sm:h-12 rounded-full text-white font-bold text-base transition-colors mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: '#1565C0' }}
                  onMouseEnter={e => !loading && (e.currentTarget.style.background = '#1251A3')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#1565C0')}
                >
                  {loading ? 'Salvando...' : 'Redefinir senha'}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
                style={{ background: '#EFF6FF' }}
              >
                <CheckCircle className="w-8 h-8" style={{ color: '#1565C0' }} />
              </div>

              <h1
                className="font-bold leading-tight mb-2 text-2xl sm:text-[2rem]"
                style={{ color: '#1A237E' }}
              >
                Senha redefinida!
              </h1>
              <p
                className="leading-snug mb-8 text-base sm:text-xl"
                style={{ color: '#37474F' }}
              >
                Sua senha foi alterada com sucesso. Você já pode fazer login com a nova senha.
              </p>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full h-11 sm:h-12 rounded-full text-white font-bold text-base transition-colors"
                style={{ background: '#1565C0' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1251A3')}
                onMouseLeave={e => (e.currentTarget.style.background = '#1565C0')}
              >
                Ir para o login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
