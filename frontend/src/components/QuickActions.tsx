import { Package, Users, Download, Lightbulb, ChevronRight } from 'lucide-react'

export function QuickActions() {
  const actions = [
    { 
      icon: Package, 
      label: 'Pedidos atrasados', 
      subLabel: '12',
      iconColor: 'text-[#FF3B3B]',
      bgColor: 'bg-[#FF3B3B]/10'
    },
    { 
      icon: Users, 
      label: 'Clientes com tickets abertos', 
      subLabel: '5',
      iconColor: 'text-[#FFCC00]',
      bgColor: 'bg-[#FFCC00]/20'
    },
    { 
      icon: Download, 
      label: 'Exportar CSV', 
      subLabel: 'Mês atual',
      iconColor: 'text-[#0070DB]',
      bgColor: 'bg-[#0070DB]/10'
    },
    { 
      icon: Lightbulb, 
      label: 'Insights de IA', 
      subLabel: 'Info explaining more',
      iconColor: 'text-white',
      bgColor: 'bg-gradient-to-b from-[#60A5FA] to-[#1E5EFF]'
    },
  ]

  return (
    <div
      className="flex flex-col items-start p-6 gap-[10px] rounded-[30px] bg-card border border-border"
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
        {actions.map((action, index) => (
          <div key={index} className="flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className={`flex shrink-0 items-center justify-center w-10 h-10 rounded-full transition-transform group-hover:scale-105 ${action.bgColor}`}>
                <action.icon className={`w-5 h-5 ${action.iconColor}`} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{action.label}</span>
                <span className="text-xs text-muted">{action.subLabel}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        ))}
      </div>
    </div>
  )
}
