import type { ChartSuggestion } from '@/services/aiAgentService'

type AgentData = Array<Record<string, unknown>> | null | undefined

export function shouldShowAgentDataTable(
  chart: ChartSuggestion | null | undefined,
  data: AgentData,
): data is Array<Record<string, unknown>> {
  return !chart && Array.isArray(data) && data.length > 1
}
