import { useState, useEffect } from 'react'
import { Users, Download, Lightbulb, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { DateRange } from '../services/dashboardService'
import { getTicketsAbertos } from '../services/dashboardService'
import { apiUrl } from '../services/apiConfig'

const BASE = apiUrl('/dashboard')

interface Props {
  dateRange: DateRange
}

function formatDateBR(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

async function exportCSV(dateRange: DateRange) {
  const params = new URLSearchParams({ data_inicio: dateRange.inicio, data_fim: dateRange.fim })

  const [resReceita, resCategoria, resDia, resStatus, resCsat] = await Promise.all([
    fetch(`${BASE}/charts/revenue-over-time?${params}`),
    fetch(`${BASE}/charts/revenue-by-category?${params}`),
    fetch(`${BASE}/charts/orders-by-weekday?${params}`),
    fetch(`${BASE}/charts/order-status?${params}`),
    fetch(`${BASE}/charts/csat-distribution?${params}`),
  ])

  const [jsonReceita, jsonCategoria, jsonDia, jsonStatus, jsonCsat] = await Promise.all([
    resReceita.json(),
    resCategoria.json(),
    resDia.json(),
    resStatus.json(),
    resCsat.json(),
  ])

  const receita: { time_period: string; revenue: number }[] = jsonReceita.data ?? []
  const categorias: { category: string; revenue: number }[] = jsonCategoria.data ?? []
  const dias: { dia: string; pedidos: number }[] = jsonDia.data ?? []
  const status: { status: string; count: number }[] = jsonStatus.data ?? []
  const csat: { promoters_pct: number; neutrals_pct: number; detractors_pct: number } = jsonCsat.data ?? {}

  const sections = [
    'RECEITA POR PERÍODO',
    'Período;Receita (BRL)',
    ...receita.map((r) => `${r.time_period};${r.revenue.toFixed(2)}`),
    '',
    'VENDAS POR CATEGORIA',
    'Categoria;Receita (BRL)',
    ...categorias.map((r) => `${r.category};${r.revenue.toFixed(2)}`),
    '',
    'FREQUÊNCIA POR DIA DA SEMANA',
    'Dia;Pedidos',
    ...dias.map((r) => `${r.dia};${r.pedidos}`),
    '',
    'DISTRIBUIÇÃO DE PEDIDOS POR STATUS',
    'Status;Quantidade',
    ...status.map((r) => `${r.status};${r.count}`),
    '',
    'TAXA DE SATISFAÇÃO (NPS)',
    'Categoria;Percentual (%)',
    `Promotores;${(csat.promoters_pct ?? 0).toFixed(2)}`,
    `Neutros;${(csat.neutrals_pct ?? 0).toFixed(2)}`,
    `Detratores;${(csat.detractors_pct ?? 0).toFixed(2)}`,
  ]

  const csv = '﻿' + sections.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dashboard_${dateRange.inicio}_${dateRange.fim}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function QuickActions({ dateRange }: Props) {
  const [ticketsAbertos, setTicketsAbertos] = useState(0)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    getTicketsAbertos().then(setTicketsAbertos)
  }, [])

  const periodLabel = `${formatDateBR(dateRange.inicio)} — ${formatDateBR(dateRange.fim)}`

  async function handleExportCSV() {
    setExporting(true)
    await exportCSV(dateRange)
    setExporting(false)
  }

  const actions = [
    {
      icon: <Users className="w-5 h-5 text-[#FFCC00]" />,
      bgColor: 'bg-[#FFCC00]/20',
      label: 'Clientes com tickets abertos',
      subLabel: `${ticketsAbertos} no total`,
      to: '/suporte',
      onClick: undefined,
    },
    {
      icon: <Download className="w-5 h-5 text-[#0070DB]" />,
      bgColor: 'bg-[#0070DB]/10',
      label: exporting ? 'Exportando…' : 'Exportar CSV',
      subLabel: periodLabel,
      to: undefined,
      onClick: handleExportCSV,
    },
    {
      icon: <Lightbulb className="w-5 h-5 text-white" />,
      bgColor: 'bg-gradient-to-b from-[#60A5FA] to-[#1E5EFF]',
      label: 'Insights de IA',
      subLabel: 'Analisar dados',
      to: undefined,
      onClick: undefined,
    },
  ]

  const rowClass = (action: typeof actions[number]) =>
    `flex items-center justify-between group ${action.to || action.onClick ? 'cursor-pointer' : 'cursor-default'}`

  const rowContent = (action: typeof actions[number]) => (
    <>
      <div className="flex items-center gap-2.5">
        <div className={`flex shrink-0 items-center justify-center w-9 h-9 rounded-full transition-transform group-hover:scale-105 ${action.bgColor}`}>
          {action.icon}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{action.label}</span>
          <span className="text-xs text-muted">{action.subLabel}</span>
        </div>
      </div>
      {(action.to || action.onClick) && (
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
      )}
    </>
  )

  return (
    <div
      className="flex flex-col items-start p-4 gap-1.5 rounded-3xl bg-card border border-border w-full"
      style={{ boxShadow: '0 4px 24px -8px rgba(2, 2, 85, 0.08)' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-muted uppercase tracking-wider">Ações Rápidas</span>
      </div>
      <h3 className="text-lg font-semibold text-[#020854] dark:text-foreground">Atalhos Contextuais</h3>

      <div className="flex flex-col gap-2.5 w-full mt-1.5">
        {actions.map((action, index) =>
          action.to ? (
            <Link key={index} to={action.to} className={rowClass(action)}>
              {rowContent(action)}
            </Link>
          ) : (
            <div key={index} onClick={action.onClick} className={rowClass(action)}>
              {rowContent(action)}
            </div>
        ))}
      </div>
    </div>
  )
}
