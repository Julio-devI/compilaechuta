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
      className="flex flex-col items-start p-6 gap-2.5 rounded-[30px] bg-card border border-border"
      style={{
        height: '380px',
        width: '300px',
        boxShadow: '0 4px 24px -8px rgba(2, 2, 85, 0.08)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg font-medium text-muted uppercase tracking-wider">Ações Rápidas</span>
      </div>
      <h3 className="text-2xl font-semibold text-[#020854] dark:text-foreground">Atalhos Contextuais</h3>

      {/* Action Items */}
      <div className="flex flex-col gap-4 w-full mt-2">
        {actions.map((action, index) => {
          const Icon = iconMap[action.iconName]
          return (
            <div key={index} className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className={`flex shrink-0 items-center justify-center w-10 h-10 rounded-full transition-transform group-hover:scale-105 ${action.bgColor}`}>
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
