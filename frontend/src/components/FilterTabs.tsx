import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { FilterTab } from '../services/dashboardService'
import { getFilterTabs } from '../services/dashboardService'

export function FilterTabs() {
  const [tabs, setTabs] = useState<FilterTab[]>([])
  const [activeTab, setActiveTab] = useState('ultimos-30-dias')

  useEffect(() => {
    getFilterTabs().then(setTabs)
  }, [])

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            "px-3 py-1 rounded-4xl text-sm font-medium transition-all duration-200",
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
