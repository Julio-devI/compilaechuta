export interface SlashCommand {
  command: string
  description: string
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: '/sugestao',
    description: 'Sugere perguntas baseadas na conversa',
  },
]

export function filterSlashCommands(filter: string): SlashCommand[] {
  const lower = filter.toLowerCase()
  return SLASH_COMMANDS.filter(c => c.command.toLowerCase().startsWith(lower))
}

interface SlashCommandMenuProps {
  filter: string
  onSelect: (command: string) => void
}

export function SlashCommandMenu({ filter, onSelect }: SlashCommandMenuProps) {
  const matches = filterSlashCommands(filter)

  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-2 rounded-xl overflow-hidden shadow-lg z-20"
      style={{
        background: 'var(--chat-quick-card-bg)',
        border: '1px solid var(--chat-border)',
      }}
    >
      {matches.length === 0 ? (
        <div className="px-4 py-3 text-xs text-muted-foreground">
          Nenhum comando encontrado
        </div>
      ) : (
        <ul className="py-1">
          {matches.map(c => (
            <li key={c.command}>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => onSelect(c.command)}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors"
                onMouseEnter={e =>
                  (e.currentTarget.style.background =
                    'var(--chat-item-hover)')
                }
                onMouseLeave={e =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                <span className="text-sm font-medium text-foreground">
                  {c.command}
                </span>
                <span className="text-xs text-muted-foreground">
                  {c.description}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
