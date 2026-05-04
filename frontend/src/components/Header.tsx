import { Search, Bell } from 'lucide-react'

export function Header() {
  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Pesquise na plataforma..."
            className="w-full h-10 pl-10 pr-4 bg-[#F8FAFC] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E5EFF]/20 focus:border-[#1E5EFF]"
          />
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="w-10 h-10 rounded-lg bg-[#F8FAFC] flex items-center justify-center hover:bg-[#E2E8F0] transition-colors">
          <Bell className="w-5 h-5 text-muted" />
        </button>

        {/* Accessibility */}
        <button className="w-10 h-10 rounded-lg bg-[#F8FAFC] flex items-center justify-center hover:bg-[#E2E8F0] transition-colors">
          <span className="text-sm font-semibold text-muted">Aa</span>
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD60A] to-[#FF9500] flex items-center justify-center">
            <span className="text-white font-semibold text-sm">JD</span>
          </div>
        </div>
      </div>
    </header>
  )
}
