import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { DecorativePanel } from '../components/DecorativePanel'

export function Cadastro() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT — form ── */}
      <div className="flex-1 flex flex-col bg-white min-w-0">

        {/* Mobile top brand bar */}
        <div
          className="lg:hidden h-1.5 w-full shrink-0"
          style={{ background: 'linear-gradient(90deg, #0a1172, #1565C0)' }}
        />

        {/* Logo */}
        <div className="flex justify-center pt-8 lg:pt-10 pb-2 shrink-0">
          <img src="/logo.png" alt="VCommerce" className="h-7 sm:h-8" />
        </div>

        {/* Form */}
        <div className="flex flex-col justify-center flex-1 w-full max-w-2xl mx-auto px-6 sm:px-8 lg:px-12 py-6">

          <h1
            className="font-bold text-center text-2xl sm:text-[2rem] mb-8"
            style={{ color: '#1A237E' }}
          >
            Cadastro
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">

            {/* Nome completo */}
            <div>
              <label className="block text-sm font-semibold text-[#1A237E] mb-1.5">
                Nome completo
              </label>
              <input
                type="text"
                placeholder="Digite seu nome completo..."
                className="w-full h-11 px-4 rounded-xl text-sm placeholder:text-[#9BA3B8] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30"
                style={{ background: '#F5F5F5', border: 'none', color: '#37474F' }}
              />
            </div>

            {/* Nome de usuário */}
            <div>
              <label className="block text-sm font-semibold text-[#1A237E] mb-1.5">
                Nome de usuário
              </label>
              <input
                type="text"
                placeholder="Digite seu nome de usuário..."
                className="w-full h-11 px-4 rounded-xl text-sm placeholder:text-[#9BA3B8] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30"
                style={{ background: '#F5F5F5', border: 'none', color: '#37474F' }}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-[#1A237E] mb-1.5">
                Email
              </label>
              <input
                type="email"
                placeholder="Digite seu email..."
                className="w-full h-11 px-4 rounded-xl text-sm placeholder:text-[#9BA3B8] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30"
                style={{ background: '#F5F5F5', border: 'none', color: '#37474F' }}
              />
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-sm font-semibold text-[#1A237E] mb-1.5">
                Telefone
              </label>
              <input
                type="tel"
                placeholder="Digite seu telefone..."
                className="w-full h-11 px-4 rounded-xl text-sm placeholder:text-[#9BA3B8] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30"
                style={{ background: '#F5F5F5', border: 'none', color: '#37474F' }}
              />
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-semibold text-[#1A237E] mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Digite sua senha..."
                  className="w-full h-11 px-4 pr-11 rounded-xl text-sm placeholder:text-[#9BA3B8] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30"
                  style={{ background: '#F5F5F5', border: 'none', color: '#37474F' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9BA3B8] hover:text-[#64748B] transition-colors"
                >
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirme a senha */}
            <div>
              <label className="block text-sm font-semibold text-[#1A237E] mb-1.5">
                Confirme a senha
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirme sua senha..."
                  className="w-full h-11 px-4 pr-11 rounded-xl text-sm placeholder:text-[#9BA3B8] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30"
                  style={{ background: '#F5F5F5', border: 'none', color: '#37474F' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9BA3B8] hover:text-[#64748B] transition-colors"
                >
                  {showConfirm ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={e => setAcceptTerms(e.target.checked)}
                className="w-4 h-4 rounded accent-[#1565C0] cursor-pointer"
              />
              <span className="text-sm text-[#64748B]">
                Aceito os{' '}
                <a href="#" className="text-[#1565C0] font-semibold">Termos de Uso</a>
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptPrivacy}
                onChange={e => setAcceptPrivacy(e.target.checked)}
                className="w-4 h-4 rounded accent-[#1565C0] cursor-pointer"
              />
              <span className="text-sm text-[#64748B]">
                Aceito as{' '}
                <a href="#" className="text-[#1565C0] font-semibold">Políticas de Privacidade</a>
              </span>
            </label>
          </div>

          {/* Cadastrar button */}
          <button
            type="button"
            className="w-full h-11 sm:h-12 rounded-full text-white font-bold text-base transition-colors mt-5"
            style={{ background: '#1565C0' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1251A3')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1565C0')}
          >
            Cadastrar
          </button>

          {/* Sign in link */}
          <p className="text-sm text-center text-[#64748B] mt-4">
            Já tem um cadastro?{' '}
            <a href="/login" className="font-bold text-[#1565C0]">
              Faça o Login →
            </a>
          </p>
        </div>
      </div>

      {/* ── RIGHT — decorative panel ── */}
      <DecorativePanel flip />

    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
