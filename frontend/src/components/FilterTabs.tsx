import { useState } from 'react'
import { cn } from '@/lib/utils'

const tabs = [
  { id: 'visao-geral', label: 'Visão Geral' },
  { id: 'este-mes', label: 'Este Mês' },
  { id: 'ultimos-30-dias', label: 'Últimos 30 Dias' },
  { id: 'trimestre', label: 'Trimestre' },
  { id: 'por-categoria', label: 'Por Categoria' },
  { id: 'escolher-outro', label: 'Escolher outro' },
]

export function FilterTabs() {
  const [activeTab, setActiveTab] = useState('ultimos-30-dias')

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            "px-4 py-2 rounded-4xl text-sm font-medium transition-all duration-200",
            activeTab === tab.id
              ? "bg-primary text-white shadow-md"
              : "bg-primary-light text-[#0070DB] hover:bg-primary-light/80"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
