import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: string
  change: number | null
  changeLabel: string
  icon: React.ReactNode
  iconBgColor: string
}

export function KPICard({ title, value, change, changeLabel, icon, iconBgColor }: KPICardProps) {
  const isPositive = change !== null && change >= 0

  return (
    <div className="bg-card rounded-3xl p-3.5 border border-border shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", iconBgColor)}>
          {icon}
        </div>
        {change === null ? (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-muted/20 text-muted">
            <ArrowUpRight className="w-3 h-3" />
            <span>Sem comparativo</span>
          </div>
        ) : (
          <div className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium",
            isPositive ? "bg-success-light text-success" : "bg-danger-light text-danger"
          )}>
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{Math.abs(change).toFixed(2)}% {changeLabel}</span>
          </div>
        )}
      </div>

      {/* Title */}
      <p className="text-xs text-muted mb-1">{title}</p>

      {/* Value */}
      <p className="text-2xl font-bold text-[#020854] dark:text-foreground mb-2">{value}</p>

    </div>
  )
}
