import { useState, useEffect } from 'react'
import { User, Shield, Palette, Mail, Phone, Save, ChevronRight, Loader2 } from 'lucide-react'
import { useTheme, type Theme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { getMe, updateMe } from '../services/authService'
import { toast, Toaster } from 'react-hot-toast'

const menuItems = [
  { id: 'perfil', icon: User, label: 'Perfil' },
  { id: 'seguranca', icon: Shield, label: 'Segurança' },
  { id: 'aparencia', icon: Palette, label: 'Aparência' },
]

const TEMA_OPTIONS: { label: string; value: Theme; preview: string }[] = [
  { label: 'Claro', value: 'light', preview: 'bg-[#F8FAFC]' },
  { label: 'Escuro', value: 'dark', preview: 'bg-[#1E293B]' },
  { label: 'Sistema', value: 'system', preview: 'bg-linear-to-r from-[#F8FAFC] to-[#1E293B]' },
]

const roleLabel: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  user: 'Operador',
}

export function Configuracoes() {
  const [activeSection, setActiveSection] = useState('perfil')
  const { theme, setTheme } = useTheme()
  const { user, updateUser } = useAuth()

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
  })
  const [isFetching, setIsFetching] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [autenticacao2FA, setAutenticacao2FA] = useState(true)

  useEffect(() => {
    getMe()
      .then(me => {
        setFormData({
          nome: me.nome ?? '',
          email: me.email ?? '',
          telefone: me.telefone ?? '',
        })
      })
      .catch(() => {
        if (user) {
          setFormData({
            nome: user.nome ?? '',
            email: user.email ?? '',
            telefone: user.telefone ?? '',
          })
        }
      })
      .finally(() => setIsFetching(false))
  }, [user])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updated = await updateMe({
        nome: formData.nome || undefined,
        email: formData.email || undefined,
        telefone: formData.telefone || null,
      })
      updateUser({ nome: updated.nome, email: updated.email, telefone: updated.telefone })
      toast.success('Perfil atualizado com sucesso!')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar alterações')
    } finally {
      setIsSaving(false)
    }
  }

  const initials = formData.nome
    ? formData.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : '??'

  const isEmpty = (val: string) => !val || val.trim() === ''

  return (
    <div className="p-8">
      <Toaster position="top-right" />
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted mt-1">Gerencie suas preferências e configurações da conta</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Menu */}
        <div className="w-64 bg-card rounded-2xl border border-border p-4 h-fit">
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    activeSection === item.id
                      ? 'bg-primary text-white'
                      : 'text-muted hover:bg-background'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-card rounded-2xl border border-border p-6">

          {/* Perfil */}
          {activeSection === 'perfil' && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-6">Informações do Perfil</h2>

              {isFetching ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* Avatar + nome + role */}
                  <div className="flex items-center gap-6 mb-8 pb-8 border-b border-border">
                    <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold shrink-0">
                      {initials}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-lg">{formData.nome || '—'}</h3>
                      <p className="text-muted text-sm">{user ? roleLabel[user.role] ?? user.role : '—'}</p>
                      <p className="text-xs text-muted-foreground mt-1">@{user?.username}</p>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Nome Completo</label>
                      <div className="relative">
                        <User className="w-5 h-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={formData.nome}
                          onChange={(e) => setFormData(p => ({ ...p, nome: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 bg-background text-foreground rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Cargo / Função</label>
                      <input
                        type="text"
                        value={user ? (roleLabel[user.role] ?? user.role) : '—'}
                        disabled
                        className="w-full px-4 py-3 bg-background text-muted-foreground rounded-xl border border-border opacity-60 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        E-mail
                        {isEmpty(formData.email) && (
                          <span className="ml-2 text-[10px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full">Não cadastrado</span>
                        )}
                      </label>
                      <div className="relative">
                        <Mail className="w-5 h-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                          placeholder="seu@email.com"
                          className={`w-full pl-10 pr-4 py-3 bg-background text-foreground rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                            isEmpty(formData.email) ? 'border-amber-300' : 'border-border'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Telefone
                        {isEmpty(formData.telefone) && (
                          <span className="ml-2 text-[10px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full">Não cadastrado</span>
                        )}
                      </label>
                      <div className="relative">
                        <Phone className="w-5 h-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          value={formData.telefone}
                          onChange={(e) => setFormData(p => ({ ...p, telefone: e.target.value }))}
                          placeholder="(00) 00000-0000"
                          className={`w-full pl-10 pr-4 py-3 bg-background text-foreground rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                            isEmpty(formData.telefone) ? 'border-amber-300' : 'border-border'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                    >
                      {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Segurança */}
          {activeSection === 'seguranca' && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-6">Segurança da Conta</h2>

              <div className="space-y-6">
                <div className="p-4 bg-background rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium text-foreground">Autenticação de Dois Fatores (2FA)</p>
                      <p className="text-sm text-muted">Adicione uma camada extra de segurança à sua conta</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autenticacao2FA}
                        onChange={(e) => setAutenticacao2FA(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  {autenticacao2FA && (
                    <div className="flex items-center gap-2 text-sm text-success">
                      <Shield className="w-4 h-4" />
                      2FA está ativo — Sua conta está protegida
                    </div>
                  )}
                </div>

                <div className="p-4 border border-border rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Alterar Senha</p>
                      <p className="text-sm text-muted">Última alteração há 30 dias</p>
                    </div>
                    <button className="flex items-center gap-2 text-primary font-medium hover:underline">
                      Alterar
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aparência */}
          {activeSection === 'aparencia' && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-6">Aparência</h2>

              <div>
                <p className="font-medium text-foreground mb-4">Tema</p>
                <div className="grid grid-cols-3 gap-4">
                  {TEMA_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setTheme(opt.value)}
                      className={`p-4 rounded-xl border-2 transition-colors ${
                        theme === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <div className={`w-full h-20 rounded-lg mb-3 ${opt.preview}`} />
                      <p className="font-medium text-foreground">{opt.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
