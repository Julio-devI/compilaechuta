import { Search, Bell } from 'lucide-react'
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

  const initials = user ? getInitials(user.nome) : '?'
  const roleLabel = user ? (ROLE_LABELS[user.role] ?? user.role) : ''

  return (
    <header className="h-16 border-b border-border flex items-center justify-end px-6">
      <div className="flex items-center gap-4">
        <div className="w-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Pesquise na plataforma..."
              className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-md"
            />
          </div>
        </div>

        <button className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center hover:bg-border transition-colors shadow-md">
          <Bell className="w-5 h-5 text-primary" />
        </button>

        {user && (
          <div className="flex items-center gap-2 mr-1">
            <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#ADE9FF] to-[#ADE9FF] flex items-center justify-center">
              <span className="text-[#0070DB] font-semibold text-sm">{initials}</span>
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="text-sm font-semibold text-foreground truncate max-w-30">{user.nome}</p>
              <p className="text-xs text-muted">{roleLabel}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
