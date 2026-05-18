import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getRouteSuggestions } from '@/lib/chatSuggestionsByRoute'
import {
  AGENT_PLACEHOLDERS_COMPACT,
  useRotatingPlaceholder,
} from '@/lib/useRotatingPlaceholder'
import {
  X,
  Maximize2,
  Send,
  Bot,
  Sparkles,
  HelpCircle,
  FileText,
  Zap,
  Lightbulb,
  History,
  ChevronDown,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import {
  askAgent,
  getSuggestions,
  type ChartSuggestion,
} from '@/services/aiAgentService'
import { AgentChart } from '@/components/AgentChart'
import { AgentDataTable } from '@/components/AgentDataTable'
import {
  SLASH_COMMANDS,
  SlashCommandMenu,
} from '@/components/SlashCommandMenu'

interface Message {
  id: number
  type: 'user' | 'assistant'
  content: string
  timestamp: string
  sources_text?: string | null
  data?: Array<Record<string, unknown>> | null
  chart?: ChartSuggestion | null
  suggestions?: string[]
}

const QUICK_ACTION_ICONS: LucideIcon[] = [Zap, FileText, HelpCircle, Lightbulb]

function nowHHmm(): string {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ChatIADrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [mensagens, setMensagens] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [quickActions, setQuickActions] = useState<string[]>([])
  const [sessionId] = useState<string>(() => crypto.randomUUID())
  const [expandedCharts, setExpandedCharts] = useState<Set<number>>(new Set())
  const [expandedTables, setExpandedTables] = useState<Set<number>>(new Set())
  const [slashMenuOpen, setSlashMenuOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageIdRef = useRef(0)
  const navigate = useNavigate()
  const location = useLocation()
  const { text: placeholder, opacity: placeholderOpacity } =
    useRotatingPlaceholder(AGENT_PLACEHOLDERS_COMPACT)

  const nextMessageId = () => {
    messageIdRef.current += 1
    return messageIdRef.current
  }

  const toggleChart = (messageId: number) => {
    setExpandedCharts(prev => {
      const next = new Set(prev)
      if (next.has(messageId)) {
        next.delete(messageId)
      } else {
        next.add(messageId)
      }
      return next
    })
  }

  const toggleTable = (messageId: number) => {
    setExpandedTables(prev => {
      const next = new Set(prev)
      if (next.has(messageId)) {
        next.delete(messageId)
      } else {
        next.add(messageId)
      }
      return next
    })
  }

  useEffect(() => {
    setQuickActions(getRouteSuggestions(location.pathname))
  }, [location.pathname])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, isTyping])

  const sendQuestion = async (rawText: string) => {
    const text = rawText.trim()
    if (!text) return

    setMensagens(prev => [
      ...prev,
      {
        id: nextMessageId(),
        type: 'user',
        content: text,
        timestamp: nowHHmm(),
      },
    ])
    setInputValue('')
    setSlashMenuOpen(false)
    setIsTyping(true)

    try {
      const response = await askAgent(text, sessionId)
      const assistantText =
        response.user_response.answer_text ||
        (response.status === 'out_of_scope'
          ? 'Não consegui responder a essa pergunta com os dados disponíveis.'
          : 'Ocorreu um erro ao processar a resposta.')
      setMensagens(prev => [
        ...prev,
        {
          id: nextMessageId(),
          type: 'assistant',
          content: assistantText,
          timestamp: nowHHmm(),
          sources_text: response.user_response.sources_text,
          data: response.user_response.data,
          chart: response.user_response.chart,
        },
      ])
    } catch (err) {
      const message = (err as Error).message
      toast.error(message)
      setMensagens(prev => [
        ...prev,
        {
          id: nextMessageId(),
          type: 'assistant',
          content: `Ops, algo deu errado: ${message}`,
          timestamp: nowHHmm(),
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  const runSugestaoCommand = async () => {
    setIsTyping(true)
    try {
      const { suggestions: list } = await getSuggestions(sessionId)
      setMensagens(prev => [
        ...prev,
        {
          id: nextMessageId(),
          type: 'assistant',
          content: 'Aqui vão algumas sugestões para você:',
          timestamp: nowHHmm(),
          suggestions: list,
        },
      ])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setIsTyping(false)
    }
  }

  const executeSlashCommand = (command: string) => {
    setInputValue('')
    setSlashMenuOpen(false)
    if (command === '/sugestao') {
      runSugestaoCommand()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    setSlashMenuOpen(value.startsWith('/'))
  }

  const tryExecuteSlashCommand = (): boolean => {
    const match = SLASH_COMMANDS.find(
      c => c.command.toLowerCase() === inputValue.trim().toLowerCase(),
    )
    if (match) {
      executeSlashCommand(match.command)
      return true
    }
    return false
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    if (slashMenuOpen) {
      e.preventDefault()
      if (tryExecuteSlashCommand()) return
    }
    sendQuestion(inputValue)
  }

  const handleEnviar = () => {
    if (slashMenuOpen && tryExecuteSlashCommand()) return
    sendQuestion(inputValue)
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl z-40 transition-all duration-300 bg-linear-to-br from-[#1E5EFF] to-[#8B5CF6] hover:scale-110 ${
          isOpen ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 scale-100'
        }`}
      >
        <Sparkles className="w-6 h-6 text-white" />
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'rgba(0,0,0,0.4)' }}
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-100 z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ background: 'var(--chat-bg)', borderLeft: '1px solid var(--chat-border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{
            borderBottom: '1px solid var(--chat-border)',
            background: 'var(--chat-header-bg)',
          }}
        >
          <button
            onClick={() => {
              navigate('/chat-ia')
              setIsOpen(false)
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-(--chat-item-hover)"
            title="Expandir"
          >
            <Maximize2 className="w-4 h-4 text-muted" />
          </button>

          <p className="text-xs text-muted-foreground">
            Produzido por <span className="font-semibold text-foreground">V-Commerce</span>
          </p>

          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-(--chat-item-hover)"
          >
            <X className="w-4 h-4 text-muted" />
          </button>
        </div>

        {/* Chat content */}
        {mensagens.length === 0 ? (
          <div className="flex-1 flex flex-col px-6 py-8">
            <h2 className="text-2xl font-bold text-foreground mb-8 leading-tight">
              Olá! Como posso te ajudar?
            </h2>

            <div className="space-y-1">
              {quickActions.map((texto, i) => {
                const Icon = QUICK_ACTION_ICONS[i % QUICK_ACTION_ICONS.length]
                return (
                  <button
                    key={i}
                    onClick={() => sendQuestion(texto)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors hover:bg-(--chat-item-hover) group"
                  >
                    <Icon
                      className="w-4 h-4 shrink-0"
                      style={{ color: 'var(--chat-accent)' }}
                    />
                    <span
                      className="text-sm transition-colors"
                      style={{ color: 'var(--chat-accent)' }}
                    >
                      {texto}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto themed-scrollbar px-4 py-4 space-y-4">
            {mensagens.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    msg.type === 'user'
                      ? 'bg-[#1E5EFF]'
                      : 'bg-linear-to-br from-[#1E5EFF] to-[#8B5CF6]'
                  }`}
                >
                  {msg.type === 'user' ? (
                    <span className="text-white text-[9px] font-bold">EU</span>
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className="px-3 py-2.5 text-sm leading-relaxed"
                    style={
                      msg.type === 'user'
                        ? {
                            background: '#1E5EFF',
                            color: 'white',
                            borderRadius: '0.75rem',
                            borderTopRightRadius: '4px',
                          }
                        : {
                            background: 'var(--chat-msg-ai-bg)',
                            border: '1px solid var(--chat-border)',
                            color: 'var(--color-foreground)',
                            borderRadius: '0.75rem',
                            borderTopLeftRadius: '4px',
                          }
                    }
                  >
                    {msg.type === 'user' ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}

                    {msg.type === 'assistant' && msg.chart && msg.data && msg.data.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-[var(--chat-border)]">
                        <button
                          type="button"
                          onClick={() => toggleChart(msg.id)}
                          className="flex items-center gap-1.5 text-xs font-semibold w-full transition-colors"
                          style={{ color: 'var(--chat-accent)' }}
                        >
                          <ChevronDown
                            className="w-3.5 h-3.5 transition-transform"
                            style={{
                              transform: expandedCharts.has(msg.id)
                                ? 'rotate(180deg)'
                                : 'rotate(0deg)',
                            }}
                          />
                          Visualizar gráfico
                        </button>
                        {expandedCharts.has(msg.id) && (
                          <div className="mt-3">
                            <AgentChart chart={msg.chart} data={msg.data} height={200} />
                          </div>
                        )}
                      </div>
                    )}

                    {msg.type === 'assistant' && !msg.chart && msg.data && msg.data.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-[var(--chat-border)]">
                        <button
                          type="button"
                          onClick={() => toggleTable(msg.id)}
                          className="flex items-center gap-1.5 text-xs font-semibold w-full transition-colors"
                          style={{ color: 'var(--chat-accent)' }}
                        >
                          <ChevronDown
                            className="w-3.5 h-3.5 transition-transform"
                            style={{
                              transform: expandedTables.has(msg.id)
                                ? 'rotate(180deg)'
                                : 'rotate(0deg)',
                            }}
                          />
                          Visualizar tabela
                        </button>
                        {expandedTables.has(msg.id) && (
                          <div className="mt-3">
                            <AgentDataTable data={msg.data} />
                          </div>
                        )}
                      </div>
                    )}

                    {msg.sources_text && (
                      <div className="mt-4 pt-3 border-t border-[var(--chat-border)]">
                        <p
                          className="flex items-center gap-1.5 text-xs font-semibold mb-1"
                          style={{ color: 'var(--chat-accent)' }}
                        >
                          <Lightbulb className="w-3.5 h-3.5" />
                          Fonte de dados consultada:
                        </p>
                        <div className="text-xs text-muted-foreground">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                              em: ({ children }) => <em className="italic">{children}</em>,
                            }}
                          >
                            {msg.sources_text}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 max-w-full">
                      {msg.suggestions.map((sug, i) => (
                        <button
                          key={i}
                          onClick={() => sendQuestion(sug)}
                          className="px-3 py-1.5 rounded-full text-xs text-left transition-colors"
                          style={{
                            background: 'var(--chat-quick-card-bg)',
                            border: '1px solid var(--chat-border)',
                            color: 'var(--color-foreground)',
                          }}
                          onMouseEnter={e =>
                            (e.currentTarget.style.borderColor =
                              'var(--chat-accent)')
                          }
                          onMouseLeave={e =>
                            (e.currentTarget.style.borderColor =
                              'var(--chat-border)')
                          }
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                  <span className="text-[10px] text-muted-foreground mt-1">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-linear-to-br from-[#1E5EFF] to-[#8B5CF6] flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div
                  className="px-3 py-2.5"
                  style={{
                    background: 'var(--chat-msg-ai-bg)',
                    border: '1px solid var(--chat-border)',
                    borderRadius: '0.75rem',
                    borderTopLeftRadius: '4px',
                  }}
                >
                  <div className="flex gap-1 items-center h-4">
                    <span
                      className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input area */}
        <div className="p-4 shrink-0" style={{ borderTop: '1px solid var(--chat-border)' }}>
          <div className="relative">
            {slashMenuOpen && (
              <SlashCommandMenu
                filter={inputValue}
                onSelect={executeSlashCommand}
              />
            )}
            <div
              className="rounded-2xl px-4 pt-3 pb-3 focus-within:ring-1 focus-within:ring-[#1E5EFF]/30 transition-all"
              style={{
                background: 'var(--chat-input-bg)',
                border: '1px solid var(--chat-border)',
              }}
            >
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                placeholder={placeholder}
                style={{ '--ph-opacity': placeholderOpacity } as React.CSSProperties}
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none mb-3 agent-placeholder-fade"
              />
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  navigate('/chat-ia')
                  setIsOpen(false)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-foreground transition-colors"
                style={{ background: 'var(--chat-msg-ai-bg)' }}
              >
                <History className="w-3 h-3" />
                Abrir Histórico de Conversas
              </button>
              <button
                onClick={handleEnviar}
                disabled={!inputValue.trim() || isTyping}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: '#1E5EFF', opacity: inputValue.trim() ? 1 : 0.3 }}
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
