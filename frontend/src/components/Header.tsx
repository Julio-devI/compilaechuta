import { Search, Bell } from 'lucide-react'

export function Header() {
  return (
    <header className="h-16 border-b border-border flex items-center justify-end px-6"> {/* Removed background style and changed justify-between to justify-end */}
      {/* Right Side - now includes search */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="w-[400px]"> {/* Changed max-w-sl to an explicit width w-[400px] */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Pesquise na plataforma..."
              className="w-full h-10 pl-10 pr-4 bg-[#F8FAFC] border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#1E5EFF]/20 focus:border-[#1E5EFF] shadow-md" /* Changed h-10 to h-12, rounded-lg to rounded-full, added shadow-md */
            />
          </div>
        </div>

        {/* Notifications */}
        <button className="w-10 h-10 rounded-full bg-[#F8FAFC] flex items-center justify-center hover:bg-[#E2E8F0] transition-colors shadow-md"> {/* Changed rounded-lg to rounded-full, added shadow-md */}
          <Bell className="w-5 h-5 text-[#1E5EFF]" /> {/* Changed text-muted to text-[#1E5EFF] */}
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ADE9FF] to-[#ADE9FF] flex items-center justify-center mr-1">
            <span className="text-[#0070DB] font-semibold text-sm">AA</span>
          </div>
        </div>
      </div>
    </header>
  )
}
