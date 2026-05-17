import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Send,
  Bot,
  Sparkles,
  TrendingUp,
  Users,
  BarChart,
  Search,
  X,
  MessageSquare,
  Plus,
  Lightbulb,
  ChevronDown,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import {
  askAgent,
  getSuggestions,
  listSessions,
  getSessionDetail,
  type ChartSuggestion,
  type SessionSummary,
} from '@/services/aiAgentService'
import {
  SLASH_COMMANDS,
  SlashCommandMenu,
} from '@/components/SlashCommandMenu'
import { AgentChart } from '@/components/AgentChart'
import {
  AGENT_PLACEHOLDERS,
  useRotatingPlaceholder,
} from '@/lib/useRotatingPlaceholder'

interface Message {
  id: number
  type: 'user' | 'assistant'
  content: string
  timestamp: string
  suggestions?: string[]
  sources_text?: string | null
  data?: Array<Record<string, unknown>> | null
  chart?: ChartSuggestion | null
}

interface ConversaHistorico {
  id: string
  titulo: string
  timestamp: string
}

const SUGGESTION_ICONS: LucideIcon[] = [
  Sparkles,
  TrendingUp,
  Users,
  BarChart,
  MessageSquare,
]

function nowHHmm(): string {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatSessionTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const today = new Date()
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  if (sameDay) {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function summaryToHistorico(s: SessionSummary): ConversaHistorico {
  return {
    id: s.session_id,
    titulo: s.title,
    timestamp: formatSessionTimestamp(s.updated_at),
  }
}

export function ChatIA() {
  const navigate = useNavigate()
  const [mensagens, setMensagens] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [conversaAtiva, setConversaAtiva] = useState<string | null>(null)
  const [searchHistorico, setSearchHistorico] = useState('')
  const [conversasHistorico, setConversasHistorico] = useState<
    ConversaHistorico[]
  >([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID())
  const [slashMenuOpen, setSlashMenuOpen] = useState(false)
  const [expandedCharts, setExpandedCharts] = useState<Set<number>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageIdRef = useRef(0)
  const { text: placeholder, opacity: placeholderOpacity } =
    useRotatingPlaceholder(AGENT_PLACEHOLDERS)

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

  const nextMessageId = () => {
    messageIdRef.current += 1
    return messageIdRef.current
  }

  const refreshSessions = async () => {
    try {
      const sessions = await listSessions()
      setConversasHistorico(sessions.map(summaryToHistorico))
      return sessions
    } catch (err) {
      toast.error((err as Error).message)
      return []
    }
  }

  const loadInitialSuggestions = async () => {
    try {
      const { suggestions: list } = await getSuggestions('')
      setSuggestions(list)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  useEffect(() => {
    const initChat = async () => {
      const sessions = await refreshSessions()
      const lastSessionId = sessionStorage.getItem('ai_agent_last_session')

      if (lastSessionId && sessions && sessions.length > 0) {
        const sessionExists = sessions.find(s => s.session_id === lastSessionId)
        if (sessionExists) {
          handleConversaHistorico(lastSessionId)
          return
        }
      }

      loadInitialSuggestions()
    }
    initChat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

      if (response.status === 'success') {
        refreshSessions()
        setConversaAtiva(sessionId)
        sessionStorage.setItem('ai_agent_last_session', sessionId)
      }
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

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    if (slashMenuOpen) {
      e.preventDefault()
      const match = SLASH_COMMANDS.find(
        c => c.command.toLowerCase() === inputValue.toLowerCase(),
      )
      if (match) executeSlashCommand(match.command)
      return
    }
    sendQuestion(inputValue)
  }

  const handleEnviar = () => {
    if (slashMenuOpen) {
      const match = SLASH_COMMANDS.find(
        c => c.command.toLowerCase() === inputValue.toLowerCase(),
      )
      if (match) executeSlashCommand(match.command)
      return
    }
    sendQuestion(inputValue)
  }

  const handleNovaConversa = () => {
    setMensagens([])
    setConversaAtiva(null)
    setInputValue('')
    setSlashMenuOpen(false)
    setSessionId(crypto.randomUUID())
    setExpandedCharts(new Set())
    setIsTyping(false)
    loadInitialSuggestions()
    sessionStorage.removeItem('ai_agent_last_session')
  }

  const handleConversaHistorico = async (id: string) => {
    setConversaAtiva(id)
    setSessionId(id)
    setInputValue('')
    setSlashMenuOpen(false)
    setIsTyping(false)
    sessionStorage.setItem('ai_agent_last_session', id)
    try {
      const detail = await getSessionDetail(id)
      const mapped: Message[] = detail.history.map(entry => ({
        id: nextMessageId(),
        type: entry.role,
        content: entry.content,
        timestamp: '',
        sources_text: entry.sources_text,
        data: entry.data,
        chart: entry.chart,
      }))
      setMensagens(mapped)
      setExpandedCharts(new Set())
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const filteredConversas = conversasHistorico.filter(c =>
    c.titulo.toLowerCase().includes(searchHistorico.toLowerCase()),
  )

  return (
    <div
      className="fixed inset-y-0 right-0 z-10 flex flex-col"
      style={{ left: '80px', background: 'var(--chat-bg)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{
          borderBottom: '1px solid var(--chat-border)',
          background: 'var(--chat-header-bg)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-linear-to-br from-[#1E5EFF] to-[#8B5CF6] rounded-xl flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-semibold text-foreground">Agente IA</span>
        </div>

        <p className="text-xs text-muted-foreground">
          Produzido por <span className="font-semibold text-foreground">V-Commerce</span>
        </p>

        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted hover:text-foreground rounded-lg transition-colors hover:bg-(--chat-item-hover)"
          >
            <X className="w-3.5 h-3.5" />
            Fechar
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar */}
        <div
          className="w-72 flex flex-col shrink-0"
          style={{
            borderRight: '1px solid var(--chat-border)',
            background: 'var(--chat-sidebar-bg)',
          }}
        >
          <div className="p-4" style={{ borderBottom: '1px solid var(--chat-border)' }}>
            <h2 className="text-xs font-semibold mb-3 leading-snug text-muted">
              Histórico de Conversas{' '}
              <span style={{ color: 'var(--chat-accent)' }}>Agente IA</span>
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchHistorico}
                onChange={e => setSearchHistorico(e.target.value)}
                placeholder="Pesquisar..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg focus:outline-none transition-colors text-foreground placeholder:text-muted-foreground"
                style={{
                  background: 'var(--chat-input-bg)',
                  border: '1px solid var(--chat-border)',
                }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto themed-scrollbar p-2 space-y-0.5">
            {filteredConversas.map(conversa => (
              <button
                key={conversa.id}
                onClick={() => handleConversaHistorico(conversa.id)}
                className="w-full text-left p-3 rounded-xl transition-colors"
                style={{
                  background:
                    conversaAtiva === conversa.id
                      ? 'var(--chat-history-active-bg)'
                      : 'transparent',
                  border:
                    conversaAtiva === conversa.id
                      ? '1px solid var(--chat-history-active-border)'
                      : '1px solid transparent',
                }}
                onMouseEnter={e => {
                  if (conversaAtiva !== conversa.id)
                    e.currentTarget.style.background = 'var(--chat-item-hover)'
                }}
                onMouseLeave={e => {
                  if (conversaAtiva !== conversa.id)
                    e.currentTarget.style.background = 'transparent'
                }}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare
                    className="w-3.5 h-3.5 mt-0.5 shrink-0"
                    style={{
                      color:
                        conversaAtiva === conversa.id
                          ? 'var(--chat-accent)'
                          : undefined,
                    }}
                    color={
                      conversaAtiva === conversa.id
                        ? undefined
                        : 'var(--color-muted-foreground)'
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-medium leading-snug text-foreground"
                      style={{
                        color:
                          conversaAtiva === conversa.id
                            ? 'var(--chat-accent)'
                            : undefined,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {conversa.titulo}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {conversa.timestamp}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="p-3" style={{ borderTop: '1px solid var(--chat-border)' }}>
            <button
              onClick={handleNovaConversa}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1E5EFF] hover:bg-[#1E5EFF]/90 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova conversa
            </button>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {mensagens.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="w-14 h-14 bg-linear-to-br from-[#1E5EFF] to-[#8B5CF6] rounded-2xl flex items-center justify-center mb-5">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-1.5">
                Olá! Como posso te ajudar?
              </h2>
              <p className="text-sm text-muted mb-8">
                Pergunte qualquer coisa sobre seu negócio
              </p>
              <div className="grid grid-cols-2 gap-3 w-full max-w-2xl">
                {suggestions.map((texto, i) => {
                  const Icon = SUGGESTION_ICONS[i % SUGGESTION_ICONS.length]
                  return (
                    <button
                      key={i}
                      onClick={() => sendQuestion(texto)}
                      className="flex items-center gap-3 p-4 rounded-xl text-left transition-all"
                      style={{
                        background: 'var(--chat-quick-card-bg)',
                        border: '1px solid var(--chat-border)',
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
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(30,94,255,0.12)' }}
                      >
                        <Icon
                          className="w-4 h-4"
                          style={{ color: 'var(--chat-accent)' }}
                        />
                      </div>
                      <span className="text-sm font-medium leading-tight text-foreground">
                        {texto}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto themed-scrollbar p-6 space-y-5">
              {mensagens.map(msg => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background:
                        msg.type === 'user'
                          ? '#1E5EFF'
                          : 'linear-gradient(135deg, #1E5EFF, #8B5CF6)',
                    }}
                  >
                    {msg.type === 'user' ? (
                      <span className="text-white text-[10px] font-bold">EU</span>
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div
                    className={`max-w-[75%] flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className="px-4 py-3 text-sm leading-relaxed"
                      style={
                        msg.type === 'user'
                          ? {
                              background: '#1E5EFF',
                              color: 'white',
                              borderRadius: '1rem',
                              borderTopRightRadius: '4px',
                            }
                          : {
                              background: 'var(--chat-msg-ai-bg)',
                              border: '1px solid var(--chat-border)',
                              color: 'var(--color-foreground)',
                              borderRadius: '1rem',
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
                              <AgentChart chart={msg.chart} data={msg.data} />
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
                    {msg.timestamp && (
                      <span className="text-[10px] text-muted-foreground mt-1">
                        {msg.timestamp}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #1E5EFF, #8B5CF6)',
                    }}
                  >
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div
                    className="px-4 py-3"
                    style={{
                      background: 'var(--chat-msg-ai-bg)',
                      border: '1px solid var(--chat-border)',
                      borderRadius: '1rem',
                      borderTopLeftRadius: '4px',
                    }}
                  >
                    <div className="flex gap-1 items-center h-4">
                      <span
                        className="w-2 h-2 rounded-full bg-muted animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-muted animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-muted animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 shrink-0" style={{ borderTop: '1px solid var(--chat-border)' }}>
            <div className="relative max-w-full">
              {slashMenuOpen && (
                <SlashCommandMenu
                  filter={inputValue}
                  onSelect={executeSlashCommand}
                />
              )}
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all focus-within:ring-1 focus-within:ring-[#1E5EFF]/30"
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
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none agent-placeholder-fade"
                />
                <button
                  onClick={handleEnviar}
                  disabled={!inputValue.trim() || isTyping}
                  className="flex flex-col items-center gap-0.5 shrink-0 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed text-[#1E5EFF] dark:text-white"
                >
                  <Send className="w-4 h-4" />
                  <span className="text-[9px] leading-none text-muted-foreground">
                    enviar
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
