import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  Package, 
  HeadphonesIcon, 
  BarChart3,
  MessageSquare,
  Settings,
  LogOut
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface NavItem {
  icon: React.ElementType
  label: string
  path: string
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Clientes', path: '/clientes' },
  { icon: ShoppingCart, label: 'Pedidos', path: '/pedidos' },
  { icon: Package, label: 'Produtos', path: '/produtos' },
  { icon: HeadphonesIcon, label: 'Suporte', path: '/suporte' },
  { icon: BarChart3, label: 'Relatórios', path: '/relatorios' },
  { icon: MessageSquare, label: 'Chat IA', path: '/chat-ia' },
]

const bottomNavItems: NavItem[] = [
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
]

export function Sidebar() {
  const handleLogout = () => {
    // Logout logic
    console.log('Logout')
  }

  return (
    <aside className="w-20 bg-[#1E5EFF] min-h-screen flex flex-col items-center py-6 fixed left-0 top-0 z-50">
      {/* Logo */}
      <div className="mb-10">
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#1E5EFF"/>
            <path d="M2 17L12 22L22 17" stroke="#1E5EFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="#1E5EFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-2">
        {navItems.map((item) => (
          <NavButton key={item.label} item={item} />
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="flex flex-col items-center gap-2 mt-auto">
        {bottomNavItems.map((item) => (
          <NavButton key={item.label} item={item} />
        ))}
        <button
          onClick={handleLogout}
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 hover:bg-white/20 bg-transparent"
          title="Sair"
        >
          <LogOut className="w-5 h-5 text-white" />
        </button>
      </div>
    </aside>
  )
}

function NavButton({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) => cn(
        "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200",
        "hover:bg-white/20",
        isActive ? "bg-white/20" : "bg-transparent"
      )}
      title={item.label}
    >
      <Icon className="w-5 h-5 text-white" />
    </NavLink>
  )
}
