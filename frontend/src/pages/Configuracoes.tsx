import { useState } from 'react'
import { User, Bell, Shield, Palette, Globe, CreditCard, Building, Mail, Phone, Camera, Save, ChevronRight } from 'lucide-react'
import { useTheme, type Theme } from '../contexts/ThemeContext'

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

export function Configuracoes() {
  const [activeSection, setActiveSection] = useState('perfil')
  const { theme, setTheme } = useTheme()
  const [formData, setFormData] = useState({
    nome: 'João Silva',
    email: 'joao.silva@vcommerce.com',
    telefone: '(11) 99999-9999',
    cargo: 'Administrador',
    notificacoesEmail: true,
    notificacoesPush: true,
    notificacoesSMS: false,
    autenticacao2FA: true,
    idioma: 'pt-BR',
  })

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="p-8">
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

              <div className="flex items-center gap-6 mb-8 pb-8 border-b border-border">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold">
                    JS
                  </div>
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-card border border-border rounded-full flex items-center justify-center hover:bg-background transition-colors">
                    <Camera className="w-4 h-4 text-muted" />
                  </button>
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{formData.nome}</h3>
                  <p className="text-muted">{formData.cargo}</p>
                  <button className="mt-2 text-sm text-primary font-medium hover:underline">
                    Alterar foto
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Nome Completo</label>
                  <div className="relative">
                    <User className="w-5 h-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => handleChange('nome', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-background text-foreground rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Cargo</label>
                  <input
                    type="text"
                    value={formData.cargo}
                    onChange={(e) => handleChange('cargo', e.target.value)}
                    className="w-full px-4 py-3 bg-background text-foreground rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">E-mail</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-background text-foreground rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Telefone</label>
                  <div className="relative">
                    <Phone className="w-5 h-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={formData.telefone}
                      onChange={(e) => handleChange('telefone', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-background text-foreground rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors">
                  <Save className="w-5 h-5" />
                  Salvar Alterações
                </button>
              </div>
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
                        checked={formData.autenticacao2FA}
                        onChange={(e) => handleChange('autenticacao2FA', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  {formData.autenticacao2FA && (
                    <div className="flex items-center gap-2 text-sm text-success">
                      <Shield className="w-4 h-4" />
                      2FA está ativo — Sua conta está protegida
                    </div>
                  )}
                </div>

                {[
                  { label: 'Alterar Senha', sub: 'Última alteração há 30 dias', action: 'Alterar' },
                ].map((item) => (
                  <div key={item.label} className="p-4 border border-border rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{item.label}</p>
                        <p className="text-sm text-muted">{item.sub}</p>
                      </div>
                      <button className="flex items-center gap-2 text-primary font-medium hover:underline">
                        {item.action}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
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
