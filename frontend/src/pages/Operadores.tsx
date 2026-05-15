import { useState, useEffect, useCallback } from 'react'
import {
  Search, Plus, Pencil, Trash2, UserCheck, UserX, X, Eye, EyeOff, ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import {
  listOperators, createOperator, updateOperator, deleteOperator,
  type Operator, type OperatorRole,
} from '@/services/operatorApiService'

const ROLE_LABELS: Record<OperatorRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  user: 'Operador',
}

const ROLE_COLORS: Record<OperatorRole, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  user: 'bg-gray-100 text-gray-600',
}

const EMPTY_FORM = {
  nome: '',
  username: '',
  email: '',
  telefone: '',
  role: 'user' as OperatorRole,
  active: true,
  password: '',
  confirmPassword: '',
}

export function Operadores() {
  const { user: currentUser } = useAuth()
  const isSuperAdmin = currentUser?.role === 'super_admin'

  const [operators, setOperators] = useState<Operator[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterActive, setFilterActive] = useState<'' | 'true' | 'false'>('')

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Operator | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Operator | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchOperators = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: Record<string, unknown> = { limit: 100 }
      if (search) params.search = search
      if (filterRole) params.role = filterRole
      if (filterActive !== '') params.active = filterActive === 'true'
      const data = await listOperators(params)
      setOperators(data.items)
      setTotal(data.total)
    } catch {
      toast.error('Erro ao carregar operadores.')
    } finally {
      setIsLoading(false)
    }
  }, [search, filterRole, filterActive])

  useEffect(() => {
    fetchOperators()
  }, [fetchOperators])

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setShowPassword(false)
    setShowConfirm(false)
    setShowModal(true)
  }

  function openEdit(op: Operator) {
    setEditTarget(op)
    setForm({
      nome: op.nome,
      username: op.username,
      email: op.email,
      telefone: op.telefone ?? '',
      role: op.role,
      active: op.active,
      password: '',
      confirmPassword: '',
    })
    setShowPassword(false)
    setShowConfirm(false)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditTarget(null)
  }

  function handleField(field: keyof typeof EMPTY_FORM, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.nome.trim() || !form.username.trim() || !form.email.trim()) {
      toast.error('Nome, usuário e email são obrigatórios.')
      return
    }
    if (!editTarget && !form.password) {
      toast.error('Informe uma senha para o novo operador.')
      return
    }
    if (form.password && form.password !== form.confirmPassword) {
      toast.error('As senhas não coincidem.')
      return
    }
    if (form.password && form.password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    setIsSaving(true)
    try {
      if (editTarget) {
        const payload: Record<string, unknown> = {
          nome: form.nome,
          username: form.username,
          email: form.email,
          telefone: form.telefone || undefined,
          role: form.role,
          active: form.active,
        }
        if (form.password) payload.password = form.password
        await updateOperator(editTarget.id_operador, payload)
        toast.success('Operador atualizado com sucesso.')
      } else {
        await createOperator({
          nome: form.nome,
          username: form.username,
          email: form.email,
          telefone: form.telefone || undefined,
          role: form.role,
          active: form.active,
          password: form.password,
        })
        toast.success('Operador criado com sucesso.')
      }
      closeModal()
      fetchOperators()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar operador.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleToggleActive(op: Operator) {
    try {
      await updateOperator(op.id_operador, { active: !op.active })
      toast.success(`Operador ${op.active ? 'desativado' : 'ativado'} com sucesso.`)
      fetchOperators()
    } catch {
      toast.error('Erro ao alterar status do operador.')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteOperator(deleteTarget.id_operador)
      toast.success('Operador removido com sucesso.')
      setDeleteTarget(null)
      fetchOperators()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover operador.')
    } finally {
      setIsDeleting(false)
    }
  }

  const availableRoles: OperatorRole[] = isSuperAdmin
    ? ['super_admin', 'admin', 'user']
    : ['admin', 'user']

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#0070DB]" />
            Gerenciar Operadores
          </h1>
          <p className="text-sm text-muted mt-1">{total} operador{total !== 1 ? 'es' : ''} cadastrado{total !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-colors"
          style={{ background: '#0070DB' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#005bb5')}
          onMouseLeave={e => (e.currentTarget.style.background = '#0070DB')}
        >
          <Plus className="w-4 h-4" />
          Novo Operador
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou usuário..."
            className="w-full h-10 pl-10 pr-4 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0070DB]/20"
          />
        </div>
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="h-10 px-3 bg-card border border-border rounded-xl text-sm focus:outline-none"
        >
          <option value="">Todos os perfis</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="user">Operador</option>
        </select>
        <select
          value={filterActive}
          onChange={e => setFilterActive(e.target.value as '' | 'true' | 'false')}
          className="h-10 px-3 bg-card border border-border rounded-xl text-sm focus:outline-none"
        >
          <option value="">Todos os status</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/50">
                <th className="text-left px-4 py-3 font-semibold text-muted">Nome</th>
                <th className="text-left px-4 py-3 font-semibold text-muted">Usuário</th>
                <th className="text-left px-4 py-3 font-semibold text-muted">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-muted">Perfil</th>
                <th className="text-left px-4 py-3 font-semibold text-muted">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-muted">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-muted">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-6 h-6 border-2 border-[#0070DB] border-t-transparent rounded-full animate-spin" />
                      Carregando...
                    </div>
                  </td>
                </tr>
              ) : operators.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-muted">
                    Nenhum operador encontrado.
                  </td>
                </tr>
              ) : (
                operators.map(op => (
                  <tr key={op.id_operador} className="border-b border-border last:border-0 hover:bg-background/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{op.nome}</td>
                    <td className="px-4 py-3 text-muted">@{op.username}</td>
                    <td className="px-4 py-3 text-muted">{op.email}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', ROLE_COLORS[op.role])}>
                        {ROLE_LABELS[op.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-semibold',
                        op.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      )}>
                        {op.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(op)}
                          className="p-2 rounded-lg hover:bg-[#0070DB]/10 text-[#0070DB] transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(op)}
                          className={cn(
                            'p-2 rounded-lg transition-colors',
                            op.active
                              ? 'hover:bg-red-100 text-red-500'
                              : 'hover:bg-green-100 text-green-600'
                          )}
                          title={op.active ? 'Desativar' : 'Ativar'}
                        >
                          {op.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => setDeleteTarget(op)}
                            className="p-2 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">
                {editTarget ? 'Editar Operador' : 'Novo Operador'}
              </h2>
              <button onClick={closeModal} className="p-1 rounded-lg hover:bg-border transition-colors">
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nome completo *">
                  <input
                    type="text"
                    value={form.nome}
                    onChange={e => handleField('nome', e.target.value)}
                    placeholder="João Silva"
                    className="input-base"
                  />
                </Field>
                <Field label="Usuário (username) *">
                  <input
                    type="text"
                    value={form.username}
                    onChange={e => handleField('username', e.target.value)}
                    placeholder="joaosilva"
                    className="input-base"
                  />
                </Field>
              </div>

              <Field label="Email *">
                <input
                  type="email"
                  value={form.email}
                  onChange={e => handleField('email', e.target.value)}
                  placeholder="joao@empresa.com"
                  className="input-base"
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Telefone">
                  <input
                    type="tel"
                    value={form.telefone}
                    onChange={e => handleField('telefone', e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="input-base"
                  />
                </Field>
                <Field label="Perfil *">
                  <select
                    value={form.role}
                    onChange={e => handleField('role', e.target.value)}
                    className="input-base"
                  >
                    {availableRoles.map(r => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Status">
                <label className="flex items-center gap-2 cursor-pointer select-none mt-1">
                  <div
                    onClick={() => handleField('active', !form.active)}
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors relative cursor-pointer',
                      form.active ? 'bg-[#0070DB]' : 'bg-gray-300'
                    )}
                  >
                    <div className={cn(
                      'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all',
                      form.active ? 'left-5' : 'left-0.5'
                    )} />
                  </div>
                  <span className="text-sm text-foreground">{form.active ? 'Ativo' : 'Inativo'}</span>
                </label>
              </Field>

              <div className="border-t border-border pt-4 space-y-4">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide">
                  {editTarget ? 'Redefinir senha (opcional)' : 'Senha de acesso *'}
                </p>
                <Field label="Senha">
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => handleField('password', e.target.value)}
                      placeholder={editTarget ? 'Deixe em branco para manter a atual' : 'Mínimo 6 caracteres'}
                      className="input-base pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                    >
                      {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>
                <Field label="Confirmar senha">
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={e => handleField('confirmPassword', e.target.value)}
                      placeholder="Repita a senha"
                      className="input-base pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                    >
                      {showConfirm ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-border hover:bg-border transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-70 transition-colors"
                style={{ background: '#0070DB' }}
              >
                {isSaving && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl border border-border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Confirmar exclusão</h3>
                <p className="text-sm text-muted">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-sm text-foreground">
              Deseja remover o operador <strong>{deleteTarget.nome}</strong>?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-border hover:bg-border transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 flex items-center gap-2 disabled:opacity-70 transition-colors"
              >
                {isDeleting && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {isDeleting ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-muted uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}
