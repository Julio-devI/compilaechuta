import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'
import { DecorativePanel } from '../components/DecorativePanel'

export function EsqueciSenha() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)

  const handleEnviar = () => {
    if (!email.trim()) return
    setEnviado(true)
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

          {!enviado ? (
            <>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="flex items-center gap-1.5 text-sm font-semibold mb-8 w-fit transition-colors"
                style={{ color: '#1565C0' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1251A3')}
                onMouseLeave={e => (e.currentTarget.style.color = '#1565C0')}
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para o login
              </button>

              <h1
                className="font-bold leading-tight mb-2 text-2xl sm:text-[2rem]"
                style={{ color: '#1A237E' }}
              >
                Esqueceu a senha?
              </h1>
              <p
                className="leading-snug mb-8 sm:mb-10 text-base sm:text-xl"
                style={{ color: '#37474F' }}
              >
                Sem problemas. Enviaremos um link de recuperação para o seu email.
              </p>

              <div className="space-y-4 sm:space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-[#1A237E] mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleEnviar()}
                    placeholder="Digite seu email..."
                    className="w-full h-11 sm:h-12 px-4 rounded-xl text-sm placeholder:text-[#9BA3B8] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30"
                    style={{ background: '#F5F5F5', border: 'none' }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleEnviar}
                  className="w-full h-11 sm:h-12 rounded-full text-white font-bold text-base transition-colors mt-1"
                  style={{ background: '#1565C0' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1251A3')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#1565C0')}
                >
                  Enviar link de recuperação
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
                Email enviado!
              </h1>
              <p
                className="leading-snug mb-2 text-base sm:text-xl"
                style={{ color: '#37474F' }}
              >
                Enviamos um link de recuperação para
              </p>
              <div className="flex items-center gap-2 mb-8">
                <Mail className="w-4 h-4 shrink-0" style={{ color: '#1565C0' }} />
                <span className="text-sm font-semibold" style={{ color: '#1565C0' }}>
                  {email}
                </span>
              </div>

              <p className="text-sm text-[#64748B] mb-6">
                Não recebeu o email? Verifique sua pasta de spam ou{' '}
                <button
                  type="button"
                  className="font-bold transition-colors"
                  style={{ color: '#1565C0' }}
                  onClick={() => setEnviado(false)}
                >
                  tente novamente
                </button>
                .
              </p>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full h-11 sm:h-12 rounded-full text-white font-bold text-base transition-colors"
                style={{ background: '#1565C0' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1251A3')}
                onMouseLeave={e => (e.currentTarget.style.background = '#1565C0')}
              >
                Voltar para o login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
