import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: string
  change: number
  changeLabel: string
  icon: React.ReactNode
  iconBgColor: string
}

export function KPICard({ title, value, change, icon, iconBgColor }: KPICardProps) {
  const isPositive = change >= 0

  return (
    <div className="bg-white rounded-4xl p-5 border border-border shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", iconBgColor)}>
          {icon}
        </div>
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
          isPositive ? "bg-[#E6F9F3] text-[#00C48C]" : "bg-[#FFE8EA] text-[#FF4757]"
        )}>
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>{Math.abs(change).toFixed(2)}% mês passado</span>
        </div>
      </div>

      {/* Title */}
      <p className="text-sm text-muted mb-1">{title}</p>

      {/* Value */}
      <p className="text-4xl font-bold mb-3" style={{ color: '#020854' }}>{value}</p>

      {/* Action Link */}
      <button className="flex items-center gap-1 text-sm text-[#6B7588] font-medium underline"> {/* Changed hover:underline to underline */}
        <ArrowUpRight className="w-4 h-4" />
        <span>Acessar mais detalhes</span>
      </button>
    </div>
  )
}
