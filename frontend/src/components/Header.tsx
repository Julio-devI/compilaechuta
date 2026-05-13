import { Search, Bell } from 'lucide-react'

export function Header() {
  return (
    <header className="h-16 border-b border-border flex items-center justify-end px-6">
      <div className="flex items-center gap-4">
        <div className="w-[400px]">
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

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ADE9FF] to-[#ADE9FF] flex items-center justify-center mr-1">
            <span className="text-[#0070DB] font-semibold text-sm">AA</span>
          </div>
        </div>
      </div>
    </header>
  )
}
