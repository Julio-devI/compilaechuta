import { Clock, Users, Download, Lightbulb, ChevronRight } from 'lucide-react'

export function QuickActions() {
  const actions = [
    { icon: Clock, label: 'Pedidos atrasados' },
    { icon: Users, label: 'Clientes com tickets abertos' },
    { icon: Download, label: 'Exportar CSV' },
    { icon: Lightbulb, label: 'Insights de IA' },
  ]

  return (
    <div
      className="flex flex-col items-start p-6 gap-[10px] rounded-[30px] bg-white border border-border" // Updated classes
      style={{
        height: '380px',
        width: '300px',
        boxShadow: '0 4px 24px -8px rgba(2, 2, 85, 0.08)', // Custom box-shadow
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg font-medium text-[#6B7588] uppercase tracking-wider">Ações Rápidas</span>
      </div>
      <h3 className="text-2xl font-semibold text-[#020854]">Atalhos Contextuais</h3> {/* Removed mb-1 */}

      {/* Action Items */}
      <div className="flex flex-col gap-4 w-full"> {/* Added w-full to make items take full width */}
        {actions.map((action, index) => (
          <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-[#F8FAFC] hover:bg-[#E2E8F0] transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <action.icon className="w-5 h-5 text-muted" />
              <span className="text-sm font-medium text-foreground">{action.label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
