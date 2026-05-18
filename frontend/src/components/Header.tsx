import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  user: 'Operador',
}

function getInitials(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('')
}

export function Header() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const initials = user ? getInitials(user.nome) : '?'
  const roleLabel = user ? (ROLE_LABELS[user.role] ?? user.role) : ''

  return (
    <header className="h-16 border-b border-border flex items-center justify-end px-6">
      {user && (
        <button
          onClick={() => navigate('/configuracoes')}
          className="flex items-center gap-2 mr-1 rounded-xl px-3 py-2 hover:bg-background transition-colors cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#ADE9FF] to-[#ADE9FF] flex items-center justify-center">
            <span className="text-[#0070DB] font-semibold text-sm">{initials}</span>
          </div>
          <div className="hidden sm:block leading-tight text-left">
            <p className="text-sm font-semibold text-foreground truncate max-w-30">{user.nome}</p>
            <p className="text-xs text-muted">{roleLabel}</p>
          </div>
        </button>
      )}
    </header>
  )
}
