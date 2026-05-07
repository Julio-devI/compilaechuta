import { useState } from 'react'
import { User, Bell, Shield, Palette, Globe, CreditCard, Building, Mail, Phone, Camera, Save, ChevronRight } from 'lucide-react'

const menuItems = [
  { id: 'perfil', icon: User, label: 'Perfil' },
  { id: 'notificacoes', icon: Bell, label: 'Notificações' },
  { id: 'seguranca', icon: Shield, label: 'Segurança' },
  { id: 'aparencia', icon: Palette, label: 'Aparência' },
  { id: 'empresa', icon: Building, label: 'Empresa' },
  { id: 'pagamentos', icon: CreditCard, label: 'Pagamentos' },
  { id: 'idioma', icon: Globe, label: 'Idioma e Região' },
]

export function Configuracoes() {
  const [activeSection, setActiveSection] = useState('perfil')
  const [formData, setFormData] = useState({
    nome: 'João Silva',
    email: 'joao.silva@vcommerce.com',
    telefone: '(11) 99999-9999',
    cargo: 'Administrador',
    empresa: 'V-Commerce Brasil',
    cnpj: '12.345.678/0001-90',
    endereco: 'Av. Paulista, 1000 - São Paulo, SP',
    notificacoesEmail: true,
    notificacoesPush: true,
    notificacoesSMS: false,
    autenticacao2FA: true,
    tema: 'claro',
    idioma: 'pt-BR',
  })

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1E293B]">Configurações</h1>
        <p className="text-[#64748B] mt-1">Gerencie suas preferências e configurações da conta</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Menu */}
        <div className="w-64 bg-white rounded-2xl border border-[#E2E8F0] p-4 h-fit">
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    activeSection === item.id 
                      ? 'bg-[#1E5EFF] text-white' 
                      : 'text-[#64748B] hover:bg-[#F8FAFC]'
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
        <div className="flex-1 bg-white rounded-2xl border border-[#E2E8F0] p-6">
          {activeSection === 'perfil' && (
            <div>
              <h2 className="text-xl font-bold text-[#1E293B] mb-6">Informações do Perfil</h2>
              
              {/* Avatar */}
              <div className="flex items-center gap-6 mb-8 pb-8 border-b border-[#E2E8F0]">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-[#1E5EFF] flex items-center justify-center text-white text-2xl font-bold">
                    JS
                  </div>
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-white border border-[#E2E8F0] rounded-full flex items-center justify-center hover:bg-[#F8FAFC] transition-colors">
                    <Camera className="w-4 h-4 text-[#64748B]" />
                  </button>
                </div>
                <div>
                  <h3 className="font-bold text-[#1E293B]">{formData.nome}</h3>
                  <p className="text-[#64748B]">{formData.cargo}</p>
                  <button className="mt-2 text-sm text-[#1E5EFF] font-medium hover:underline">
                    Alterar foto
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">Nome Completo</label>
                  <div className="relative">
                    <User className="w-5 h-5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => handleChange('nome', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#1E5EFF]/20 focus:border-[#1E5EFF]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">Cargo</label>
                  <input
                    type="text"
                    value={formData.cargo}
                    onChange={(e) => handleChange('cargo', e.target.value)}
                    className="w-full px-4 py-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#1E5EFF]/20 focus:border-[#1E5EFF]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">E-mail</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#1E5EFF]/20 focus:border-[#1E5EFF]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">Telefone</label>
                  <div className="relative">
                    <Phone className="w-5 h-5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={formData.telefone}
                      onChange={(e) => handleChange('telefone', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#1E5EFF]/20 focus:border-[#1E5EFF]"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button className="flex items-center gap-2 bg-[#1E5EFF] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#1E5EFF]/90 transition-colors">
                  <Save className="w-5 h-5" />
                  Salvar Alterações
                </button>
              </div>
            </div>
          )}

          {activeSection === 'notificacoes' && (
            <div>
              <h2 className="text-xl font-bold text-[#1E293B] mb-6">Preferências de Notificações</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#1E5EFF]/10 rounded-xl flex items-center justify-center">
                      <Mail className="w-5 h-5 text-[#1E5EFF]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#1E293B]">Notificações por E-mail</p>
                      <p className="text-sm text-[#64748B]">Receba atualizações importantes por e-mail</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notificacoesEmail}
                      onChange={(e) => handleChange('notificacoesEmail', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#E2E8F0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1E5EFF]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#00C48C]/10 rounded-xl flex items-center justify-center">
                      <Bell className="w-5 h-5 text-[#00C48C]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#1E293B]">Notificações Push</p>
                      <p className="text-sm text-[#64748B]">Receba notificações em tempo real no navegador</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notificacoesPush}
                      onChange={(e) => handleChange('notificacoesPush', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#E2E8F0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1E5EFF]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#8B5CF6]/10 rounded-xl flex items-center justify-center">
                      <Phone className="w-5 h-5 text-[#8B5CF6]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#1E293B]">Notificações SMS</p>
                      <p className="text-sm text-[#64748B]">Receba alertas importantes por SMS</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notificacoesSMS}
                      onChange={(e) => handleChange('notificacoesSMS', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#E2E8F0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1E5EFF]"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'seguranca' && (
            <div>
              <h2 className="text-xl font-bold text-[#1E293B] mb-6">Segurança da Conta</h2>
              
              <div className="space-y-6">
                <div className="p-4 bg-[#F8FAFC] rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium text-[#1E293B]">Autenticação de Dois Fatores (2FA)</p>
                      <p className="text-sm text-[#64748B]">Adicione uma camada extra de segurança à sua conta</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.autenticacao2FA}
                        onChange={(e) => handleChange('autenticacao2FA', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#E2E8F0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1E5EFF]"></div>
                    </label>
                  </div>
                  {formData.autenticacao2FA && (
                    <div className="flex items-center gap-2 text-sm text-[#00C48C]">
                      <Shield className="w-4 h-4" />
                      2FA está ativo - Sua conta está protegida
                    </div>
                  )}
                </div>

                <div className="p-4 border border-[#E2E8F0] rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#1E293B]">Alterar Senha</p>
                      <p className="text-sm text-[#64748B]">Última alteração há 30 dias</p>
                    </div>
                    <button className="flex items-center gap-2 text-[#1E5EFF] font-medium hover:underline">
                      Alterar
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 border border-[#E2E8F0] rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#1E293B]">Sessões Ativas</p>
                      <p className="text-sm text-[#64748B]">3 dispositivos conectados</p>
                    </div>
                    <button className="flex items-center gap-2 text-[#1E5EFF] font-medium hover:underline">
                      Gerenciar
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'aparencia' && (
            <div>
              <h2 className="text-xl font-bold text-[#1E293B] mb-6">Aparência</h2>
              
              <div>
                <p className="font-medium text-[#1E293B] mb-4">Tema</p>
                <div className="grid grid-cols-3 gap-4">
                  {['claro', 'escuro', 'sistema'].map((tema) => (
                    <button
                      key={tema}
                      onClick={() => handleChange('tema', tema)}
                      className={`p-4 rounded-xl border-2 transition-colors ${
                        formData.tema === tema 
                          ? 'border-[#1E5EFF] bg-[#1E5EFF]/5' 
                          : 'border-[#E2E8F0] hover:border-[#94A3B8]'
                      }`}
                    >
                      <div className={`w-full h-20 rounded-lg mb-3 ${
                        tema === 'claro' ? 'bg-[#F8FAFC]' : 
                        tema === 'escuro' ? 'bg-[#1E293B]' : 
                        'bg-gradient-to-r from-[#F8FAFC] to-[#1E293B]'
                      }`} />
                      <p className="font-medium text-[#1E293B] capitalize">{tema}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'empresa' && (
            <div>
              <h2 className="text-xl font-bold text-[#1E293B] mb-6">Informações da Empresa</h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">Nome da Empresa</label>
                  <input
                    type="text"
                    value={formData.empresa}
                    onChange={(e) => handleChange('empresa', e.target.value)}
                    className="w-full px-4 py-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#1E5EFF]/20 focus:border-[#1E5EFF]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">CNPJ</label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => handleChange('cnpj', e.target.value)}
                    className="w-full px-4 py-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#1E5EFF]/20 focus:border-[#1E5EFF]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">Endereço</label>
                  <input
                    type="text"
                    value={formData.endereco}
                    onChange={(e) => handleChange('endereco', e.target.value)}
                    className="w-full px-4 py-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#1E5EFF]/20 focus:border-[#1E5EFF]"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button className="flex items-center gap-2 bg-[#1E5EFF] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#1E5EFF]/90 transition-colors">
                  <Save className="w-5 h-5" />
                  Salvar Alterações
                </button>
              </div>
            </div>
          )}

          {(activeSection === 'pagamentos' || activeSection === 'idioma') && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#F8FAFC] rounded-full flex items-center justify-center mx-auto mb-4">
                  {activeSection === 'pagamentos' ? <CreditCard className="w-8 h-8 text-[#94A3B8]" /> : <Globe className="w-8 h-8 text-[#94A3B8]" />}
                </div>
                <p className="text-[#64748B]">Esta seção está em desenvolvimento</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
