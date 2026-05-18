interface AgentDataTableProps {
  data: Array<Record<string, unknown>>
  maxRows?: number
  maxColumns?: number
}

const DEFAULT_MAX_ROWS = 20
const DEFAULT_MAX_COLUMNS = 8
const MAX_CELL_CHARS = 80

function formatHeader(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'number') {
    return new Intl.NumberFormat('pt-BR', {
      maximumFractionDigits: 2,
    }).format(value)
  }
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'

  const text = String(value)
  if (text.length <= MAX_CELL_CHARS) return text
  return `${text.slice(0, MAX_CELL_CHARS - 3)}...`
}

export function AgentDataTable({
  data,
  maxRows = DEFAULT_MAX_ROWS,
  maxColumns = DEFAULT_MAX_COLUMNS,
}: AgentDataTableProps) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic py-4 text-center">
        Sem dados para renderizar a tabela.
      </div>
    )
  }

  const columns = Object.keys(data[0] ?? {}).slice(0, maxColumns)
  const visibleRows = data.slice(0, maxRows)
  const hiddenRows = Math.max(0, data.length - visibleRows.length)
  const hiddenColumns = Math.max(0, Object.keys(data[0] ?? {}).length - columns.length)

  if (columns.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic py-4 text-center">
        Não foi possível renderizar a tabela com os dados disponíveis.
      </div>
    )
  }

  return (
    <div className="w-full">
      {(hiddenRows > 0 || hiddenColumns > 0) && (
        <p className="mb-2 text-[10px] text-muted-foreground">
          Exibindo {visibleRows.length} de {data.length} linhas
          {hiddenColumns > 0
            ? ` e ${columns.length} de ${Object.keys(data[0] ?? {}).length} colunas`
            : ''}
          .
        </p>
      )}
      <div className="max-w-full overflow-x-auto rounded-lg border border-[var(--chat-border)]">
        <table className="min-w-full border-collapse text-left text-[11px]">
          <thead>
            <tr style={{ background: 'var(--chat-input-bg)' }}>
              {columns.map(column => (
                <th
                  key={column}
                  className="whitespace-nowrap px-3 py-2 font-semibold text-foreground"
                >
                  {formatHeader(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-t border-[var(--chat-border)]"
              >
                {columns.map(column => {
                  const value = formatCell(row[column])
                  return (
                    <td
                      key={column}
                      className="max-w-[220px] px-3 py-2 text-muted-foreground"
                      title={value}
                    >
                      <span className="line-clamp-2 break-words">{value}</span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
