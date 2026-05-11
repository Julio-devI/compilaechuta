import { useState, useEffect } from 'react'
import { Package, Users, Download, Lightbulb, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { QuickAction } from '../services/dashboardService'
import { getQuickActions } from '../services/dashboardService'

const iconMap: Record<QuickAction['iconName'], LucideIcon> = {
  Package,
  Users,
  Download,
  Lightbulb,
}

export function QuickActions() {
  const [actions, setActions] = useState<QuickAction[]>([])

  useEffect(() => {
    getQuickActions().then(setActions)
  }, [])

  return (
    <div
      className="flex flex-col items-start p-4 gap-1.5 rounded-3xl bg-card border border-border w-full"
      style={{ boxShadow: '0 4px 24px -8px rgba(2, 2, 85, 0.08)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-muted uppercase tracking-wider">Ações Rápidas</span>
      </div>
      <h3 className="text-lg font-semibold text-[#020854] dark:text-foreground">Atalhos Contextuais</h3>

      {/* Action Items */}
      <div className="flex flex-col gap-2.5 w-full mt-1.5">
        {actions.map((action, index) => {
          const Icon = iconMap[action.iconName]
          return (
            <div key={index} className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-2.5">
                <div className={`flex shrink-0 items-center justify-center w-9 h-9 rounded-full transition-transform group-hover:scale-105 ${action.bgColor}`}>
                  <Icon className={`w-5 h-5 ${action.iconColor}`} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{action.label}</span>
                  <span className="text-xs text-muted">{action.subLabel}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
