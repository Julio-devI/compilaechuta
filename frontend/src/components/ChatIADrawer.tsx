import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAiAgentChat } from '@/contexts/AiAgentChatContext'
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
  Plus,
  Search,
  MessageSquare,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import {
  askAgent,
  getSessionDetail,
  getSuggestions,
  listSessions,
  type SessionSummary,
} from '@/services/aiAgentService'
import type { AiAgentMessage } from '@/contexts/AiAgentChatContext'
import { AgentChart } from '@/components/AgentChart'
import { AgentDataTable } from '@/components/AgentDataTable'
import {
  SLASH_COMMANDS,
  SlashCommandMenu,
} from '@/components/SlashCommandMenu'
import { shouldShowAgentDataTable } from '@/lib/agentDataDisplay'

const SUGGESTIONS_REQUEST_MESSAGE =
  'Estou sem ideias do que perguntar agora. Com base no que conversamos até aqui, pode me sugerir algumas perguntas?'

const QUICK_ACTION_ICONS: LucideIcon[] = [Zap, FileText, HelpCircle, Lightbulb]

interface ConversationHistoryItem {
  id: string
  title: string
  timestamp: string
}

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

function summaryToHistoryItem(summary: SessionSummary): ConversationHistoryItem {
  return {
    id: summary.session_id,
    title: summary.title,
    timestamp: formatSessionTimestamp(summary.updated_at),
  }
}

function buildOptimisticHistoryItem(
  sessionId: string,
  question: string,
): ConversationHistoryItem {
  const title = question.length > 80 ? `${question.slice(0, 77)}...` : question
  return {
    id: sessionId,
    title,
    timestamp: nowHHmm(),
  }
}

export function ChatIADrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [quickActions, setQuickActions] = useState<string[]>([])
  const [expandedCharts, setExpandedCharts] = useState<Set<number>>(new Set())
  const [expandedTables, setExpandedTables] = useState<Set<number>>(new Set())
  const [slashMenuOpen, setSlashMenuOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historySearch, setHistorySearch] = useState('')
  const [conversationHistory, setConversationHistory] = useState<
    ConversationHistoryItem[]
  >([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const chatKey = location.pathname
  const {
    messages,
    setMessages,
    sessionId,
    setSessionId,
    activeConversation,
    setActiveConversation,
    setSelectedChatKey,
    isTyping,
    setIsTyping,
    pendingQuestions,
    setPendingQuestions,
    nextMessageId,
    resetActiveConversation,
  } = useAiAgentChat(chatKey)
  const pendingQuestionsRef = useRef<string[]>(pendingQuestions)
  const { text: placeholder, opacity: placeholderOpacity } =
    useRotatingPlaceholder(AGENT_PLACEHOLDERS_COMPACT)

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
  }, [messages, isTyping])

  useEffect(() => {
    pendingQuestionsRef.current = pendingQuestions
  }, [pendingQuestions])

  const refreshHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const sessions = await listSessions()
      setConversationHistory(sessions.map(summaryToHistoryItem))
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isOpen || !historyOpen || isTyping) return
    refreshHistory()
  }, [historyOpen, isOpen, isTyping, refreshHistory])

  const handleNewConversation = () => {
    pendingQuestionsRef.current = []
    resetActiveConversation()
    setPendingQuestions([])
    setInputValue('')
    setSlashMenuOpen(false)
    setIsTyping(false)
    setExpandedCharts(new Set())
    setExpandedTables(new Set())
    setHistoryOpen(false)
  }

  const loadConversationFromHistory = async (id: string) => {
    setInputValue('')
    setSlashMenuOpen(false)
    setIsTyping(false)
    pendingQuestionsRef.current = []
    setPendingQuestions([])

    try {
      const detail = await getSessionDetail(id)
      const mappedMessages: AiAgentMessage[] = detail.history.map(entry => ({
        id: nextMessageId(),
        type: entry.role,
        content: entry.content,
        timestamp: '',
        sources_text: entry.sources_text,
        data: entry.data,
        chart: entry.chart,
      }))

      setSessionId(id)
      setActiveConversation(id)
      setMessages(mappedMessages)
      setExpandedCharts(new Set())
      setExpandedTables(new Set())
      setHistoryOpen(false)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const processQuestion = useCallback(async (rawText: string) => {
    const text = rawText.trim()
    if (!text) return

    setActiveConversation(sessionId)
    setConversationHistory(prev => [
      buildOptimisticHistoryItem(sessionId, text),
      ...prev.filter(item => item.id !== sessionId),
    ])
    setMessages(prev => [
      ...prev,
      {
        id: nextMessageId(),
        type: 'user',
        content: text,
        timestamp: nowHHmm(),
      },
    ])
    setIsTyping(true)

    try {
      const response = await askAgent(text, sessionId)
      const assistantText =
        response.user_response.answer_text ||
        (response.status === 'out_of_scope'
          ? 'Não consegui responder a essa pergunta com os dados disponíveis.'
          : 'Ocorreu um erro ao processar a resposta.')
      setMessages(prev => [
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
        if (historyOpen) refreshHistory()
      }
    } catch (err) {
      const message = (err as Error).message
      toast.error(message)
      setMessages(prev => [
        ...prev,
        {
          id: nextMessageId(),
          type: 'assistant',
          content: `Ops, algo deu errado: ${message}`,
          timestamp: nowHHmm(),
        },
      ])
    } finally {
      const [nextQuestion, ...remainingQuestions] = pendingQuestionsRef.current
      if (nextQuestion) {
        pendingQuestionsRef.current = remainingQuestions
        setPendingQuestions(remainingQuestions)
        processQuestion(nextQuestion)
      } else {
        setIsTyping(false)
      }
    }
  }, [
    nextMessageId,
    sessionId,
    setActiveConversation,
    setIsTyping,
    setMessages,
    setPendingQuestions,
    historyOpen,
    refreshHistory,
  ])

  const sendQuestion = (rawText: string) => {
    const text = rawText.trim()
    if (!text) return

    setInputValue('')
    setSlashMenuOpen(false)

    if (isTyping) {
      const nextQuestions = [...pendingQuestionsRef.current, text]
      pendingQuestionsRef.current = nextQuestions
      setPendingQuestions(nextQuestions)
      return
    }

    processQuestion(text)
  }

  const removePendingQuestion = (indexToRemove: number) => {
    const nextQuestions = pendingQuestionsRef.current.filter(
      (_, index) => index !== indexToRemove,
    )
    pendingQuestionsRef.current = nextQuestions
    setPendingQuestions(nextQuestions)
  }

  const runSugestaoCommand = async () => {
    setMessages(prev => [
      ...prev,
      {
        id: nextMessageId(),
        type: 'user',
        content: SUGGESTIONS_REQUEST_MESSAGE,
        timestamp: nowHHmm(),
      },
    ])
    setIsTyping(true)
    try {
      const { suggestions: list } = await getSuggestions(sessionId)
      setMessages(prev => [
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

  const filteredConversationHistory = conversationHistory.filter(item =>
    item.title.toLowerCase().includes(historySearch.toLowerCase()),
  )

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
              setSelectedChatKey(chatKey)
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

        <div
          className="grid grid-cols-2 gap-2 px-4 py-3 shrink-0"
          style={{
            borderBottom: '1px solid var(--chat-border)',
            background: 'var(--chat-header-bg)',
          }}
        >
          <button
            type="button"
            onClick={handleNewConversation}
            className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:bg-(--chat-item-hover)"
            style={{ color: 'var(--chat-accent)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Nova conversa
          </button>
          <button
            type="button"
            onClick={() => setHistoryOpen(prev => !prev)}
            className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:bg-(--chat-item-hover)"
            style={{
              color: historyOpen
                ? 'var(--chat-accent)'
                : 'var(--color-muted-foreground)',
              background: historyOpen
                ? 'var(--chat-history-active-bg)'
                : 'transparent',
            }}
          >
            <History className="w-3.5 h-3.5" />
            Histórico
          </button>
        </div>

        {/* Chat content */}
        {historyOpen ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--chat-border)' }}>
              <h2 className="text-sm font-semibold text-foreground mb-3">
                Histórico de Conversas
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  placeholder="Pesquisar..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg focus:outline-none transition-colors text-foreground placeholder:text-muted-foreground"
                  style={{
                    background: 'var(--chat-input-bg)',
                    border: '1px solid var(--chat-border)',
                  }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto themed-scrollbar p-3 space-y-1">
              {historyLoading ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">
                  Carregando conversas...
                </p>
              ) : filteredConversationHistory.length > 0 ? (
                filteredConversationHistory.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => loadConversationFromHistory(item.id)}
                    className="w-full text-left p-3 rounded-xl transition-colors hover:bg-(--chat-item-hover)"
                    style={{
                      background:
                        activeConversation === item.id
                          ? 'var(--chat-history-active-bg)'
                          : 'transparent',
                      border:
                        activeConversation === item.id
                          ? '1px solid var(--chat-history-active-border)'
                          : '1px solid transparent',
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <MessageSquare
                        className="w-3.5 h-3.5 mt-0.5 shrink-0"
                        style={{
                          color:
                            activeConversation === item.id
                              ? 'var(--chat-accent)'
                              : 'var(--color-muted-foreground)',
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-xs font-medium leading-snug text-foreground"
                          style={{
                            color:
                              activeConversation === item.id
                                ? 'var(--chat-accent)'
                                : undefined,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {item.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {item.timestamp}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <p className="px-2 py-3 text-xs text-muted-foreground">
                  Nenhuma conversa encontrada.
                </p>
              )}
            </div>
          </div>
        ) : messages.length === 0 ? (
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
            {messages.map(msg => (
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

                    {msg.type === 'assistant' && shouldShowAgentDataTable(msg.chart, msg.data) && (
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
          {pendingQuestions.length > 0 && (
            <div
              className="mb-3 rounded-xl px-3 py-2"
              style={{
                background: 'var(--chat-msg-ai-bg)',
                border: '1px solid var(--chat-border)',
              }}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Na fila
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {pendingQuestions.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {pendingQuestions.map((question, index) => (
                  <div
                    key={`${question}-${index}`}
                    data-testid="queued-question"
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                    style={{ background: 'var(--chat-input-bg)' }}
                  >
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                      {question}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePendingQuestion(index)}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-muted hover:text-foreground transition-colors hover:bg-(--chat-item-hover)"
                      aria-label={`Remover pergunta da fila: ${question}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-foreground transition-colors"
                style={{ background: 'var(--chat-msg-ai-bg)' }}
              >
                <History className="w-3 h-3" />
                Histórico
              </button>
              <button
                onClick={handleEnviar}
                disabled={!inputValue.trim()}
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
